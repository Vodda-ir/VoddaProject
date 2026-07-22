package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestValidateRouteIDRejectsMalformedAndZeroIDs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(ValidateRouteID())
	router.GET("/items/:id", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	for _, path := range []string{"/items/not-a-number", "/items/0"} {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("%s: got status %d, want 400", path, recorder.Code)
		}
	}

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/items/42", nil))
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("valid ID: got status %d, want 204", recorder.Code)
	}
}
