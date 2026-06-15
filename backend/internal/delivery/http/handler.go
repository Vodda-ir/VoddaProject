package http

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// Handler bundles all usecases consumed by the HTTP layer.
type Handler struct {
	Auth    *usecase.AuthUsecase
	User    *usecase.UserUsecase
	Teacher *usecase.TeacherUsecase
	Session *usecase.SessionUsecase
	Wallet  *usecase.WalletUsecase
	Review  *usecase.ReviewUsecase
	Admin   *usecase.AdminUsecase
	Notif   domain.NotificationRepository
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

// ── auth ──

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

// ── current user ──

func (h *Handler) Me(c *gin.Context) {
	u, err := h.User.Me(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, u)
}

func (h *Handler) UpdateMe(c *gin.Context) {
	uid := userID(c)
	in := usecase.UpdateProfileInput{}

	// Check content type: multipart (with possible avatar file) vs plain JSON
	contentType := c.ContentType() // case-insensitive, returns just the media type
	if len(contentType) >= 9 && contentType[:9] == "multipart" {
		// Multipart form: fields + optional avatar file
		in.Name = c.PostForm("name")
		in.City = c.PostForm("city")
		in.Bio = c.PostForm("bio")

		file, header, err := c.Request.FormFile("avatar")
		if err == nil {
			defer file.Close()

			// Create uploads dir if not exists
			uploadDir := "uploads/avatars"
			if err := os.MkdirAll(uploadDir, 0755); err != nil {
				fail(c, domain.ErrInternal)
				return
			}

			// Generate unique filename: {userID}_{timestamp}.{ext}
			ext := filepath.Ext(header.Filename)
			if ext == "" {
				ext = ".jpg"
			}
			filename := fmt.Sprintf("%d_%d%s", uid, time.Now().UnixNano(), ext)
			savePath := filepath.Join(uploadDir, filename)

			dst, err := os.Create(savePath)
			if err != nil {
				fail(c, domain.ErrInternal)
				return
			}
			defer dst.Close()

			if _, err := io.Copy(dst, file); err != nil {
				fail(c, domain.ErrInternal)
				return
			}

			in.AvatarURL = "/" + savePath
		}
	} else {
		// Plain JSON body (backward compatible)
		var jsonIn struct {
			Name      string `json:"name"`
			City      string `json:"city"`
			Bio       string `json:"bio"`
			AvatarURL string `json:"avatar_url"`
		}
		_ = c.ShouldBindJSON(&jsonIn)
		in.Name = jsonIn.Name
		in.City = jsonIn.City
		in.Bio = jsonIn.Bio
		in.AvatarURL = jsonIn.AvatarURL
	}

	u, err := h.User.UpdateProfile(c, uid, in)
	if err != nil {
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

// ── teachers (public) ──

func (h *Handler) SearchTeachers(c *gin.Context) {
	f := domain.TeacherFilter{
		Query:  c.Query("q"),
		Field:  c.Query("field"),
		City:   c.Query("city"),
		Limit:  queryInt(c, "limit", 20),
		Offset: queryInt(c, "offset", 0),
	}
	if g := c.Query("female"); g != "" {
		b := g == "true" || g == "1"
		f.Female = &b
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
	wt, err := h.Teacher.WorkTimes(c, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, wt)
}

// ── teacher (self) ──

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
	_ = c.ShouldBindJSON(&in)
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
		Title    string `json:"title" binding:"required"`
		Duration int    `json:"duration" binding:"required"`
		Price    int64  `json:"price" binding:"required"`
		Icon     string `json:"icon"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	s := &domain.Service{Title: in.Title, Duration: in.Duration, Price: in.Price, Icon: in.Icon, Active: false}
	out, err := h.Teacher.AddService(c, userID(c), s)
	if err != nil {
		fail(c, err)
		return
	}
	created(c, out)
}

func (h *Handler) UpdateService(c *gin.Context) {
	var in struct {
		Title    *string `json:"title"`
		Duration *int    `json:"duration"`
		Price    *int64  `json:"price"`
		Icon     *string `json:"icon"`
		Active   *bool   `json:"active"`
	}
	_ = c.ShouldBindJSON(&in)
	s := &domain.Service{ID: paramID(c)}
	if in.Title != nil {
		s.Title = *in.Title
	}
	if in.Duration != nil {
		s.Duration = *in.Duration
	}
	if in.Price != nil {
		s.Price = *in.Price
	}
	if in.Icon != nil {
		s.Icon = *in.Icon
	}
	if in.Active != nil {
		s.Active = *in.Active
	}
	// attach teacher ID and update
	s.TeacherID = userID(c)
	if err := h.Teacher.UpdateService(c, userID(c), s); err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
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
			From    string `json:"from"`
			To      string `json:"to"`
		} `json:"slots"`
	}
	_ = c.ShouldBindJSON(&in)
	wt := make([]domain.WorkTime, 0, len(in.Slots))
	for _, s := range in.Slots {
		wt = append(wt, domain.WorkTime{Weekday: s.Weekday, FromTime: s.From, ToTime: s.To, Active: true})
	}
	if err := h.Teacher.SetWorkTimes(c, userID(c), wt); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"saved": len(wt)})
}

// ── work times ──

func (h *Handler) MyWorkTimes(c *gin.Context) {
	wt, err := h.Teacher.MyWorkTimes(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, wt)
}

// ── sessions ──

func (h *Handler) Book(c *gin.Context) {
	var in struct {
		TeacherID   uint   `json:"teacher_id" binding:"required"`
		ServiceID   uint   `json:"service_id" binding:"required"`
		ScheduledAt string `json:"scheduled_at" binding:"required"`
		Note        string `json:"note"`
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
	s, err := h.Session.Book(c, userID(c), usecase.BookInput{
		TeacherID: in.TeacherID, ServiceID: in.ServiceID, ScheduledAt: at, Note: in.Note,
	})
	if err != nil {
		fail(c, err)
		return
	}
	created(c, s)
}

func (h *Handler) MySessions(c *gin.Context) {
	s, err := h.Session.LearnerSessions(c, userID(c), c.Query("when"))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
}

func (h *Handler) CancelSession(c *gin.Context) {
	s, err := h.Session.Cancel(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
}

func (h *Handler) TeacherSessions(c *gin.Context) {
	var statuses []domain.SessionStatus
	switch c.Query("when") {
	case "upcoming":
		statuses = []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}
	case "past":
		statuses = []domain.SessionStatus{domain.SessionDone, domain.SessionCanceled}
	}
	s, err := h.Session.TeacherSessions(c, userID(c), statuses)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
}

func (h *Handler) AcceptSession(c *gin.Context) {
	s, err := h.Session.Accept(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
}

func (h *Handler) RejectSession(c *gin.Context) {
	var in struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&in)
	s, err := h.Session.Reject(c, userID(c), paramID(c), in.Reason)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
}

func (h *Handler) CompleteSession(c *gin.Context) {
	s, err := h.Session.Complete(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, s)
}

// ── reviews ──

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
	rv, err := h.Review.Rate(c, userID(c), usecase.RateInput(in))
	if err != nil {
		fail(c, err)
		return
	}
	created(c, rv)
}

// ── wallet ──

func (h *Handler) Transactions(c *gin.Context) {
	tx, err := h.Wallet.Transactions(c, userID(c), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, tx)
}

func (h *Handler) Charge(c *gin.Context) {
	var in struct {
		Amount int64 `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	u, err := h.Wallet.Charge(c, userID(c), in.Amount)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, u)
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
	w, err := h.Wallet.RequestWithdrawal(c, userID(c), usecase.WithdrawInput(in))
	if err != nil {
		fail(c, err)
		return
	}
	created(c, w)
}

func (h *Handler) MyWithdrawals(c *gin.Context) {
	w, err := h.Wallet.MyWithdrawals(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, w)
}

// ── notifications ──

func (h *Handler) Notifications(c *gin.Context) {
	n, err := h.Notif.ForUser(c, userID(c), queryInt(c, "limit", 30))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, n)
}

func (h *Handler) ReadNotification(c *gin.Context) {
	if err := h.Notif.MarkRead(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"read": true})
}
