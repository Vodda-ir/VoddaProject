package main

import (
	"log"

	"vodda/backend/src/config"
	"vodda/backend/src/controllers"
	"vodda/backend/src/database"
	"vodda/backend/src/middleware"
	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	gormDB, err := database.Connect(cfg.MySQLDSN)
	if err != nil {
		log.Fatal(err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	if err := database.Migrate(gormDB); err != nil {
		log.Fatal(err)
	}

	authRepo := services.NewAuthRepository(sqlDB)
	authService := services.NewAuthService(authRepo, cfg.JWTSecret, cfg.JWTRefresh, cfg.SMS)
	authController := controllers.NewAuthController(authService)
	appService := services.NewAppService(sqlDB, cfg.PlatformCommissionPercent)
	appController := controllers.NewAppController(appService)

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/request-otp", authController.RequestOTP)
		authGroup.POST("/verify-otp", authController.VerifyOTP)
	}

	// Public teacher discovery endpoints
	r.GET("/teachers", appController.ListTeachers)
	r.GET("/teachers/:id", appController.GetTeacher)

	authMiddleware := middleware.AuthMiddleware(cfg.JWTSecret)
	protected := r.Group("/")
	protected.Use(authMiddleware)
	{
		protected.GET("/me", authController.Me)
		protected.PATCH("/me/profile", authController.UpdateProfile)
		protected.POST("/me/active-role", authController.SetActiveRole)

		protected.POST("/teacher/profile", appController.UpsertTeacherProfile)
		protected.POST("/bookings", appController.CreateBooking)
		protected.GET("/bookings/my", appController.ListMyBookings)
		protected.GET("/teacher/bookings", appController.ListTeacherBookings)
		protected.POST("/bookings/:id/accept", appController.AcceptBooking)
		protected.POST("/bookings/:id/reject", appController.RejectBooking)

		protected.POST("/sessions/:id/token", appController.SessionToken)
		protected.POST("/sessions/:id/end", appController.EndSession)

		protected.POST("/wallet/topup/initiate", appController.WalletTopupInitiate)
		protected.POST("/wallet/topup/verify", appController.WalletTopupVerify)
		protected.GET("/wallet/transactions", appController.WalletTransactions)
		protected.POST("/wallet/withdraw-requests", appController.CreateWithdrawRequest)

		protected.POST("/ratings", appController.CreateRating)
		protected.GET("/notifications", appController.ListNotifications)
		protected.POST("/notifications/:id/read", appController.MarkNotificationRead)

		protected.GET("/admin/teachers/pending", appController.ListPendingTeachers)
		protected.POST("/admin/teachers/:id/approve", appController.ApproveTeacher)
		protected.POST("/admin/teachers/:id/reject", appController.RejectTeacher)
		protected.GET("/admin/withdraw-requests", appController.ListWithdrawRequests)
		protected.POST("/admin/withdraw-requests/:id/process", appController.ProcessWithdrawRequest)
	}

	port := ":" + cfg.Port
	log.Printf("Server starting on %s", port)
	log.Fatal(r.Run(port))
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
