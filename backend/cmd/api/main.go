package main

import (
	"log"
	"path/filepath"

	"vodda/backend/internal/auth"
	"vodda/backend/internal/config"
	"vodda/backend/internal/database"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := database.Connect(cfg.MySQLDSN)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	migrationsPath := filepath.Join("db", "migrations")
	if err := database.RunMigrations(db, migrationsPath); err != nil {
		log.Fatal(err)
	}

	authRepo := auth.NewRepository(db)
	authUC := auth.NewUsecase(authRepo, cfg.JWTSecret, cfg.JWTRefresh)
	authHandler := auth.NewHandler(authUC)

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/request-otp", authHandler.RequestOTP)
		authGroup.POST("/verify-otp", authHandler.VerifyOTP)
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
