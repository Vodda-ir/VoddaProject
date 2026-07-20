// Command server is the entrypoint for the Vodda backend API.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"vodda/backend/internal/config"
	delivery "vodda/backend/internal/delivery/http"
	"vodda/backend/internal/platform/database"
	"vodda/backend/internal/platform/sms"
	"vodda/backend/internal/platform/token"
	"vodda/backend/internal/repository"
	"vodda/backend/internal/seed"
	"vodda/backend/internal/usecase"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("configuration: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	if err := database.Migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if cfg.AutoSeed {
		if err := seed.Run(db); err != nil {
			log.Printf("seed: %v", err)
		}
	}

	// repositories
	userRepo := repository.NewUserRepository(db)
	teacherRepo := repository.NewTeacherRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	reviewRepo := repository.NewReviewRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	otpRepo := repository.NewOTPRepository(db)
	notifRepo := repository.NewNotificationRepository(db)

	// platform services
	tm := token.NewManager(cfg.JWTSecret, cfg.TokenExpiration)
	sender := sms.New(cfg.SMS)

	// usecases
	h := &delivery.Handler{
		Auth:    usecase.NewAuthUsecase(userRepo, otpRepo, sender, tm, cfg),
		User:    usecase.NewUserUsecase(userRepo, teacherRepo),
		Teacher: usecase.NewTeacherUsecase(teacherRepo, reviewRepo, userRepo),
		Session: usecase.NewSessionUsecase(sessionRepo, teacherRepo, userRepo, walletRepo, notifRepo, cfg),
		Wallet:  usecase.NewWalletUsecase(walletRepo, userRepo, teacherRepo, notifRepo, cfg.DevWalletChargeEnabled && !cfg.IsProduction()),
		Review:  usecase.NewReviewUsecase(reviewRepo, sessionRepo, teacherRepo),
		Admin:   usecase.NewAdminUsecase(userRepo, teacherRepo, sessionRepo, walletRepo, notifRepo),
		Notif:   notifRepo,
	}

	router := delivery.NewRouter(cfg, h, tm)

	srv := &http.Server{
		Addr:              cfg.ServerHost + ":" + cfg.ServerPort,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("🚀 vodda-backend listening on %s (env=%s)", srv.Addr, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	// graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
