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
	teacherController := controllers.NewTeacherController(appService)
	bookingController := controllers.NewBookingController(appService)
	sessionController := controllers.NewSessionController(appService)
	walletController := controllers.NewWalletController(appService)
	ratingController := controllers.NewRatingController(appService)
	notificationController := controllers.NewNotificationController(appService)
	adminController := controllers.NewAdminController(appService)

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
	r.GET("/teachers", teacherController.ListTeachers)
	r.GET("/teachers/:id", teacherController.GetTeacher)

	authMiddleware := middleware.AuthMiddleware(cfg.JWTSecret)
	protected := r.Group("/")
	protected.Use(authMiddleware)
	{
		protected.GET("/me", authController.Me)
		protected.PATCH("/me/profile", authController.UpdateProfile)
		protected.POST("/me/active-role", authController.SetActiveRole)

		protected.POST("/teacher/profile", teacherController.UpsertTeacherProfile)
		protected.POST("/bookings", bookingController.CreateBooking)
		protected.GET("/bookings/my", bookingController.ListMyBookings)
		protected.GET("/teacher/bookings", bookingController.ListTeacherBookings)
		protected.POST("/bookings/:id/accept", bookingController.AcceptBooking)
		protected.POST("/bookings/:id/reject", bookingController.RejectBooking)

		protected.POST("/sessions/:id/token", sessionController.SessionToken)
		protected.POST("/sessions/:id/end", sessionController.EndSession)

		protected.POST("/wallet/topup/initiate", walletController.WalletTopupInitiate)
		protected.POST("/wallet/topup/verify", walletController.WalletTopupVerify)
		protected.GET("/wallet/transactions", walletController.WalletTransactions)
		protected.POST("/wallet/withdraw-requests", walletController.CreateWithdrawRequest)

		protected.POST("/ratings", ratingController.CreateRating)
		protected.GET("/notifications", notificationController.ListNotifications)
		protected.POST("/notifications/:id/read", notificationController.MarkNotificationRead)

		protected.GET("/admin/teachers/pending", adminController.ListPendingTeachers)
		protected.POST("/admin/teachers/:id/approve", adminController.ApproveTeacher)
		protected.POST("/admin/teachers/:id/reject", adminController.RejectTeacher)
		protected.GET("/admin/withdraw-requests", adminController.ListWithdrawRequests)
		protected.POST("/admin/withdraw-requests/:id/process", adminController.ProcessWithdrawRequest)
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
