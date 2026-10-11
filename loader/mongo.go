package main

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type mongoStore struct {
	client     *mongo.Client
	collection *mongo.Collection
}

type document struct {
	ID        string    `bson:"_id"`
	Name      string    `bson:"name"`
	Data      []byte    `bson:"data"`
	ExpiresAt time.Time `bson:"expiresAt"`
}

func newMongoStore(ctx context.Context, uri, database string) (*mongoStore, error) {
	if uri == "" || database == "" {
		return nil, errors.New("set MONGODB_URI and MONGODB_NAME")
	}
	client, err := mongo.Connect(options.Client().ApplyURI(uri).SetTimeout(10 * time.Second).SetMaxPoolSize(10))
	if err != nil {
		return nil, errors.New("invalid MongoDB configuration")
	}
	collection := client.Database(database).Collection("loader")
	_, err = collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "expiresAt", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0).SetName("loader_expiry"),
	})
	if err != nil {
		_ = client.Disconnect(context.Background())
		return nil, errors.New("cannot initialize MongoDB loader TTL index; check connectivity and database permissions")
	}
	return &mongoStore{client: client, collection: collection}, nil
}

func (s *mongoStore) Put(ctx context.Context, id string, f file) (bool, error) {
	_, err := s.collection.InsertOne(ctx, document{
		ID: id, Name: f.Name, Data: f.Data, ExpiresAt: time.Now().Add(time.Minute),
	})
	if mongo.IsDuplicateKeyError(err) {
		return false, nil
	}
	return err == nil, err
}

func (s *mongoStore) Get(ctx context.Context, id string) (*file, error) {
	var d document
	// TTL cleanup is asynchronous, so enforce the deadline on every read too.
	err := s.collection.FindOne(ctx, bson.M{
		"_id": id, "expiresAt": bson.M{"$gt": time.Now()},
	}).Decode(&d)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !time.Now().Before(d.ExpiresAt) {
		return nil, nil
	}
	return &file{Name: d.Name, Data: d.Data}, nil
}
