package http

import (
	"bytes"
	"mime/multipart"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimiterRejectsBurstOverLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/", NewRateLimiter(2, time.Minute).Middleware("test"), func(c *gin.Context) {
		c.Status(nethttp.StatusNoContent)
	})

	for i, expected := range []int{nethttp.StatusNoContent, nethttp.StatusNoContent, nethttp.StatusTooManyRequests} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(nethttp.MethodGet, "/", nil)
		request.RemoteAddr = "203.0.113.10:1234"
		router.ServeHTTP(recorder, request)
		if recorder.Code != expected {
			t.Fatalf("request %d: expected %d, got %d", i+1, expected, recorder.Code)
		}
	}
}

func TestRequestIDAndSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestID(), SecurityHeaders())
	router.GET("/", func(c *gin.Context) { c.Status(nethttp.StatusNoContent) })

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(nethttp.MethodGet, "/", nil)
	request.Header.Set("X-Forwarded-Proto", "https")
	router.ServeHTTP(recorder, request)

	if recorder.Header().Get(requestIDHeader) == "" {
		t.Fatal("missing request ID header")
	}
	if recorder.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("missing nosniff header")
	}
	if !strings.Contains(recorder.Header().Get("Strict-Transport-Security"), "max-age=") {
		t.Fatal("missing HSTS header for HTTPS request")
	}
}

func TestValidateAvatarUploadRejectsSpoofedExtension(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.PUT("/me", ValidateAvatarUpload(5<<20), func(c *gin.Context) {
		c.Status(nethttp.StatusNoContent)
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("avatar", "payload.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("this is not an image")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(nethttp.MethodPut, "/me", body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(recorder, request)

	if recorder.Code != nethttp.StatusUnsupportedMediaType {
		t.Fatalf("expected %d, got %d", nethttp.StatusUnsupportedMediaType, recorder.Code)
	}
}

func TestValidateAvatarUploadAcceptsPNG(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.PUT("/me", ValidateAvatarUpload(5<<20), func(c *gin.Context) {
		c.Status(nethttp.StatusNoContent)
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("avatar", "avatar.png")
	if err != nil {
		t.Fatal(err)
	}
	pngHeader := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	if _, err := part.Write(append(pngHeader, make([]byte, 600)...)); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(nethttp.MethodPut, "/me", body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(recorder, request)

	if recorder.Code != nethttp.StatusNoContent {
		t.Fatalf("expected %d, got %d: %s", nethttp.StatusNoContent, recorder.Code, recorder.Body.String())
	}
}
