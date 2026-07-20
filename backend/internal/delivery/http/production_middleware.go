package http

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	nethttp "net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const requestIDHeader = "X-Request-ID"

// RequestID assigns a non-secret correlation ID to every request and response.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := newRequestID()
		c.Set("request_id", id)
		c.Header(requestIDHeader, id)
		c.Next()
	}
}

func newRequestID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err == nil {
		return hex.EncodeToString(buf)
	}
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

// AccessLogger emits one compact JSON record per request. It deliberately avoids
// request bodies, authorization headers and query values so secrets are not logged.
func AccessLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		started := time.Now()
		c.Next()

		entry := map[string]any{
			"type":        "http_access",
			"request_id": c.GetString("request_id"),
			"method":      c.Request.Method,
			"path":        c.FullPath(),
			"status":      c.Writer.Status(),
			"latency_ms":  time.Since(started).Milliseconds(),
			"client_ip":   c.ClientIP(),
			"bytes":       c.Writer.Size(),
		}
		if entry["path"] == "" {
			entry["path"] = c.Request.URL.Path
		}
		if len(c.Errors) > 0 {
			entry["errors"] = c.Errors.String()
		}
		payload, err := json.Marshal(entry)
		if err != nil {
			log.Printf("request_id=%s method=%s path=%s status=%d latency=%s", c.GetString("request_id"), c.Request.Method, c.Request.URL.Path, c.Writer.Status(), time.Since(started))
			return
		}
		log.Print(string(payload))
	}
}

// SecurityHeaders applies conservative browser-facing response headers.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), geolocation=(), microphone=()")
		c.Header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
		if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

// BodyLimit rejects oversized request bodies before handlers allocate or persist them.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = nethttp.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

type rateWindow struct {
	started time.Time
	count   int
}

// RateLimiter is a bounded, in-process fixed-window limiter. It protects a single
// API instance immediately; production deployments with multiple replicas should
// additionally enforce a shared limiter at the reverse proxy or Redis layer.
type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]rateWindow
	limit   int
	window  time.Duration
	lastGC  time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		clients: make(map[string]rateWindow),
		limit:   limit,
		window:  window,
		lastGC:  time.Now(),
	}
}

func (l *RateLimiter) Middleware(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		now := time.Now()
		key := scope + ":" + c.ClientIP()

		l.mu.Lock()
		if now.Sub(l.lastGC) >= l.window {
			for k, item := range l.clients {
				if now.Sub(item.started) >= l.window {
					delete(l.clients, k)
				}
			}
			l.lastGC = now
		}

		item, exists := l.clients[key]
		if !exists || now.Sub(item.started) >= l.window {
			item = rateWindow{started: now, count: 1}
			l.clients[key] = item
			l.mu.Unlock()
			c.Header("X-RateLimit-Limit", strconv.Itoa(l.limit))
			c.Header("X-RateLimit-Remaining", strconv.Itoa(l.limit-1))
			c.Next()
			return
		}

		if item.count >= l.limit {
			retry := int(time.Until(item.started.Add(l.window)).Seconds())
			if retry < 1 {
				retry = 1
			}
			l.mu.Unlock()
			c.Header("Retry-After", strconv.Itoa(retry))
			c.Header("X-RateLimit-Limit", strconv.Itoa(l.limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.AbortWithStatusJSON(nethttp.StatusTooManyRequests, gin.H{"error": "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید"})
			return
		}

		item.count++
		l.clients[key] = item
		remaining := l.limit - item.count
		l.mu.Unlock()
		c.Header("X-RateLimit-Limit", strconv.Itoa(l.limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Next()
	}
}

// ValidateAvatarUpload validates the actual bytes of an optional avatar before
// the existing profile handler saves it. Filename extensions alone are not trusted.
func ValidateAvatarUpload(maxBytes int64) gin.HandlerFunc {
	allowed := map[string]map[string]bool{
		"image/jpeg": {".jpg": true, ".jpeg": true},
		"image/png":  {".png": true},
		"image/webp": {".webp": true},
	}

	return func(c *gin.Context) {
		if !strings.HasPrefix(strings.ToLower(c.ContentType()), "multipart/") {
			c.Next()
			return
		}

		c.Request.Body = nethttp.MaxBytesReader(c.Writer, c.Request.Body, maxBytes+(1<<20))
		if err := c.Request.ParseMultipartForm(maxBytes); err != nil {
			c.AbortWithStatusJSON(nethttp.StatusRequestEntityTooLarge, gin.H{"error": "حجم فایل بیش از حد مجاز است"})
			return
		}
		header, err := c.FormFile("avatar")
		if err != nil {
			if err == nethttp.ErrMissingFile {
				c.Next()
				return
			}
			c.AbortWithStatusJSON(nethttp.StatusBadRequest, gin.H{"error": "فایل آواتار معتبر نیست"})
			return
		}
		if header.Size <= 0 || header.Size > maxBytes {
			c.AbortWithStatusJSON(nethttp.StatusRequestEntityTooLarge, gin.H{"error": "حجم آواتار باید حداکثر ۵ مگابایت باشد"})
			return
		}

		file, err := header.Open()
		if err != nil {
			c.AbortWithStatusJSON(nethttp.StatusBadRequest, gin.H{"error": "خواندن فایل آواتار ممکن نیست"})
			return
		}
		buf := make([]byte, 512)
		n, readErr := io.ReadFull(file, buf)
		_ = file.Close()
		if readErr != nil && readErr != io.ErrUnexpectedEOF {
			c.AbortWithStatusJSON(nethttp.StatusBadRequest, gin.H{"error": "فایل آواتار ناقص است"})
			return
		}
		mimeType := nethttp.DetectContentType(buf[:n])
		ext := strings.ToLower(filepath.Ext(header.Filename))
		validExtensions, ok := allowed[mimeType]
		if !ok || !validExtensions[ext] {
			c.AbortWithStatusJSON(nethttp.StatusUnsupportedMediaType, gin.H{"error": "فرمت آواتار باید JPG، PNG یا WebP باشد"})
			return
		}

		c.Next()
	}
}

func trustedProxiesFromEnv() []string {
	raw := strings.TrimSpace(os.Getenv("TRUSTED_PROXIES"))
	if raw == "" {
		return []string{"127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			out = append(out, value)
		}
	}
	if len(out) == 0 {
		log.Print(fmt.Sprintf("TRUSTED_PROXIES=%q produced no valid entries; proxy headers will not be trusted", raw))
	}
	return out
}
