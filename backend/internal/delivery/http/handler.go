package http

import (
        "errors"
        "fmt"
        "io"
        "net/http"
        "os"
        "path/filepath"
        "strconv"
        "time"

        "github.com/gin-gonic/gin"

        "vodda/backend/internal/domain"
        "vodda/backend/internal/platform/payment"
        "vodda/backend/internal/usecase"
)

// Handler bundles all usecases consumed by the HTTP layer.
type Handler struct {
        Auth         *usecase.AuthUsecase
        User         *usecase.UserUsecase
        LearnerStats *usecase.LearnerAnalyticsUsecase
        Teacher      *usecase.TeacherUsecase
        Session      *usecase.SessionUsecase
        Dispatch     *usecase.DispatchUsecase
        Wallet       *usecase.WalletUsecase
        Payment      *usecase.PaymentUsecase
        Review       *usecase.ReviewUsecase
        Admin        *usecase.AdminUsecase
        Blog         *usecase.BlogUsecase
        Notif        domain.NotificationRepository
        Live         *LiveHub
}

func paramID(c *gin.Context) uint {
        id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
        return uint(id)
}

func queryInt(c *gin.Context, key string, def int) int {
        if v := c.Query(key); v != "" {
                if n, err := strconv.Atoi(v); err == nil {
                        return n
                }
        }
        return def
}

func (h *Handler) RequestOTP(c *gin.Context) {
        var in struct {
                Mobile string `json:"mobile" binding:"required"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        if err := h.Auth.RequestOTP(c, in.Mobile); err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"sent": true})
}

func (h *Handler) VerifyOTP(c *gin.Context) {
        var in struct {
                Mobile string `json:"mobile" binding:"required"`
                Code   string `json:"code" binding:"required"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        res, err := h.Auth.VerifyOTP(c, in.Mobile, in.Code)
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, res)
}

func (h *Handler) Me(c *gin.Context) {
        u, err := h.User.Me(c, userID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, u)
}

// MeAnalytics serves the personal learning analytics of the authenticated user.
func (h *Handler) MeAnalytics(c *gin.Context) {
        stats, err := h.LearnerStats.Overview(c, userID(c), queryInt(c, "days", 30))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, stats)
}

