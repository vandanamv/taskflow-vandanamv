package main

import (
	"log"

	"github.com/joho/godotenv"
)

func loadEnv() {
	if err := godotenv.Load(".env", "../.env"); err != nil {
		log.Printf("no local .env file loaded: %v", err)
	}
}
