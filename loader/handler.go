package main

import (
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log"
	"mime"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

const maxRequestBytes = 4 * 1024 * 1024

var idPattern = regexp.MustCompile(`^[a-z0-9]{6}$`)

// Copied from static/favicon.ico and embedded for standalone deployment.
//
//go:embed favicon.ico
var favicon []byte

type file struct {
	Name string `json:"name"`
	Data []byte `json:"data"`
}

// Put creates an entry with a 60-second TTL, returning false on an ID collision.
// Get returns nil for missing or expired entries. Reads do not extend the TTL.
type store interface {
	Put(context.Context, string, file) (bool, error)
	Get(context.Context, string) (*file, error)
}

type handler struct {
	store store
	newID func() string
}

func generateID() string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
	var id [6]byte
	for i := range id {
		// Reject the uneven tail rather than biasing the alphabet with modulo.
		var b [1]byte
		for {
			_, _ = rand.Read(b[:])
			if b[0] < 252 {
				break
			}
		}
		id[i] = alphabet[int(b[0])%len(alphabet)]
	}
	return string(id[:])
}

func (h handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Max-Age", "86400")
	switch {
	case r.Method == http.MethodOptions:
		w.WriteHeader(http.StatusNoContent)
	case (r.Method == http.MethodGet || r.Method == http.MethodHead) && r.URL.Path == "/favicon.ico":
		w.Header().Set("Content-Type", "image/x-icon")
		w.Header().Set("Content-Length", strconv.Itoa(len(favicon)))
		w.Header().Set("Cache-Control", "public, max-age=86400")
		if r.Method == http.MethodGet {
			_, _ = w.Write(favicon)
		}
	case r.Method == http.MethodPost && r.URL.Path == "/load":
		h.load(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/file/"):
		h.download(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/":
		w.Header().Set("Content-Type", "text/plain")
		_, _ = io.WriteString(w, "rk86 loader")
	default:
		notFound(w)
	}
}

func (h handler) load(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxRequestBytes))
	if err != nil {
		var limit *http.MaxBytesError
		if errors.As(err, &limit) {
			jsonError(w, http.StatusRequestEntityTooLarge, "request too large")
		} else {
			jsonError(w, http.StatusBadRequest, "invalid json")
		}
		return
	}
	if !json.Valid(body) {
		jsonError(w, http.StatusBadRequest, "invalid json")
		return
	}
	// A map keeps property names case-sensitive, as in the original JS API.
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		jsonError(w, http.StatusBadRequest, "expected { binary: string, name: string }")
		return
	}
	binary, binaryOK := payload["binary"].(string)
	name, nameOK := payload["name"].(string)
	if !binaryOK || !nameOK {
		jsonError(w, http.StatusBadRequest, "expected { binary: string, name: string }")
		return
	}
	// Match atob: allow ASCII whitespace and omitted padding.
	binary = strings.Map(func(r rune) rune {
		if strings.ContainsRune("\t\n\f\r ", r) {
			return -1
		}
		return r
	}, binary)
	encoding := base64.StdEncoding
	if !strings.Contains(binary, "=") {
		encoding = base64.RawStdEncoding
	}
	data, err := encoding.DecodeString(binary)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "invalid base64")
		return
	}
	if len(data) == 0 {
		jsonError(w, http.StatusBadRequest, "empty binary")
		return
	}
	for range 10 {
		id := h.newID()
		created, err := h.store.Put(r.Context(), id, file{Name: name, Data: data})
		if err != nil {
			log.Printf("store upload: %v", err)
			jsonError(w, http.StatusInternalServerError, "kv write failed")
			return
		}
		if created {
			writeJSON(w, http.StatusOK, map[string]string{"id": id})
			return
		}
	}
	jsonError(w, http.StatusInternalServerError, "kv write failed")
}

func (h handler) download(w http.ResponseWriter, r *http.Request) {
	id := r.URL.RawQuery // Deliberately not a key/value query parameter.
	if !idPattern.MatchString(id) {
		notFound(w)
		return
	}
	f, err := h.store.Get(r.Context(), id)
	if err != nil {
		log.Printf("store download: %v", err)
		jsonError(w, http.StatusInternalServerError, "kv read failed")
		return
	}
	if f == nil {
		notFound(w)
		return
	}
	name := strings.Map(func(r rune) rune {
		if r < 32 || r == 127 || r == '"' {
			return -1
		}
		return r
	}, f.Name)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.Itoa(len(f.Data)))
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": name}))
	_, _ = w.Write(f.Data)
}

func notFound(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusNotFound)
	_, _ = io.WriteString(w, "not found")
}

func jsonError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