func (h *Handler) UpdateMe(c *gin.Context) {
        uid := userID(c)
        in := usecase.UpdateProfileInput{}
        var savedAvatar string

        if c.ContentType() == "multipart/form-data" {
                in.Name = c.PostForm("name")
                in.City = c.PostForm("city")
                in.Bio = c.PostForm("bio")

                file, header, err := c.Request.FormFile("avatar")
                if err == nil {
                        defer file.Close()
                        uploadDir := "uploads/avatars"
                        if err := os.MkdirAll(uploadDir, 0o755); err != nil {
                                fail(c, domain.ErrInternal)
                                return
                        }
                        ext := filepath.Ext(header.Filename)
                        if ext == "" {
                                ext = ".jpg"
                        }
                        filename := fmt.Sprintf("%d_%d%s", uid, time.Now().UnixNano(), ext)
                        savePath := filepath.Join(uploadDir, filename)
                        dst, err := os.OpenFile(savePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
                        if err != nil {
                                fail(c, domain.ErrInternal)
                                return
                        }
                        _, copyErr := io.Copy(dst, file)
                        closeErr := dst.Close()
                        if copyErr != nil || closeErr != nil {
                                _ = os.Remove(savePath)
                                fail(c, domain.ErrInternal)
                                return
                        }
                        savedAvatar = savePath
                        in.AvatarURL = "/" + filepath.ToSlash(savePath)
                } else if !errors.Is(err, os.ErrNotExist) && !errors.Is(err, io.EOF) {
                        // Missing avatar is valid; malformed multipart is not.
                        if err != nil && err.Error() != "http: no such file" {
                                fail(c, domain.ErrValidation)
                                return
                        }
                }
        } else {
                var jsonIn struct {
                        Name      string `json:"name"`
                        City      string `json:"city"`
                        Bio       string `json:"bio"`
                        AvatarURL string `json:"avatar_url"`
                }
                if err := c.ShouldBindJSON(&jsonIn); err != nil {
                        fail(c, domain.ErrValidation)
                        return
                }
                in.Name = jsonIn.Name
                in.City = jsonIn.City
                in.Bio = jsonIn.Bio
                in.AvatarURL = jsonIn.AvatarURL
        }

        u, err := h.User.UpdateProfile(c, uid, in)
        if err != nil {
                if savedAvatar != "" {
                        _ = os.Remove(savedAvatar)
                }
                fail(c, err)
                return
        }
        ok(c, u)
}

func (h *Handler) BecomeTeacher(c *gin.Context) {
        var in struct {
                Field   string   `json:"field" binding:"required"`
                Tag     string   `json:"tag"`
                Level   string   `json:"level"`
                City    string   `json:"city"`
                Bio     string   `json:"bio" binding:"required"`
                Skills  []string `json:"skills"`
                Price30 int64    `json:"price30" binding:"required"`
                Price60 int64    `json:"price60"`
                Female  bool     `json:"female"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        t, err := h.User.BecomeTeacher(c, userID(c), usecase.BecomeTeacherInput{
                Field: in.Field, Tag: in.Tag, Level: in.Level, City: in.City,
                Bio: in.Bio, Skills: in.Skills, Price30: in.Price30, Price60: in.Price60,
                Female: in.Female,
        })
        if err != nil {
                fail(c, err)
                return
        }
        created(c, t)
}

func (h *Handler) SearchTeachers(c *gin.Context) {
        f := domain.TeacherFilter{
                Query: c.Query("q"), Field: c.Query("field"), City: c.Query("city"),
                Limit: queryInt(c, "limit", 20), Offset: queryInt(c, "offset", 0),
                OfficialServiceID: uint(queryInt(c, "official_service_id", 0)),
        }
        if g := c.Query("female"); g != "" {
                if g != "true" && g != "false" && g != "1" && g != "0" {
                        fail(c, domain.ErrValidation)
                        return
                }
                value := g == "true" || g == "1"
                f.Female = &value
        }
        teachers, total, err := h.Teacher.Search(c, f)
        if err != nil {
                fail(c, err)
                return
        }
        okList(c, teachers, total)
}

func (h *Handler) GetTeacher(c *gin.Context) {
        t, reviews, err := h.Teacher.Get(c, paramID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"teacher": t, "reviews": reviews})
}

func (h *Handler) TeacherWorkTimes(c *gin.Context) {
        workTimes, err := h.Teacher.WorkTimes(c, paramID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, workTimes)
}

func (h *Handler) MyTeacher(c *gin.Context) {
        t, err := h.Teacher.Mine(c, userID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, t)
}

func (h *Handler) UpdateMyTeacher(c *gin.Context) {
        var in struct {
                Field     string   `json:"field"`
                Tag       string   `json:"tag"`
                Level     string   `json:"level"`
                City      string   `json:"city"`
                Bio       string   `json:"bio"`
                Skills    []string `json:"skills"`
                Price30   int64    `json:"price30"`
                Price60   int64    `json:"price60"`
                Available *bool    `json:"available"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        t, err := h.Teacher.UpdateMine(c, userID(c), usecase.BecomeTeacherInput{
                Field: in.Field, Tag: in.Tag, Level: in.Level, City: in.City,
                Bio: in.Bio, Skills: in.Skills, Price30: in.Price30, Price60: in.Price60,
                Available: in.Available,
        })
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, t)
}

func (h *Handler) AddService(c *gin.Context) {
        var in struct {
                OfficialServiceID uint   `json:"official_service_id" binding:"required"`
                Duration          int    `json:"duration" binding:"required"`
                Price             int64  `json:"price" binding:"required"`
                Title             string `json:"title"` // deprecated: title always comes from the official catalog
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        service := &domain.Service{OfficialServiceID: &in.OfficialServiceID, Duration: in.Duration, Price: in.Price}
        out, err := h.Teacher.AddService(c, userID(c), service)
        if err != nil {
                fail(c, err)
                return
        }
        created(c, out)
}

func (h *Handler) UpdateService(c *gin.Context) {
        var in struct {
                OfficialServiceID *uint   `json:"official_service_id"`
                Duration          *int    `json:"duration"`
                Price             *int64  `json:"price"`
                Active            *bool   `json:"active"`
                Title             *string `json:"title"` // deprecated: title always comes from the official catalog
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        if in.OfficialServiceID == nil && in.Duration == nil && in.Price == nil {
                if in.Active == nil {
                        fail(c, domain.ErrValidation)
                        return
                }
                if err := h.Teacher.ToggleServiceActive(c, userID(c), paramID(c), *in.Active); err != nil {
                        fail(c, err)
                        return
                }
                ok(c, gin.H{"active": *in.Active})
                return
        }
        service := &domain.Service{ID: paramID(c), Active: true}
        if in.OfficialServiceID != nil {
                service.OfficialServiceID = in.OfficialServiceID
        }
        if in.Duration != nil {
                service.Duration = *in.Duration
        }
        if in.Price != nil {
                service.Price = *in.Price
        }
        if err := h.Teacher.UpdateService(c, userID(c), service); err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"updated": true})
}

func (h *Handler) DeleteService(c *gin.Context) {
        if err := h.Teacher.DeleteService(c, userID(c), paramID(c)); err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"deleted": true})
}

