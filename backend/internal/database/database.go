package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/go-sql-driver/mysql"
)

func Connect(dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping mysql: %w", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	return db, nil
}

func RunMigrations(db *sql.DB, migrationsPath string) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS _migrations (
			id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	entries, err := os.ReadDir(migrationsPath)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".sql" {
			continue
		}
		path := filepath.Join(migrationsPath, e.Name())
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", path, err)
		}

		var exists bool
		err = db.QueryRow("SELECT 1 FROM _migrations WHERE name = ?", e.Name()).Scan(&exists)
		if err == nil && exists {
			continue
		}

		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("run %s: %w", e.Name(), err)
		}
		if _, err := db.Exec("INSERT INTO _migrations (name) VALUES (?)", e.Name()); err != nil {
			return fmt.Errorf("record migration %s: %w", e.Name(), err)
		}
		log.Printf("Applied migration: %s", e.Name())
	}
	return nil
}
