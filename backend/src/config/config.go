package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Env                       string
	Port                      string
	MySQLDSN                  string
	JWTSecret                 string
	JWTRefresh                string
	PlatformCommissionPercent int64
	SMS                       SMSConfig
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
		Env:                       getEnv("APP_ENV", "development"),
		Port:                      getEnv("BACKEND_PORT", "5566"),
		MySQLDSN:                  dsn,
		JWTSecret:                 getEnv("JWT_ACCESS_SECRET", "dev-secret"),
		JWTRefresh:                getEnv("JWT_REFRESH_SECRET", "dev-refresh"),
		PlatformCommissionPercent: getInt64Env("PLATFORM_COMMISSION_PERCENT", 15),
		SMS: SMSConfig{
			APIKey: getEnv("SMS_API_KEY", ""),
			BodyID: getEnv("SMS_BODY_ID", ""),
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

func getInt64Env(key string, fallback int64) int64 {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}
