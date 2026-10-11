package main

import (
	"bytes"
	"context"
	"os"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestDocumentUsesBinary(t *testing.T) {
	data := []byte{0, 1, 254, 255}
	encoded, err := bson.Marshal(document{ID: "abc123", Data: data, ExpiresAt: time.Now()})
	if err != nil {
		t.Fatal(err)
	}
	subtype, stored := bson.Raw(encoded).Lookup("data").Binary()
	if subtype != 0 || !bytes.Equal(stored, data) {
		t.Fatal("file must be stored as BSON binary")
	}
}

// Opt-in: uses loader/.env and touches only its own randomly named test document.
func TestMongoIntegration(t *testing.T) {
	if os.Getenv("LOADER_MONGO_INTEGRATION") != "1" {
		t.Skip("set LOADER_MONGO_INTEGRATION=1 to test configured MongoDB")
	}
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		t.Fatal("cannot read .env")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	s, err := newMongoStore(ctx, os.Getenv("MONGODB_URI"), os.Getenv("MONGODB_NAME"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.client.Disconnect(context.Background())
	reader, err := newMongoStore(ctx, os.Getenv("MONGODB_URI"), os.Getenv("MONGODB_NAME"))
	if err != nil {
		t.Fatal(err)
	}
	defer reader.client.Disconnect(context.Background())
	id := "test-" + generateID() + generateID()
	data := make([]byte, 100000)
	for i := range data {
		data[i] = byte(i)
	}
	created, err := s.Put(ctx, id, file{Name: "TEST.RK", Data: data})
	if err != nil || !created {
		t.Fatal("MongoDB insert failed")
	}
	defer func() {
		cleanup, done := context.WithTimeout(context.Background(), 10*time.Second)
		defer done()
		if _, err := s.collection.DeleteOne(cleanup, bson.M{"_id": id}); err != nil {
			t.Error("test document cleanup failed")
		}
	}()
	created, err = s.Put(ctx, id, file{Name: "overwrite", Data: []byte{1}})
	if err != nil || created {
		t.Fatal("collision must not overwrite")
	}
	f, err := reader.Get(ctx, id)
	if err != nil || f == nil || f.Name != "TEST.RK" || !bytes.Equal(f.Data, data) {
		t.Fatal("cross-client binary round-trip failed")
	}
	var d document
	if err := s.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&d); err != nil {
		t.Fatal("cannot read test document")
	}
	remaining := time.Until(d.ExpiresAt)
	if remaining <= 0 || remaining > time.Minute {
		t.Fatal("incorrect expiry")
	}
	// Leave an expired document present: reads must reject it before TTL cleanup.
	_, err = s.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"expiresAt": time.Now().Add(-time.Second)}})
	if err != nil {
		t.Fatal("cannot expire test document")
	}
	f, err = reader.Get(ctx, id)
	if err != nil || f != nil {
		t.Fatal("expired document was served")
	}
}
