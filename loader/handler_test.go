package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"mime"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// A shared, concurrency-safe fake keeps HTTP contract tests independent of MongoDB.
type memoryStore struct {
	mu      sync.Mutex
	now     time.Time
	entries map[string]document
	fail    bool
}

func (s *memoryStore) Put(_ context.Context, id string, f file) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fail {
		return false, errors.New("unavailable")
	}
	if _, exists := s.entries[id]; exists {
		return false, nil
	}
	s.entries[id] = document{ID: id, Name: f.Name, Data: f.Data, ExpiresAt: s.now.Add(time.Minute)}
	return true, nil
}
func (s *memoryStore) Get(_ context.Context, id string) (*file, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fail {
		return nil, errors.New("unavailable")
	}
	d, exists := s.entries[id]
	if !exists || !s.now.Before(d.ExpiresAt) {
		return nil, nil
	}
	return &file{Name: d.Name, Data: d.Data}, nil
}
func testStore(t *testing.T) (*memoryStore, func(time.Duration)) {
	t.Helper()
	s := &memoryStore{now: time.Now(), entries: map[string]document{}}
	return s, func(d time.Duration) { s.mu.Lock(); defer s.mu.Unlock(); s.now = s.now.Add(d) }
}

func request(h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(method, path, strings.NewReader(body)))
	return w
}

func upload(t *testing.T, h http.Handler, name string, data []byte) string {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"name": name, "binary": base64.StdEncoding.EncodeToString(data)})
	w := request(h, "POST", "/load", string(body))
	if w.Code != 200 {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	var result map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if !idPattern.MatchString(result["id"]) {
		t.Fatalf("bad ID: %v", result)
	}
	return result["id"]
}

func TestRoundTripAcrossInstancesAndExpiry(t *testing.T) {
	storage, advance := testStore(t)
	writer := handler{store: storage, newID: generateID}
	// Separate handlers sharing one storage backend.
	reader := handler{store: storage, newID: generateID}
	data := make([]byte, 100000)
	for i := range data {
		data[i] = byte(i)
	}
	id := upload(t, writer, "ИГРА.RK", data)
	for _, elapsed := range []time.Duration{0, 59 * time.Second} {
		advance(elapsed)
		w := request(reader, "GET", "/file/hint.bin?"+id, "")
		if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), data) {
			t.Fatalf("download mismatch: status %d", w.Code)
		}
		if w.Header().Get("Content-Type") != "application/octet-stream" || w.Header().Get("Content-Length") != "100000" {
			t.Fatal(w.Header())
		}
		_, params, err := mime.ParseMediaType(w.Header().Get("Content-Disposition"))
		if err != nil || params["filename"] != "ИГРА.RK" {
			t.Fatalf("filename: %v %v", params, err)
		}
		if w.Header().Get("Access-Control-Allow-Origin") != "*" || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal(w.Header())
		}
	}
	advance(time.Second)
	if w := request(reader, "GET", "/file/any?"+id, ""); w.Code != 404 {
		t.Fatalf("expired file: %d", w.Code)
	}
}

func TestValidationAndRoutes(t *testing.T) {
	storage, _ := testStore(t)
	h := handler{store: storage, newID: generateID}
	for _, tc := range []struct{ body, message string }{
		{`{`, "invalid json"}, {`{} {}`, "invalid json"},
		{`null`, "expected { binary: string, name: string }"},
		{`[]`, "expected { binary: string, name: string }"},
		{`{"Binary":"YQ==","name":"a"}`, "expected { binary: string, name: string }"},
		{`{"binary":2,"name":"a"}`, "expected { binary: string, name: string }"},
		{`{"binary":"YQ==","name":null}`, "expected { binary: string, name: string }"},
		{`{"binary":"!","name":"a"}`, "invalid base64"},
		{`{"binary":"YQ=","name":"a"}`, "invalid base64"},
		{`{"binary":"","name":"a"}`, "empty binary"},
	} {
		w := request(h, "POST", "/load", tc.body)
		var result map[string]string
		_ = json.Unmarshal(w.Body.Bytes(), &result)
		if w.Code != 400 || result["error"] != tc.message {
			t.Errorf("%s: %d %s", tc.body, w.Code, w.Body)
		}
	}
	for _, binary := range []string{"YQ", "YQ==", " Y\tQ\n==\r\f"} {
		body, _ := json.Marshal(map[string]string{"binary": binary, "name": ""})
		if w := request(h, "POST", "/load", string(body)); w.Code != 200 {
			t.Errorf("base64 %q: %s", binary, w.Body)
		}
	}
	if w := request(h, "POST", "/load", strings.Repeat("x", maxRequestBytes+1)); w.Code != 413 {
		t.Fatal(w.Code)
	}
	for _, path := range []string{"/file/a", "/file/a?id=abc123", "/file/a?ABC123", "/file/a?abc123&", "/file/a?abc123", "/missing"} {
		w := request(h, "GET", path, "")
		if w.Code != 404 || w.Body.String() != "not found" {
			t.Errorf("%s: %d %s", path, w.Code, w.Body)
		}
	}
	if w := request(h, "GET", "/", ""); w.Code != 200 || w.Body.String() != "rk86 loader" {
		t.Fatal(w)
	}
	if w := request(h, "OPTIONS", "/load", ""); w.Code != 204 || w.Body.Len() != 0 || !strings.Contains(w.Header().Get("Access-Control-Allow-Methods"), "POST") {
		t.Fatal(w)
	}
	if w := request(h, "PUT", "/load", ""); w.Code != 404 {
		t.Fatal(w.Code)
	}
}

func TestCollisionDoesNotOverwrite(t *testing.T) {
	storage, _ := testStore(t)
	ids := []string{"abc123", "abc123", "def456"}
	h := handler{store: storage, newID: func() string { id := ids[0]; ids = ids[1:]; return id }}
	first := upload(t, h, "first", []byte{1})
	second := upload(t, h, "second", []byte{2})
	for id, data := range map[string]byte{first: 1, second: 2} {
		w := request(h, "GET", "/file/a?"+id, "")
		if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), []byte{data}) {
			t.Fatal(w)
		}
	}
	h.newID = func() string { return first }
	if w := request(h, "POST", "/load", `{"binary":"YQ==","name":"a"}`); w.Code != 500 {
		t.Fatal(w.Code)
	}
}

func TestConcurrentUploads(t *testing.T) {
	storage, _ := testStore(t)
	h := handler{store: storage, newID: generateID}
	var wg sync.WaitGroup
	for range 20 {
		wg.Go(func() {
			id := upload(t, h, "a", []byte{0, 255})
			if w := request(h, "GET", "/file/a?"+id, ""); w.Code != 200 {
				t.Error(w.Code)
			}
		})
	}
	wg.Wait()
}

func TestBackendFailures(t *testing.T) {
	storage, _ := testStore(t)
	storage.fail = true
	h := handler{store: storage, newID: generateID}
	for _, w := range []*httptest.ResponseRecorder{request(h, "POST", "/load", `{"binary":"YQ==","name":"a"}`), request(h, "GET", "/file/a?abc123", "")} {
		if w.Code != 500 {
			t.Fatalf("expected backend error, got %d", w.Code)
		}
	}
}
