package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatal("cannot read .env")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	storage, err := newMongoStore(ctx, os.Getenv("MONGODB_URI"), os.Getenv("MONGODB_NAME"))
	cancel()
	if err != nil {
		log.Fatal(err)
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler{store: storage, newID: generateID},
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("rk86 loader listening on :%s", port)
	log.Fatal(server.ListenAndServe())
}
