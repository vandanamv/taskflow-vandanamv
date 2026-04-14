package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	loadEnv()
	requireEnv("JWT_SECRET")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "postgres"),
		getEnv("DB_NAME", "taskflow"),
	)

	var err error
	DB, err = connectWithRetry(connStr, 15, 2*time.Second)
	if err != nil {
		log.Fatal(err)
	}

	if err := RunMigrations(DB); err != nil {
		log.Fatal(err)
	}

	if err := ensureSeedUser(); err != nil {
		log.Fatal(err)
	}

	log.Println("Connected to DB")
}

func connectWithRetry(connStr string, attempts int, delay time.Duration) (*sql.DB, error) {
	var lastErr error

	for attempt := 1; attempt <= attempts; attempt++ {
		db, err := sql.Open("postgres", connStr)
		if err != nil {
			lastErr = err
		} else if err := db.Ping(); err != nil {
			lastErr = err
			_ = db.Close()
		} else {
			return db, nil
		}

		log.Printf("database connection attempt %d/%d failed: %v", attempt, attempts, lastErr)
		time.Sleep(delay)
	}

	return nil, fmt.Errorf("connect to database after %d attempts: %w", attempts, lastErr)
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}

func requireEnv(key string) {
	if os.Getenv(key) == "" {
		log.Fatalf("%s must be set", key)
	}
}
