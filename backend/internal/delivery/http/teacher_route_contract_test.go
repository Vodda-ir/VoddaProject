package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/platform/token"
)

func TestTeacherRoutesAreRegistered(t *testing.T) {
	cfg := &config.Config{
		AppEnv:             "test",
		CORSAllowedOrigins: []string{"http://localhost"},
	}
	tm := token.NewManager("teacher-route-contract-test-secret", time.Hour)
	router := NewRouter(cfg, &Handler{}, tm, nil)

	routes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/teacher/me"},
		{http.MethodPut, "/api/v1/teacher/me"},
		{http.MethodPost, "/api/v1/teacher/services"},
		{http.MethodPut, "/api/v1/teacher/services/1"},
		{http.MethodDelete, "/api/v1/teacher/services/1"},
		{http.MethodGet, "/api/v1/teacher/work-times"},
		{http.MethodPut, "/api/v1/teacher/work-times"},
		{http.MethodPost, "/api/v1/teacher/work-times"},
		{http.MethodPut, "/api/v1/teacher/work-times/1"},
		{http.MethodDelete, "/api/v1/teacher/work-times/1"},
		{http.MethodGet, "/api/v1/teacher/sessions?when=pending"},
		{http.MethodPost, "/api/v1/teacher/sessions/1/accept"},
		{http.MethodPost, "/api/v1/teacher/sessions/1/reject"},
		{http.MethodPost, "/api/v1/teacher/sessions/1/complete"},
		{http.MethodGet, "/api/v1/teacher/reviews"},
		{http.MethodGet, "/api/v1/teacher/withdrawals"},
		{http.MethodPost, "/api/v1/teacher/withdrawals"},
	}

	for _, route := range routes {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			req := httptest.NewRequest(route.method, route.path, nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code == http.StatusNotFound {
				t.Fatalf("teacher route is not registered: %s %s", route.method, route.path)
			}
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected unauthenticated registered route to return 401, got %d for %s %s", rec.Code, route.method, route.path)
			}
		})
	}
}