func (h *Handler) SetWorkTimes(c *gin.Context) {
        var in struct {
                Slots []struct {
                        Weekday int    `json:"weekday"`
                        From    string `json:"from" binding:"required"`
                        To      string `json:"to" binding:"required"`
                } `json:"slots"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        workTimes := make([]domain.WorkTime, 0, len(in.Slots))
        for _, slot := range in.Slots {
                workTimes = append(workTimes, domain.WorkTime{Weekday: slot.Weekday, FromTime: slot.From, ToTime: slot.To, Active: true})
        }
        if err := h.Teacher.SetWorkTimes(c, userID(c), workTimes); err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"saved": len(workTimes)})
}

func (h *Handler) MyWorkTimes(c *gin.Context) {
        workTimes, err := h.Teacher.MyWorkTimes(c, userID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, workTimes)
}

func (h *Handler) AddWorkTime(c *gin.Context) {
        var in struct {
                Weekday int    `json:"weekday"`
                From    string `json:"from" binding:"required"`
                To      string `json:"to" binding:"required"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        workTime := &domain.WorkTime{Weekday: in.Weekday, FromTime: in.From, ToTime: in.To, Active: true}
        if err := h.Teacher.AddWorkTime(c, userID(c), workTime); err != nil {
                fail(c, err)
                return
        }
        created(c, workTime)
}

func (h *Handler) UpdateWorkTime(c *gin.Context) {
        var in struct {
                Weekday int    `json:"weekday"`
                From    string `json:"from" binding:"required"`
                To      string `json:"to" binding:"required"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        workTime := &domain.WorkTime{ID: paramID(c), Weekday: in.Weekday, FromTime: in.From, ToTime: in.To, Active: true}
        if err := h.Teacher.UpdateWorkTime(c, userID(c), workTime); err != nil {
                fail(c, err)
                return
        }
        ok(c, workTime)
}

func (h *Handler) DeleteWorkTime(c *gin.Context) {
        if err := h.Teacher.DeleteWorkTime(c, userID(c), paramID(c)); err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"deleted": true})
}

func (h *Handler) Book(c *gin.Context) {
        var in struct {
                TeacherID     uint   `json:"teacher_id" binding:"required"`
                ServiceID     uint   `json:"service_id" binding:"required"`
                ScheduledAt   string `json:"scheduled_at" binding:"required"`
                Note          string `json:"note"`
                PaymentMethod string `json:"payment_method"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        at, err := time.Parse(time.RFC3339, in.ScheduledAt)
        if err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        result, err := h.Session.Book(c, userID(c), usecase.BookInput{
                TeacherID:     in.TeacherID,
                ServiceID:     in.ServiceID,
                ScheduledAt:   at,
                Note:          in.Note,
                PaymentMethod: in.PaymentMethod,
        })
        if err != nil {
                fail(c, err)
                return
        }
        created(c, result)
}

// PaySession re-opens the gateway checkout for a booking still awaiting
// payment (the learner closed the browser or the session expired mid-flow).
func (h *Handler) PaySession(c *gin.Context) {
        payment, err := h.Session.BookingPayment(c, userID(c), paramID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, payment)
}

func (h *Handler) MySessions(c *gin.Context) {
        sessions, err := h.Session.LearnerSessions(c, userID(c), c.Query("when"))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, sessions)
}

func (h *Handler) CancelSession(c *gin.Context) {
        session, err := h.Session.Cancel(c, userID(c), paramID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, session)
}

func (h *Handler) TeacherSessions(c *gin.Context) {
        var statuses []domain.SessionStatus
        switch c.Query("when") {
        case "pending":
                statuses = []domain.SessionStatus{domain.SessionPending}
        case "upcoming":
                statuses = []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}
        case "past":
                statuses = []domain.SessionStatus{domain.SessionDone, domain.SessionCanceled}
        }
        sessions, err := h.Session.TeacherSessions(c, userID(c), statuses)
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, sessions)
}

func (h *Handler) AcceptSession(c *gin.Context) {
        session, err := h.Session.Accept(c, userID(c), paramID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, session)
}

