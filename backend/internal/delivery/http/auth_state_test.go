package http

import (
        "context"
        "net/http"
        "net/http/httptest"
        "testing"
        "time"

        "github.com/gin-gonic/gin"

        "vodda/backend/internal/domain"
        "vodda/backend/internal/platform/token"
)

type authStateUserRepo struct {
        user *domain.User
}

func (r *authStateUserRepo) Create(context.Context, *domain.User) error { return nil }
func (r *authStateUserRepo) Update(context.Context, *domain.User) error { return nil }
func (r *authStateUserRepo) ByID(context.Context, uint) (*domain.User, error) {
        if r.user == nil {
                return nil, domain.ErrNotFound
        }
        copy := *r.user
        return &copy, nil
}
func (r *authStateUserRepo) ByMobile(context.Context, string) (*domain.User, error) {
        return nil, domain.ErrNotFound
}
func (r *authStateUserRepo) ByGoogleID(context.Context, string) (*domain.User, error) {
        return nil, domain.ErrNotFound
}
func (r *authStateUserRepo) ByEmail(context.Context, string) (*domain.User, error) {
        return nil, domain.ErrNotFound
}
func (r *authStateUserRepo) List(context.Context, domain.UserListFilter) ([]domain.User, int64, error) {
        return nil, 0, nil
}
func (r *authStateUserRepo) AddWallet(context.Context, uint, int64) error      { return nil }
func (r *authStateUserRepo) Count(context.Context, domain.Role) (int64, error) { return 0, nil }

func TestAuthRequiredUsesCurrentDatabaseRole(t *testing.T) {
        gin.SetMode(gin.TestMode)
        manager := token.NewManager("test-secret-that-is-longer-than-thirty-two-characters", time.Hour)
        jwt, err := manager.Generate(7, domain.RoleLearner)
        if err != nil {
                t.Fatal(err)
        }
        repo := &authStateUserRepo{user: &domain.User{ID: 7, Role: domain.RoleTeacher, Active: true}}

        router := gin.New()
        router.GET("/teacher", AuthRequired(manager, repo), RequireRole(domain.RoleTeacher), func(c *gin.Context) {
                c.Status(http.StatusNoContent)
        })

        recorder := httptest.NewRecorder()
        request := httptest.NewRequest(http.MethodGet, "/teacher", nil)
        request.Header.Set("Authorization", "Bearer "+jwt)
        router.ServeHTTP(recorder, request)
        if recorder.Code != http.StatusNoContent {
                t.Fatalf("status: got %d, want 204", recorder.Code)
        }
}

func TestAuthRequiredRejectsInactiveCurrentAccount(t *testing.T) {
        gin.SetMode(gin.TestMode)
        manager := token.NewManager("test-secret-that-is-longer-than-thirty-two-characters", time.Hour)
        jwt, err := manager.Generate(7, domain.RoleTeacher)
        if err != nil {
                t.Fatal(err)
        }
        repo := &authStateUserRepo{user: &domain.User{ID: 7, Role: domain.RoleTeacher, Active: false}}

        router := gin.New()
        router.GET("/teacher", AuthRequired(manager, repo), func(c *gin.Context) {
                c.Status(http.StatusNoContent)
        })

        recorder := httptest.NewRecorder()
        request := httptest.NewRequest(http.MethodGet, "/teacher", nil)
        request.Header.Set("Authorization", "Bearer "+jwt)
        router.ServeHTTP(recorder, request)
        if recorder.Code != http.StatusUnauthorized {
                t.Fatalf("status: got %d, want 401", recorder.Code)
        }
}
