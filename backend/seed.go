package main

import (
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const (
	seedUserName     = "Test User"
	seedUserEmail    = "test@example.com"
	seedUserPassword = "password123"
)

func ensureSeedUser() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(seedUserPassword), 12)
	if err != nil {
		return fmt.Errorf("hash seed user password: %w", err)
	}

	_, err = DB.Exec(
		`INSERT INTO users (id, name, email, password)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (email) DO UPDATE
		SET name = EXCLUDED.name,
			password = EXCLUDED.password`,
		uuid.New().String(),
		seedUserName,
		seedUserEmail,
		string(hashedPassword),
	)
	if err != nil {
		return fmt.Errorf("upsert seed user: %w", err)
	}

	return nil
}
