package http

import (
        "context"
        "net/http"
        "time"

        "github.com/gin-contrib/cors"
        "github.com/gin-gonic/gin"
        "github.com/gin-gonic/gin/binding"

        "vodda/backend/internal/config"
        "vodda/backend/internal/domain"
        "vodda/backend/internal/platform/token"
        "vodda/backend/internal/usecase"
)

// RouterOperations contains optional operational dependencies. Keeping it
// variadic preserves compatibility for focused router tests.
type RouterOperations struct {
        Users   domain.UserRepository
        Support *usecase.SupportUsecase
        Audit   domain.AdminAuditRepository
}

func NewRouter(cfg *config.Config, h *Handler, tm *token.Manager, readiness func(context.Context) error, optional ...RouterOperations) *gin.Engine {
        if cfg.IsProduction() {
                gin.SetMode(gin.ReleaseMode)
        }
        binding.EnableDecoderDisallowUnknownFields = true

        var operations RouterOperations
        if len(optional) > 0 {
                operations = optional[0]
        }

        r := gin.New()
        _ = r.SetTrustedProxies(trustedProxiesFromEnv())
        r.Use(RequestID(), SecurityHeaders(), AccessLogger(), gin.Recovery(), BodyLimit(6<<20), ValidateRouteID())
        r.MaxMultipartMemory = 5 << 20

        corsCfg := cors.DefaultConfig()
        if cfg.IsProduction() {
                corsCfg.AllowOrigins = cfg.CORSAllowedOrigins
                corsCfg.CustomSchemas = []string{"capacitor://"}
        } else {
                corsCfg.AllowAllOrigins = true
        }
        corsCfg.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", requestIDHeader, "Idempotency-Key"}
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

        r.StaticFS("/uploads", gin.Dir("./uploads", false))

        api := r.Group("/api/v1")
        publicLimiter := NewRateLimiter(120, time.Minute)
        otpRequestLimiter := NewRateLimiter(5, 10*time.Minute)
        otpVerifyLimiter := NewRateLimiter(10, 10*time.Minute)
        supportLimiter := NewRateLimiter(5, time.Hour)
        authedLimiter := NewRateLimiter(240, time.Minute)
        mutationLimiter := NewRateLimiter(120, time.Minute)
        financialLimiter := NewRateLimiter(30, time.Minute)
        adminLimiter := NewRateLimiter(180, time.Minute)
        dispatchLimiter := NewRateLimiter(90, time.Minute)

        auth := api.Group("/auth")
        {
                auth.POST("/request-otp", otpRequestLimiter.Middleware("otp-request"), h.RequestOTP)
                auth.POST("/verify-otp", otpVerifyLimiter.Middleware("otp-verify"), h.VerifyOTP)
                // ورود با گوگل — برای کاربرانی که از خارج از کشور وارد می‌شوند.
                // مسیرها عمومی‌اند: callback از مرورگرِ برگشتی از گوگل می‌آید و
                // هویت با code+state و تبادل سرتاسری با گوگل احراز می‌شود.
                auth.GET("/google/status", publicLimiter.Middleware("google-status"), h.GoogleAuthStatus)
                auth.GET("/google", publicLimiter.Middleware("google-start"), h.GoogleAuthStart)
                auth.GET("/google/callback", publicLimiter.Middleware("google-callback"), h.GoogleAuthCallback)
        }
        api.GET("/teachers", publicLimiter.Middleware("teacher-search"), h.SearchTeachers)
        api.GET("/teachers/:id", publicLimiter.Middleware("teacher-detail"), h.GetTeacher)
        api.GET("/teachers/:id/work-times", publicLimiter.Middleware("teacher-work-times"), h.TeacherWorkTimes)
        api.GET("/teachers/:id/availability", publicLimiter.Middleware("teacher-availability"), teacherAvailabilityHandler(h.Session))
        blogLimiter := NewRateLimiter(90, time.Minute)
        api.GET("/blog/posts", blogLimiter.Middleware("blog-list"), h.BlogList)
        api.GET("/blog/posts/:slug", blogLimiter.Middleware("blog-detail"), h.BlogPostBySlug)
        if operations.Support != nil {
                api.POST("/support/messages", supportLimiter.Middleware("support-message"), createSupportMessageHandler(operations.Support))
        }

        // Payment gateway back-channel. The payer's browser lands here straight
        // from sep.shaparak.ir — no session cookie exists yet, so the route stays
        // public and the usecase validates the payload against the stored order.
        // The Sep token itself is handed to the authed frontend inside the JSON
        // answers of booking/topup/pay endpoints (Monafaseh create semantics).
        paymentLimiter := NewRateLimiter(30, time.Minute)
        payments := api.Group("/payments")
        {
                payments.POST("/saman/callback", paymentLimiter.Middleware("saman-callback"), h.SamanCallback)
                payments.GET("/saman/callback", paymentLimiter.Middleware("saman-callback"), h.SamanCallback)
        }

        // Online classroom signaling. The WebSocket accepts a short-lived
        // ticket (browsers cannot set headers on WS handshakes); HTTP fallback
        // endpoints stay inside the authenticated group.
        api.GET("/live/ws", h.LiveWS)

        authed := api.Group("")
        authed.Use(AuthRequired(tm, operations.Users), authedLimiter.Middleware("authenticated"))
        {
                authed.GET("/me", h.Me)
                authed.GET("/me/analytics", h.MeAnalytics)
                authed.PUT("/me", mutationLimiter.Middleware("profile-update"), ValidateAvatarUpload(5<<20), h.UpdateMe)
                authed.POST("/me/become-teacher", mutationLimiter.Middleware("become-teacher"), h.BecomeTeacher)
                authed.GET("/notifications", h.Notifications)
                authed.POST("/notifications/:id/read", mutationLimiter.Middleware("notification-read"), h.ReadNotification)
                authed.POST("/sessions", financialLimiter.Middleware("financial"), h.Book)
                authed.GET("/sessions", learnerSessionDisplaysHandler(h.Session))
                authed.POST("/sessions/:id/pay", financialLimiter.Middleware("financial"), h.PaySession)
                authed.POST("/sessions/:id/cancel", financialLimiter.Middleware("financial"), cancelSessionBeforeStartHandler(h.Session))
                authed.GET("/sessions/:id", h.SessionDetail)
                authed.GET("/sessions/:id/messages", h.SessionMessages)
                authed.POST("/sessions/:id/messages", mutationLimiter.Middleware("session-message"), h.SendSessionMessage)
                authed.POST("/reviews", mutationLimiter.Middleware("review"), h.Rate)
                authed.GET("/wallet/transactions", h.Transactions)
                authed.POST("/wallet/charge", financialLimiter.Middleware("financial"), h.Charge)
                authed.POST("/wallet/topup", financialLimiter.Middleware("financial"), h.WalletTopup)
                authed.GET("/wallet/topups", h.MyTopups)
                live := authed.Group("/live")
                {
                        live.POST("/ticket", mutationLimiter.Middleware("live-ticket"), h.LiveTicket)
                        live.GET("/events", h.LiveEvents)
                        live.POST("/signal", mutationLimiter.Middleware("live-signal"), h.LiveSignal)
                }

                // فراخوان اساتید — learner-side dispatch (call-out) endpoints.
                dispatch := authed.Group("/dispatch")
                {
                        dispatch.POST("/calls", dispatchLimiter.Middleware("dispatch-create"), h.CreateDispatchCall)
                        dispatch.GET("/calls/current", h.CurrentDispatchCall)
                        dispatch.POST("/calls/:id/choose", dispatchLimiter.Middleware("dispatch-choose"), h.ChooseDispatchOffer)
                        dispatch.POST("/calls/:id/decline", dispatchLimiter.Middleware("dispatch-decline"), h.DeclineDispatchOffer)
                        dispatch.POST("/calls/:id/cancel", dispatchLimiter.Middleware("dispatch-cancel"), h.CancelDispatchCall)
                }

                // خدمات حضوری قرآنی — organizer-side ceremony calls and contracts.
                ceremony := authed.Group("/ceremony")
                {
                        ceremony.POST("/calls", dispatchLimiter.Middleware("ceremony-create"), h.CreateCeremonyCall)
                        ceremony.GET("/calls", h.MyCeremonyCalls)
                        ceremony.GET("/calls/:id", h.CeremonyCallDetail)
                        ceremony.POST("/calls/:id/choose", financialLimiter.Middleware("ceremony-choose"), h.ChooseCeremonyOffer)
                        ceremony.POST("/calls/:id/cancel", dispatchLimiter.Middleware("ceremony-cancel"), h.CancelCeremonyCall)
                        ceremony.POST("/bookings/direct", financialLimiter.Middleware("ceremony-direct"), h.DirectCeremonyBooking)
                        ceremony.GET("/bookings", h.MyCeremonyBookings)
                        ceremony.GET("/bookings/:id", h.CeremonyBookingDetail)
                        ceremony.POST("/bookings/:id/pay", financialLimiter.Middleware("financial"), h.PayCeremonyDeposit)
                        ceremony.POST("/bookings/:id/confirm", financialLimiter.Middleware("financial"), h.ConfirmCeremonyBooking)
                        ceremony.POST("/bookings/:id/cancel", financialLimiter.Middleware("financial"), h.CancelCeremonyBooking)
                }
        }

        teacher := api.Group("/teacher")
        teacher.Use(AuthRequired(tm, operations.Users), RequireRole(domain.RoleTeacher, domain.RoleAdmin), authedLimiter.Middleware("teacher"))
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
                teacher.GET("/sessions", teacherSessionDisplaysHandler(h.Session))
                teacher.GET("/sessions/unseen-count", h.TeacherUnseenSessions)
                teacher.POST("/sessions/mark-seen", mutationLimiter.Middleware("teacher-session"), h.MarkTeacherSessionsSeen)
                teacher.POST("/sessions/:id/accept", mutationLimiter.Middleware("teacher-session"), h.AcceptSession)
                teacher.POST("/sessions/:id/reject", financialLimiter.Middleware("financial"), h.RejectSession)
                teacher.POST("/sessions/:id/complete", financialLimiter.Middleware("financial"), h.CompleteSession)
                teacher.GET("/reviews", teacherReviewsHandler(h.Teacher))
                teacher.POST("/withdrawals", financialLimiter.Middleware("financial"), h.RequestWithdrawal)
                teacher.GET("/withdrawals", h.MyWithdrawals)

                // فراخوان اساتید — teacher-side live inbox and answers.
                teacher.GET("/dispatch/inbox", h.TeacherDispatchInbox)
                teacher.POST("/dispatch/calls/:id/accept", dispatchLimiter.Middleware("dispatch-accept"), h.TeacherDispatchAccept)
                teacher.POST("/dispatch/calls/:id/reject", dispatchLimiter.Middleware("dispatch-reject"), h.TeacherDispatchReject)
                teacher.POST("/dispatch/offers/:id/withdraw", dispatchLimiter.Middleware("dispatch-withdraw"), h.TeacherDispatchWithdraw)

                // خدمات حضوری قرآنی — reciter (قاری) side: inbox, acceptance
                // and presence services management.
                teacher.GET("/ceremony/inbox", h.TeacherCeremonyInbox)
                teacher.POST("/ceremony/calls/:id/accept", dispatchLimiter.Middleware("ceremony-accept"), h.TeacherCeremonyAccept)
                teacher.POST("/ceremony/offers/:id/withdraw", dispatchLimiter.Middleware("ceremony-withdraw"), h.TeacherCeremonyWithdraw)
                teacher.GET("/presence-services", h.MyPresenceServices)
                teacher.POST("/presence-services", mutationLimiter.Middleware("teacher-presence"), h.AddPresenceService)
                teacher.PUT("/presence-services/:id", mutationLimiter.Middleware("teacher-presence"), h.UpdatePresenceService)
                teacher.DELETE("/presence-services/:id", mutationLimiter.Middleware("teacher-presence"), h.DeletePresenceService)
        }

        api.GET("/settings", h.PublicSettings)
        api.GET("/catalog/services", publicLimiter.Middleware("catalog-services"), h.CatalogServices)
        // «خدمات رایگان» — public board of zero-price services (homepage).
        api.GET("/catalog/free", publicLimiter.Middleware("catalog-free"), h.FreeServices)

        // خدمات حضوری قرآنی — public presence catalog of reciters.
        api.GET("/presence/providers", publicLimiter.Middleware("presence-list"), h.PresenceProviders)
        api.GET("/presence/providers/:id", publicLimiter.Middleware("presence-detail"), h.PresenceProviderDetail)

        admin := api.Group("/admin")
        admin.Use(AuthRequired(tm, operations.Users), RequireRole(domain.RoleAdmin), adminLimiter.Middleware("admin"))
        if operations.Audit != nil {
                admin.Use(AuditAdminMutations(operations.Audit))
        }
        {
                admin.GET("/dashboard", h.AdminDashboard)
                admin.GET("/analytics", h.AdminAnalytics)
                admin.GET("/summary", h.AdminSummary)
                admin.GET("/reviews", h.AdminReviews)
                admin.DELETE("/reviews/:id", mutationLimiter.Middleware("admin-mutation"), h.AdminDeleteReview)
                admin.GET("/settings", h.AdminGetSettings)
                admin.PUT("/settings", mutationLimiter.Middleware("admin-mutation"), h.AdminUpdateSettings)
                admin.GET("/users", h.AdminUsers)
                admin.GET("/users/:id", h.AdminUserDetail)
                admin.POST("/users/:id/notify", mutationLimiter.Middleware("admin-mutation"), h.AdminNotifyUser)
                admin.PATCH("/users/:id/active", mutationLimiter.Middleware("admin-mutation"), h.AdminSetUserActive)
                admin.PATCH("/users/:id/role", mutationLimiter.Middleware("admin-mutation"), h.AdminSetUserRole)
                admin.POST("/users/:id/wallet-adjust", mutationLimiter.Middleware("admin-mutation"), h.AdminAdjustWallet)
                admin.GET("/teachers", h.AdminTeachers)
                admin.POST("/teachers/:id/review", mutationLimiter.Middleware("admin-mutation"), h.AdminReviewTeacher)
                admin.PATCH("/teachers/:id/settings", mutationLimiter.Middleware("admin-mutation"), h.AdminTeacherSettings)
                admin.GET("/sessions", adminSessionDisplaysHandler(h.Session))
                admin.GET("/withdrawals", h.AdminWithdrawals)
                admin.POST("/withdrawals/:id/process", financialLimiter.Middleware("financial"), h.AdminProcessWithdrawal)
                admin.GET("/services", h.AdminServices)
                admin.PUT("/services/:id/approve", mutationLimiter.Middleware("admin-mutation"), h.AdminApproveService)
                admin.PUT("/services/:id/reject", mutationLimiter.Middleware("admin-mutation"), h.AdminRejectService)
                admin.GET("/posts", h.AdminPosts)
                admin.GET("/post-stats", h.AdminPostStats)
                admin.POST("/posts", mutationLimiter.Middleware("admin-mutation"), h.AdminCreatePost)
                admin.GET("/posts/:id", h.AdminGetPost)
                admin.PUT("/posts/:id", mutationLimiter.Middleware("admin-mutation"), h.AdminUpdatePost)
                admin.DELETE("/posts/:id", mutationLimiter.Middleware("admin-mutation"), h.AdminDeletePost)
                admin.POST("/blog-upload", mutationLimiter.Middleware("admin-mutation"), h.AdminUploadPostImage)
                if operations.Support != nil {
                        admin.GET("/support/messages", listSupportMessagesHandler(operations.Support))
                        admin.PATCH("/support/messages/:id/resolve", mutationLimiter.Middleware("admin-mutation"), resolveSupportMessageHandler(operations.Support))
                }
                if operations.Audit != nil {
                        admin.GET("/audit-logs", listAdminAuditHandler(operations.Audit))
                }
        }

        return r
}
