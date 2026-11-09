// Package config loads runtime configuration from environment variables.
package config

import (
        "errors"
        "fmt"
        "net/url"
        "os"
        "strconv"
        "strings"
        "time"
        _ "time/tzdata"
)

// Config holds all runtime configuration for the Vodda backend.
type Config struct {
        AppEnv      string
        AppTimezone string

        ServerHost string
        ServerPort string

        FrontendBaseURL    string
        CORSAllowedOrigins []string

        DB DBConfig

        JWTSecret       string
        TokenExpiration time.Duration

        OTPExpiration     time.Duration
        OTPResendCooldown time.Duration

        SMS SMSConfig

        OTPTestBypassEnabled bool
        OTPTestCode          string
        OTPTestMobile        string

        AutoSeed               bool
        DevWalletChargeEnabled bool

        Zarinpal ZarinpalConfig

        Saman SamanConfig

        PlatformCommissionPercent int
}

// DBConfig holds the database connection settings. Driver is "mysql"
// (default) or "sqlite" for local development; with sqlite, Name is the file
// path of the database.
type DBConfig struct {
        Driver   string
        Host     string
        Port     string
        User     string
        Password string
        Name     string
}

// SMSConfig holds the SMS gateway settings for sms.ir and Faraz SMS.
type SMSConfig struct {
        Provider       string
        APIURL         string
        APIKey         string
        BodyID         int
        FarazAPIURL    string
        FarazUsername  string
        FarazPassword  string
        FarazFrom      string
        FarazPatternID string
        RequestTimeout time.Duration
}

// ZarinpalConfig holds payment gateway settings.
type ZarinpalConfig struct {
        MerchantID string
        Sandbox    bool
}

// SamanConfig holds Saman Sep (سامان‌سپ) gateway settings. Username/Password
// are the Sep panel credentials used for the verify call; when empty the
// gateway still works but settlement relies on strict callback validation.
type SamanConfig struct {
        TerminalID string
        MerchantID string
        Username   string
        Password   string
        BaseURL    string
}

// Load reads configuration from the environment, applying development-safe defaults.
// Potentially dangerous development features are disabled unless explicitly enabled.
func Load() *Config {
        // FRONTEND_BASE_URL is canonical; SITE_URL is accepted as an alias so the
        // deployment env can use either name interchangeably.
        frontendBaseURL := getEnv("FRONTEND_BASE_URL", getEnv("SITE_URL", "http://localhost:3421"))
        smsProvider := getOptionalEnv("SMS_PROVIDER")
        if smsProvider == "" {
                // Keep existing deployments on sms.ir until they opt into Faraz explicitly.
                smsProvider = "sms.ir"
        }

        return &Config{
                AppEnv:             getEnv("APP_ENV", "development"),
                AppTimezone:        getEnv("APP_TIMEZONE", "Asia/Tehran"),
                ServerHost:         getEnv("SERVER_HOST", "0.0.0.0"),
                ServerPort:         getEnv("SERVER_PORT", getEnv("BACKEND_INTERNAL_PORT", "3420")),
                FrontendBaseURL:    frontendBaseURL,
                CORSAllowedOrigins: getCSV("CORS_ALLOWED_ORIGINS", frontendBaseURL),
                DB: DBConfig{
                        Driver:   getOptionalEnv("DB_DRIVER"),
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
                        Provider:       smsProvider,
                        APIURL:         getEnv("SMS_API_URL", "https://api.sms.ir/v1/send/verify"),
                        APIKey:         getEnv("SMS_API_KEY", ""),
                        BodyID:         getInt("SMS_BODY_ID", 0),
                        FarazAPIURL:    getEnv("SMS_FARAZ_API_URL", "https://ippanel.com/patterns/pattern"),
                        FarazUsername:  getEnv("SMS_FARAZ_USERNAME", ""),
                        FarazPassword:  getEnv("SMS_FARAZ_PASSWORD", ""),
                        FarazFrom:      getEnv("SMS_FARAZ_FROM", "3000505"),
                        FarazPatternID: getEnv("SMS_FARAZ_PATTERN_CODE", "j4skcu7fjd1jjjz"),
                        RequestTimeout: getDuration("SMS_REQUEST_TIMEOUT", 20*time.Second),
                },
                OTPTestBypassEnabled: getBool("OTP_TEST_BYPASS_ENABLED", false),
                OTPTestCode:          getEnv("OTP_TEST_CODE", "33365"),
                // Empty means every mobile may use the fixed development code.
                OTPTestMobile:          getOptionalEnv("OTP_TEST_MOBILE"),
                AutoSeed:               getBool("AUTO_SEED", false),
                DevWalletChargeEnabled: getBool("DEV_WALLET_CHARGE_ENABLED", false),
                Zarinpal: ZarinpalConfig{
                        MerchantID: getEnv("ZARINPAL_MERCHANT_ID", ""),
                        Sandbox:    getBool("ZARINPAL_SANDBOX", true),
                },
                Saman: SamanConfig{
                        TerminalID: getEnv("SAMAN_TERMINAL_ID", ""),
                        MerchantID: getEnv("SAMAN_MERCHANT_ID", ""),
                        Username:   getEnv("SAMAN_USERNAME", ""),
                        Password:   getEnv("SAMAN_PASSWORD", ""),
                        BaseURL:    getEnv("SAMAN_BASE_URL", "https://sep.shaparak.ir"),
                },
                PlatformCommissionPercent: getInt("PLATFORM_COMMISSION_PERCENT", 15),
        }
}

