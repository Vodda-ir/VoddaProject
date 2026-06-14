// Package config loads runtime configuration from environment variables.
package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all runtime configuration for the Vodda backend.
type Config struct {
	AppEnv string

	ServerHost string
	ServerPort string

	FrontendBaseURL string

	DB DBConfig

	JWTSecret       string
	TokenExpiration time.Duration

	OTPExpiration     time.Duration
	OTPResendCooldown time.Duration

	SMS SMSConfig

	OTPTestBypassEnabled bool
	OTPTestCode          string
	OTPTestMobile        string

	AutoSeed bool

	Zarinpal ZarinpalConfig

	PlatformCommissionPercent int
}

// DBConfig holds MySQL connection settings.
type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

// SMSConfig holds the SMS gateway (sms.ir) settings.
type SMSConfig struct {
	APIURL         string
	APIKey         string
	BodyID         int
	RequestTimeout time.Duration
}

// ZarinpalConfig holds payment gateway settings.
type ZarinpalConfig struct {
	MerchantID string
	Sandbox    bool
}

// Load reads configuration from the environment, applying sane defaults.
func Load() *Config {
	return &Config{
		AppEnv:          getEnv("APP_ENV", "development"),
		ServerHost:      getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort:      getEnv("SERVER_PORT", getEnv("BACKEND_INTERNAL_PORT", "3420")),
		FrontendBaseURL: getEnv("FRONTEND_BASE_URL", "http://localhost:3421"),
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "127.0.0.1"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", "vodda_secret"),
			Name:     getEnv("DB_NAME", "vodda"),
		},
		JWTSecret:         getEnv("JWT_SECRET", "dev-insecure-secret-change-me"),
		TokenExpiration:   getDuration("TOKEN_EXPIRATION", 720*time.Hour),
		OTPExpiration:     getDuration("OTP_EXPIRATION", 2*time.Minute),
		OTPResendCooldown: getDuration("OTP_RESEND_COOLDOWN", 2*time.Minute),
		SMS: SMSConfig{
			APIURL:         getEnv("SMS_API_URL", "https://api.sms.ir/v1/send/verify"),
			APIKey:         getEnv("SMS_API_KEY", ""),
			BodyID:         getInt("SMS_BODY_ID", 0),
			RequestTimeout: getDuration("SMS_REQUEST_TIMEOUT", 20*time.Second),
		},
		OTPTestBypassEnabled: getBool("OTP_TEST_BYPASS_ENABLED", true),
		OTPTestCode:          getEnv("OTP_TEST_CODE", "33365"),
		OTPTestMobile:        getEnv("OTP_TEST_MOBILE", ""),
		AutoSeed:             getBool("AUTO_SEED", true),
		Zarinpal: ZarinpalConfig{
			MerchantID: getEnv("ZARINPAL_MERCHANT_ID", ""),
			Sandbox:    getBool("ZARINPAL_SANDBOX", true),
		},
		PlatformCommissionPercent: getInt("PLATFORM_COMMISSION_PERCENT", 15),
	}
}

// IsProduction reports whether the app runs in production mode.
func (c *Config) IsProduction() bool { return c.AppEnv == "production" }

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getBool(key string, fallback bool) bool {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
