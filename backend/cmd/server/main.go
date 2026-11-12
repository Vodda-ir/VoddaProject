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
        "vodda/backend/internal/platform/payment"
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
        sqlDB, err := db.DB()
        if err != nil {
                log.Fatalf("database handle: %v", err)
        }
        defer func() {
                if err := sqlDB.Close(); err != nil {
                        log.Printf("database close: %v", err)
                }
        }()

        if err := database.Migrate(db); err != nil {
                log.Fatalf("migrate: %v", err)
        }
        if cfg.AutoSeed {
                if err := seed.Run(db); err != nil {
                        log.Printf("seed development data: %v", err)
                }
        }
        if err := seed.RunRequired(db); err != nil {
                log.Fatalf("required seed: %v", err)
        }

        userRepo := repository.NewUserRepository(db)
        teacherRepo := repository.NewTeacherRepository(db)
        sessionRepo := repository.NewSessionRepository(db)
        reviewRepo := repository.NewReviewRepository(db)
        walletRepo := repository.NewWalletRepository(db)
        financialRepo := repository.NewFinancialRepository(db)
        onboardingRepo := repository.NewTeacherOnboardingRepository(db)
        reviewTransactionRepo := repository.NewReviewTransactionRepository(db)
        otpRepo := repository.NewOTPRepository(db)
        notifRepo := repository.NewNotificationRepository(db)
        supportRepo := repository.NewSupportMessageRepository(db)
        auditRepo := repository.NewAdminAuditRepository(db)
        analyticsRepo := repository.NewAnalyticsRepository(db)
        settingsRepo := repository.NewSettingRepository(db)
        postRepo := repository.NewPostRepository(db)

        tm := token.NewManager(cfg.JWTSecret, cfg.TokenExpiration)
        sender := sms.New(cfg.SMS)
        supportUsecase := usecase.NewSupportUsecase(supportRepo)

        paymentRepo := repository.NewPaymentRepository(db)
        samanClient := payment.NewSaman(cfg.Saman.TerminalID, cfg.Saman.SiteURL, cfg.Saman.BaseURL)

        paymentUsecase := usecase.NewPaymentUsecase(
                paymentRepo, financialRepo, userRepo, teacherRepo, notifRepo, sessionRepo,
                samanClient, cfg,
        )

        sessionUsecase := usecase.NewSessionUsecase(sessionRepo, teacherRepo, userRepo, walletRepo, notifRepo, cfg, financialRepo).WithBookingGateway(paymentUsecase)
        dispatchUsecase := usecase.NewDispatchUsecase(
                repository.NewDispatchRepository(db), teacherRepo, userRepo, sessionUsecase, notifRepo,
        )

        h := &delivery.Handler{
                Auth:         usecase.NewAuthUsecase(userRepo, otpRepo, sender, tm, cfg),
                User:         usecase.NewUserUsecase(userRepo, teacherRepo, onboardingRepo),
                LearnerStats: usecase.NewLearnerAnalyticsUsecase(analyticsRepo),
                Teacher:      usecase.NewTeacherUsecase(teacherRepo, reviewRepo, userRepo),
                Session:      sessionUsecase,
                Dispatch:     dispatchUsecase,
                Wallet: usecase.NewWalletUsecaseWithFinancial(
                        walletRepo, userRepo, teacherRepo, notifRepo, financialRepo,
                        cfg.DevWalletChargeEnabled && !cfg.IsProduction(),
                ),
                Review: usecase.NewReviewUsecase(reviewRepo, sessionRepo, teacherRepo, reviewTransactionRepo),
                Admin: usecase.NewAdminUsecase(userRepo, teacherRepo, sessionRepo, walletRepo, notifRepo, analyticsRepo,
                        usecase.AdminExtendedDeps{
                                ReviewRepo: reviewRepo,
                                ReviewTx:   reviewTransactionRepo,
                                Financial:  financialRepo,
                                Support:    supportRepo,
                                Settings:   settingsRepo,
                        }),
                Notif:   notifRepo,
                Live:    delivery.NewLiveHub(),
                Blog:    usecase.NewBlogUsecase(postRepo),
                Payment: paymentUsecase,
        }

        readiness := func(ctx context.Context) error { return sqlDB.PingContext(ctx) }
        router := delivery.NewRouter(cfg, h, tm, readiness, delivery.RouterOperations{
                Users:   userRepo,
                Support: supportUsecase,
                Audit:   auditRepo,
        })

        srv := &http.Server{
                Addr:              cfg.ServerHost + ":" + cfg.ServerPort,
                Handler:           router,
                ReadHeaderTimeout: 10 * time.Second,
                ReadTimeout:       15 * time.Second,
                WriteTimeout:      30 * time.Second,
                IdleTimeout:       60 * time.Second,
        }

        go func() {
                log.Printf("vodda-backend listening on %s (env=%s)", srv.Addr, cfg.AppEnv)
                if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
                        log.Fatalf("listen: %v", err)
                }
        }()

        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

        go func() {
                ticker := time.NewTicker(time.Minute)
                defer ticker.Stop()
                for {
                        select {
                        case <-ticker.C:
                                if err := dispatchUsecase.ExpireSweep(context.Background()); err != nil {
                                        log.Printf("dispatch sweep: %v", err)
                                }
                        case <-quit:
                                return
                        }
                }
        }()

        <-quit
        log.Println("shutting down")
        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        if err := srv.Shutdown(ctx); err != nil {
                log.Printf("server shutdown: %v", err)
        }
}