func (h *Handler) RejectSession(c *gin.Context) {
        var in struct {
                Reason string `json:"reason"`
        }
        if err := c.ShouldBindJSON(&in); err != nil && !errors.Is(err, io.EOF) {
                fail(c, domain.ErrValidation)
                return
        }
        session, err := h.Session.Reject(c, userID(c), paramID(c), in.Reason)
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, session)
}

func (h *Handler) CompleteSession(c *gin.Context) {
        session, err := h.Session.Complete(c, userID(c), paramID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, session)
}

func (h *Handler) Rate(c *gin.Context) {
        var in struct {
                SessionID uint   `json:"session_id" binding:"required"`
                Rating    int    `json:"rating" binding:"required"`
                Text      string `json:"text"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        review, err := h.Review.Rate(c, userID(c), usecase.RateInput{SessionID: in.SessionID, Rating: in.Rating, Text: in.Text})
        if err != nil {
                fail(c, err)
                return
        }
        created(c, review)
}

func (h *Handler) Transactions(c *gin.Context) {
        transactions, err := h.Wallet.Transactions(c, userID(c), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, transactions)
}

func (h *Handler) Charge(c *gin.Context) {
        var in struct {
                Amount int64 `json:"amount" binding:"required"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        user, err := h.Wallet.Charge(c, userID(c), in.Amount)
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, user)
}

func (h *Handler) RequestWithdrawal(c *gin.Context) {
        var in struct {
                Amount int64  `json:"amount" binding:"required"`
                Card   string `json:"card"`
                Sheba  string `json:"sheba"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        withdrawal, err := h.Wallet.RequestWithdrawal(c, userID(c), usecase.WithdrawInput{Amount: in.Amount, Card: in.Card, Sheba: in.Sheba})
        if err != nil {
                fail(c, err)
                return
        }
        created(c, withdrawal)
}

func (h *Handler) MyWithdrawals(c *gin.Context) {
        withdrawals, err := h.Wallet.MyWithdrawals(c, userID(c))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, withdrawals)
}

// WalletTopup opens a Saman Sep order and returns the Sep payment page URL.
func (h *Handler) WalletTopup(c *gin.Context) {
        var in struct {
                Amount int64 `json:"amount" binding:"required"`
        }
        if err := c.ShouldBindJSON(&in); err != nil {
                fail(c, domain.ErrValidation)
                return
        }
        result, err := h.Payment.CreateTopup(c, userID(c), in.Amount)
        if err != nil {
                fail(c, err)
                return
        }
        created(c, result)
}

// MyTopups lists the caller's latest gateway top-up orders.
func (h *Handler) MyTopups(c *gin.Context) {
        orders, err := h.Payment.RecentTopups(c, userID(c), queryInt(c, "limit", 20))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, orders)
}

// SamanCallback is the public gateway back-channel. The payer's browser is
// redirected here by sep.shaparak.ir; the handler settles the order and sends
// the payer back to the wallet page. It accepts both POST form and GET query.
func (h *Handler) SamanCallback(c *gin.Context) {
        if h.Payment == nil {
                c.Redirect(http.StatusFound, "/panel/user/wallet?payment=failed")
                return
        }
        target := h.Payment.HandleCallback(c, payment.ParseCallback(c.Request))
        c.Header("Cache-Control", "no-store")
        c.Redirect(http.StatusFound, target)
}

// SamanStart serves the self-submitting hand-off page that carries a freshly
// minted Sep token into the OnlinePG payment UI. The token must be POSTed to
// sep.shaparak.ir from a vodda.ir document so the gateway sees the registered
// Referer. Token shape is validated defensively; anything malformed gets a
// plain failure page instead of a hand-off.
func (h *Handler) SamanStart(c *gin.Context) {
        c.Header("Cache-Control", "no-store")
        c.Header("X-Robots-Tag", "noindex")
        page, okd := h.Payment.StartPage(c.Query("token"))
        if !okd {
                c.Data(http.StatusBadRequest, "text/html; charset=utf-8", payment.FailureStartHTML())
                return
        }
        c.Data(http.StatusOK, "text/html; charset=utf-8", page)
}

func (h *Handler) Notifications(c *gin.Context) {
        notifications, err := h.Notif.ForUser(c, userID(c), queryInt(c, "limit", 30))
        if err != nil {
                fail(c, err)
                return
        }
        ok(c, notifications)
}

func (h *Handler) ReadNotification(c *gin.Context) {
        if err := h.Notif.MarkRead(c, userID(c), paramID(c)); err != nil {
                fail(c, err)
                return
        }
        ok(c, gin.H{"read": true})
}
