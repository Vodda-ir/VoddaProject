package http

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
	"vodda/backend/internal/platform/token"
)

// NewRouter wires all routes onto a Gin engine.
func NewRouter(cfg *config.Config, h *Handler, tm *token.Manager) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	// Keep multipart uploads in memory only up to 5 MiB before Gin spills to disk.
	r.MaxMultipartMemory = 5 << 20

	corsCfg := cors.DefaultConfig()
	if cfg.IsProduction() {
		corsCfg.AllowOrigins = cfg.CORSAllowedOrigins
	} else {
		corsCfg.AllowAllOrigins = true
	}
	corsCfg.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	corsCfg.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsCfg.MaxAge = 12 * time.Hour
	r.Use(cors.New(corsCfg))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "vodda-backend"})
	})

	// Serve uploaded files (avatars, etc.)
	r.Static("/uploads", "./uploads")

	api := r.Group("/api/v1")

	// public
	auth := api.Group("/auth")
	{
		auth.POST("/request-otp", h.RequestOTP)
		auth.POST("/verify-otp", h.VerifyOTP)
	}
	api.GET("/teachers", h.SearchTeachers)
	api.GET("/teachers/:id", h.GetTeacher)
	api.GET("/teachers/:id/work-times", h.TeacherWorkTimes)

	// authenticated (any role)
	authed := api.Group("")
	authed.Use(AuthRequired(tm))
	{
		authed.GET("/me", h.Me)
		authed.PUT("/me", h.UpdateMe)
		authed.POST("/me/become-teacher", h.BecomeTeacher)

		authed.GET("/notifications", h.Notifications)
		authed.POST("/notifications/:id/read", h.ReadNotification)

		// learner-facing sessions
		authed.POST("/sessions", h.Book)
		authed.GET("/sessions", h.MySessions)
		authed.POST("/sessions/:id/cancel", h.CancelSession)
		authed.POST("/reviews", h.Rate)

		// wallet. Direct charging is permitted only when explicitly enabled in development;
		// the usecase rejects it in production until a verified gateway callback exists.
		authed.GET("/wallet/transactions", h.Transactions)
		authed.POST("/wallet/charge", h.Charge)
	}

	// teacher-only
	teacher := api.Group("/teacher")
	teacher.Use(AuthRequired(tm), RequireRole(domain.RoleTeacher, domain.RoleAdmin))
	{
		teacher.GET("/me", h.MyTeacher)
		teacher.PUT("/me", h.UpdateMyTeacher)
		teacher.POST("/services", h.AddService)
		teacher.PUT("/services/:id", h.UpdateService)
		teacher.DELETE("/services/:id", h.DeleteService)
		teacher.PUT("/work-times", h.SetWorkTimes)
		teacher.GET("/work-times", h.MyWorkTimes)
		teacher.POST("/work-times", h.AddWorkTime)
		teacher.PUT("/work-times/:id", h.UpdateWorkTime)
		teacher.DELETE("/work-times/:id", h.DeleteWorkTime)

		teacher.GET("/sessions", h.TeacherSessions)
		teacher.POST("/sessions/:id/accept", h.AcceptSession)
		teacher.POST("/sessions/:id/reject", h.RejectSession)
		teacher.POST("/sessions/:id/complete", h.CompleteSession)

		teacher.POST("/withdrawals", h.RequestWithdrawal)
		teacher.GET("/withdrawals", h.MyWithdrawals)
	}

	// admin-only
	admin := api.Group("/admin")
	admin.Use(AuthRequired(tm), RequireRole(domain.RoleAdmin))
	{
		admin.GET("/dashboard", h.AdminDashboard)
		admin.GET("/users", h.AdminUsers)
		admin.PATCH("/users/:id/active", h.AdminSetUserActive)
		admin.GET("/teachers", h.AdminTeachers)
		admin.POST("/teachers/:id/review", h.AdminReviewTeacher)
		admin.GET("/sessions", h.AdminSessions)
		admin.GET("/withdrawals", h.AdminWithdrawals)
		admin.POST("/withdrawals/:id/process", h.AdminProcessWithdrawal)
		admin.GET("/services", h.AdminServices)
		admin.PUT("/services/:id/approve", h.AdminApproveService)
		admin.PUT("/services/:id/reject", h.AdminRejectService)
	}

	return r
}
