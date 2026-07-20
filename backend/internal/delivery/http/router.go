package http

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
	"vodda/backend/internal/platform/token"
)

// NewRouter wires all routes onto a Gin engine.
func NewRouter(cfg *config.Config, h *Handler, tm *token.Manager, readiness func(context.Context) error) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	_ = r.SetTrustedProxies(trustedProxiesFromEnv())
	r.Use(RequestID(), SecurityHeaders(), AccessLogger(), gin.Recovery(), BodyLimit(6<<20))
	// Keep multipart uploads in memory only up to 5 MiB before Gin spills to disk.
	r.MaxMultipartMemory = 5 << 20

	corsCfg := cors.DefaultConfig()
	if cfg.IsProduction() {
		corsCfg.AllowOrigins = cfg.CORSAllowedOrigins
	} else {
		corsCfg.AllowAllOrigins = true
	}
	corsCfg.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", requestIDHeader}
	corsCfg.ExposeHeaders = []string{requestIDHeader, "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"}
	corsCfg.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsCfg.MaxAge = 12 * time.Hour
	r.Use(cors.New(corsCfg))

	live := func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "vodda-backend"})
	}
	r.GET("/health", live)
	r.GET("/live", live)
	r.GET("/ready", func(c *gin.Context) {
		if readiness == nil {
			c.JSON(http.StatusOK, gin.H{"status": "ready"})
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := readiness(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Serve only files, not directory indexes.
	r.StaticFS("/uploads", gin.Dir("./uploads", false))

	api := r.Group("/api/v1")
	publicLimiter := NewRateLimiter(120, time.Minute)
	otpRequestLimiter := NewRateLimiter(5, 10*time.Minute)
	otpVerifyLimiter := NewRateLimiter(10, 10*time.Minute)
	authedLimiter := NewRateLimiter(240, time.Minute)
	mutationLimiter := NewRateLimiter(120, time.Minute)
	financialLimiter := NewRateLimiter(30, time.Minute)
	adminLimiter := NewRateLimiter(180, time.Minute)

	// public
	auth := api.Group("/auth")
	{
		auth.POST("/request-otp", otpRequestLimiter.Middleware("otp-request"), h.RequestOTP)
		auth.POST("/verify-otp", otpVerifyLimiter.Middleware("otp-verify"), h.VerifyOTP)
	}
	api.GET("/teachers", publicLimiter.Middleware("teacher-search"), h.SearchTeachers)
	api.GET("/teachers/:id", publicLimiter.Middleware("teacher-detail"), h.GetTeacher)
	api.GET("/teachers/:id/work-times", publicLimiter.Middleware("teacher-work-times"), h.TeacherWorkTimes)

	// authenticated (any role)
	authed := api.Group("")
	authed.Use(AuthRequired(tm), authedLimiter.Middleware("authenticated"))
	{
		authed.GET("/me", h.Me)
		authed.PUT("/me", mutationLimiter.Middleware("profile-update"), ValidateAvatarUpload(5<<20), h.UpdateMe)
		authed.POST("/me/become-teacher", mutationLimiter.Middleware("become-teacher"), h.BecomeTeacher)

		authed.GET("/notifications", h.Notifications)
		authed.POST("/notifications/:id/read", mutationLimiter.Middleware("notification-read"), h.ReadNotification)

		// learner-facing sessions
		authed.POST("/sessions", financialLimiter.Middleware("financial"), h.Book)
		authed.GET("/sessions", h.MySessions)
		authed.POST("/sessions/:id/cancel", financialLimiter.Middleware("financial"), h.CancelSession)
		authed.POST("/reviews", mutationLimiter.Middleware("review"), h.Rate)

		// wallet. Direct charging is permitted only when explicitly enabled in development;
		// the usecase rejects it in production until a verified gateway callback exists.
		authed.GET("/wallet/transactions", h.Transactions)
		authed.POST("/wallet/charge", financialLimiter.Middleware("financial"), h.Charge)
	}

	// teacher-only
	teacher := api.Group("/teacher")
	teacher.Use(AuthRequired(tm), RequireRole(domain.RoleTeacher, domain.RoleAdmin), authedLimiter.Middleware("teacher"))
	{
		teacher.GET("/me", h.MyTeacher)
		teacher.PUT("/me", mutationLimiter.Middleware("teacher-profile"), h.UpdateMyTeacher)
		teacher.POST("/services", mutationLimiter.Middleware("teacher-services"), h.AddService)
		teacher.PUT("/services/:id", mutationLimiter.Middleware("teacher-services"), h.UpdateService)
		teacher.DELETE("/services/:id", mutationLimiter.Middleware("teacher-services"), h.DeleteService)
		teacher.PUT("/work-times", mutationLimiter.Middleware("teacher-work-times"), h.SetWorkTimes)
		teacher.GET("/work-times", h.MyWorkTimes)
		teacher.POST("/work-times", mutationLimiter.Middleware("teacher-work-times"), h.AddWorkTime)
		teacher.PUT("/work-times/:id", mutationLimiter.Middleware("teacher-work-times"), h.UpdateWorkTime)
		teacher.DELETE("/work-times/:id", mutationLimiter.Middleware("teacher-work-times"), h.DeleteWorkTime)

		teacher.GET("/sessions", h.TeacherSessions)
		teacher.POST("/sessions/:id/accept", mutationLimiter.Middleware("teacher-session"), h.AcceptSession)
		teacher.POST("/sessions/:id/reject", financialLimiter.Middleware("financial"), h.RejectSession)
		teacher.POST("/sessions/:id/complete", financialLimiter.Middleware("financial"), h.CompleteSession)

		teacher.POST("/withdrawals", financialLimiter.Middleware("financial"), h.RequestWithdrawal)
		teacher.GET("/withdrawals", h.MyWithdrawals)
	}

	// admin-only
	admin := api.Group("/admin")
	admin.Use(AuthRequired(tm), RequireRole(domain.RoleAdmin), adminLimiter.Middleware("admin"))
	{
		admin.GET("/dashboard", h.AdminDashboard)
		admin.GET("/users", h.AdminUsers)
		admin.PATCH("/users/:id/active", mutationLimiter.Middleware("admin-mutation"), h.AdminSetUserActive)
		admin.GET("/teachers", h.AdminTeachers)
		admin.POST("/teachers/:id/review", mutationLimiter.Middleware("admin-mutation"), h.AdminReviewTeacher)
		admin.GET("/sessions", h.AdminSessions)
		admin.GET("/withdrawals", h.AdminWithdrawals)
		admin.POST("/withdrawals/:id/process", financialLimiter.Middleware("financial"), h.AdminProcessWithdrawal)
		admin.GET("/services", h.AdminServices)
		admin.PUT("/services/:id/approve", mutationLimiter.Middleware("admin-mutation"), h.AdminApproveService)
		admin.PUT("/services/:id/reject", mutationLimiter.Middleware("admin-mutation"), h.AdminRejectService)
	}

	return r
}
