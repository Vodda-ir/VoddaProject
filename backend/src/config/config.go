package config

import (
	"fmt"
	"os"
)

type Config struct {
	Env        string
	Port       string
	MySQLDSN   string
	JWTSecret  string
	JWTRefresh string
	SMS        SMSConfig
}

type SMSConfig struct {
	APIKey string
	BodyID string
	Sender string
}

func Load() (*Config, error) {
	host := getEnv("MYSQL_HOST", "localhost")
	port := getEnv("MYSQL_PORT", "3306")
	user := getEnv("MYSQL_USER", "vodda")
	pass := getEnv("MYSQL_PASSWORD", "vodda")
	db := getEnv("MYSQL_DATABASE", "vodda")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4",
		user, pass, host, port, db)

	return &Config{
		Env:        getEnv("APP_ENV", "development"),
		Port:       getEnv("BACKEND_PORT", "5566"),
		MySQLDSN:   dsn,
		JWTSecret:  getEnv("JWT_ACCESS_SECRET", "dev-secret"),
		JWTRefresh: getEnv("JWT_REFRESH_SECRET", "dev-refresh"),
		SMS: SMSConfig{
			APIKey: getEnv("SMS_API_KEY", "d73eef48d3654155b9215a4315d7e34f"),
			BodyID: getEnv("SMS_BODY_ID", "345715"),
			Sender: getEnv("SMS_SENDER", "Vodda"),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
