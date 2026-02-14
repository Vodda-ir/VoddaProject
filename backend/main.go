package main

import (
	"log"

	"vodda/backend/src/config"
	"vodda/backend/src/controllers"
	"vodda/backend/src/database"
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
	authService := services.NewAuthService(authRepo, cfg.JWTSecret, cfg.JWTRefresh)
	authController := controllers.NewAuthController(authService)

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