// Validate rejects unsafe or malformed runtime configuration before the server starts.
func (c *Config) Validate() error {
        var errs []error

        if _, err := time.LoadLocation(c.AppTimezone); err != nil {
                errs = append(errs, fmt.Errorf("invalid APP_TIMEZONE %q: %w", c.AppTimezone, err))
        }
        if c.TokenExpiration <= 0 {
                errs = append(errs, errors.New("TOKEN_EXPIRATION must be positive"))
        }
        if c.OTPExpiration <= 0 {
                errs = append(errs, errors.New("OTP_EXPIRATION must be positive"))
        }
        if c.OTPResendCooldown < 0 {
                errs = append(errs, errors.New("OTP_RESEND_COOLDOWN cannot be negative"))
        }
        if c.PlatformCommissionPercent < 0 || c.PlatformCommissionPercent > 100 {
                errs = append(errs, errors.New("PLATFORM_COMMISSION_PERCENT must be between 0 and 100"))
        }
        if len(c.CORSAllowedOrigins) == 0 {
                errs = append(errs, errors.New("at least one CORS origin is required"))
        }
        for _, origin := range c.CORSAllowedOrigins {
                u, err := url.Parse(origin)
                isNativeCapacitorOrigin := err == nil && u.Scheme == "capacitor" && u.Host == "localhost" && u.Path == ""
                if err != nil || ((u.Scheme != "http" && u.Scheme != "https") && !isNativeCapacitorOrigin) || u.Host == "" {
                        errs = append(errs, fmt.Errorf("invalid CORS origin %q", origin))
                }
        }

        if c.IsProduction() {
                if len(strings.TrimSpace(c.JWTSecret)) < 32 || c.JWTSecret == "dev-insecure-secret-change-me" {
                        errs = append(errs, errors.New("JWT_SECRET must be a unique secret of at least 32 characters in production"))
                }
                if c.OTPTestBypassEnabled {
                        errs = append(errs, errors.New("OTP_TEST_BYPASS_ENABLED must be false in production"))
                }
                if c.AutoSeed {
                        errs = append(errs, errors.New("AUTO_SEED must be false in production"))
                }
                if c.DevWalletChargeEnabled {
                        errs = append(errs, errors.New("DEV_WALLET_CHARGE_ENABLED must be false in production"))
                }
                switch strings.ToLower(strings.TrimSpace(c.SMS.Provider)) {
                case "sms.ir", "smsir":
                        if strings.TrimSpace(c.SMS.APIKey) == "" || c.SMS.BodyID <= 0 {
                                errs = append(errs, errors.New("SMS_API_KEY and a positive SMS_BODY_ID are required for sms.ir in production"))
                        }
                case "faraz", "ippanel":
                        if strings.TrimSpace(c.SMS.FarazUsername) == "" || strings.TrimSpace(c.SMS.FarazPassword) == "" {
                                errs = append(errs, errors.New("SMS_FARAZ_USERNAME and SMS_FARAZ_PASSWORD are required for Faraz SMS in production"))
                        }
                        if strings.TrimSpace(c.SMS.FarazFrom) == "" || strings.TrimSpace(c.SMS.FarazPatternID) == "" {
                                errs = append(errs, errors.New("SMS_FARAZ_FROM and SMS_FARAZ_PATTERN_CODE are required for Faraz SMS in production"))
                        }
                        u, err := url.Parse(c.SMS.FarazAPIURL)
                        if err != nil || u.Scheme != "https" || u.Host == "" {
                                errs = append(errs, errors.New("SMS_FARAZ_API_URL must be an absolute HTTPS URL in production"))
                        }
                default:
                        errs = append(errs, errors.New("SMS_PROVIDER must be faraz or sms.ir in production"))
                }
        }

        return errors.Join(errs...)
}

// IsProduction reports whether the app runs in production mode.
func (c *Config) IsProduction() bool { return strings.EqualFold(c.AppEnv, "production") }

func getEnv(key, fallback string) string {
        if v, ok := os.LookupEnv(key); ok && v != "" {
                return v
        }
        return fallback
}

func getOptionalEnv(key string) string {
        return strings.TrimSpace(os.Getenv(key))
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

func getCSV(key, fallback string) []string {
        raw := getEnv(key, fallback)
        parts := strings.Split(raw, ",")
        out := make([]string, 0, len(parts))
        for _, part := range parts {
                part = strings.TrimSpace(part)
                if part != "" {
                        out = append(out, strings.TrimRight(part, "/"))
                }
        }
        return out
}
