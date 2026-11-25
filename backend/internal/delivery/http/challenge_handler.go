package http

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// ── چالش‌های قرآنی — سمت کاربر ──

// ChallengeList handles GET /challenges — فهرست چالش‌های قابل نمایش.
func (h *Handler) ChallengeList(c *gin.Context) {
	items, err := h.Challenge.PublicList(c.Request.Context(), userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, items)
}

// ChallengeDetail handles GET /challenges/:id — جزئیات چالش برای کاربر جاری.
func (h *Handler) ChallengeDetail(c *gin.Context) {
	detail, err := h.Challenge.PublicDetail(c.Request.Context(), paramID(c), userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, detail)
}

// ChallengeJoin handles POST /challenges/:id/join — ثبت‌نام؛ رسیدن به ظرفیت
// چالش را خودکار آغاز می‌کند و امتیاز اینستاقرآن مشارکت ثبت می‌شود.
func (h *Handler) ChallengeJoin(c *gin.Context) {
	participant, started, err := h.Challenge.Join(c.Request.Context(), paramID(c), userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"participant": participant, "started": started})
}

// ChallengeSubmit handles POST /challenges/:id/submission — ارسال اثر
// (multipart: فایل صوتی «file» و/یا متن «text»).
func (h *Handler) ChallengeSubmit(c *gin.Context) {
	text := c.PostForm("text")
	audioURL := ""
	if header, err := c.FormFile("file"); err == nil && header != nil && header.Size > 0 {
		if header.Size > sessionMediaAudioMax {
			fail(c, domain.ErrValidation)
			return
		}
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext == ".oga" {
			ext = ".ogg"
		}
		if !sessionAudioExts[ext] {
			fail(c, domain.ErrValidation)
			return
		}
		saved, saveErr := saveChallengeAudio(header, fmt.Sprintf("sub_c%d_u%d", paramID(c), userID(c)))
		if saveErr != nil {
			fail(c, saveErr)
			return
		}
		audioURL = saved
	} else if err != nil && err != http.ErrMissingFile {
		fail(c, domain.ErrValidation)
		return
	}
	participant, err := h.Challenge.Submit(c.Request.Context(), paramID(c), userID(c), text, audioURL)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, participant)
}

// ChallengeVote handles POST /challenges/:id/vote — ثبت رأی مخاطب یا استاد داور.
func (h *Handler) ChallengeVote(c *gin.Context) {
	var in struct {
		ParticipantID uint `json:"participant_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	// اساتید داور جداگانه شمرده می‌شوند؛ بقیه رأی مخاطب‌اند.
	isJudge := callerRole(c) == domain.RoleTeacher
	if err := h.Challenge.Vote(c.Request.Context(), paramID(c), in.ParticipantID, userID(c), isJudge); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"voted": true})
}

// ChallengeResults handles GET /challenges/:id/results — رتبه‌بندی ۱ تا ۵ و
// کارنامهٔ کاربر جاری.
func (h *Handler) ChallengeResults(c *gin.Context) {
	results, err := h.Challenge.Results(c.Request.Context(), paramID(c), userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, results)
}

// MyPoints handles GET /me/points — امتیاز اینستاقرآن کاربر جاری.
func (h *Handler) MyPoints(c *gin.Context) {
	snapshot, err := h.Challenge.MyPoints(c.Request.Context(), userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, snapshot)
}

// ── چالش‌ها — پنل مدیریت ادمین ──

func challengeInputFromJSON(c *gin.Context) (usecase.ChallengeInput, bool) {
	var in struct {
		Title            string `json:"title"`
		Description      string `json:"description"`
		Mode             string `json:"mode"`
		AudioURL         string `json:"audio_url"`
		AudioTeacherName string `json:"audio_teacher_name"`
		Capacity         int    `json:"capacity"`
		DurationHours    int    `json:"duration_hours"`
		VotingHours      int    `json:"voting_hours"`
		WeightAudience   int    `json:"weight_audience"`
		WeightJudges     int    `json:"weight_judges"`
		WeightAdmin      int    `json:"weight_admin"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return usecase.ChallengeInput{}, false
	}
	input := usecase.ChallengeInput{
		Title:            in.Title,
		Description:      in.Description,
		Mode:             domain.ChallengeMode(in.Mode),
		AudioURL:         in.AudioURL,
		AudioTeacherName: in.AudioTeacherName,
		Capacity:         in.Capacity,
		DurationHours:    in.DurationHours,
		VotingHours:      in.VotingHours,
		WeightAudience:   in.WeightAudience,
		WeightJudges:     in.WeightJudges,
		WeightAdmin:      in.WeightAdmin,
	}
	return input, true
}

// AdminChallengeCreate handles POST /admin/challenges — فقط مدیر ادمین.
func (h *Handler) AdminChallengeCreate(c *gin.Context) {
	input, valid := challengeInputFromJSON(c)
	if !valid {
		return
	}
	ch, err := h.Challenge.Create(c.Request.Context(), userID(c), input)
	if err != nil {
		fail(c, err)
		return
	}
	created(c, ch)
}

// AdminChallengeList handles GET /admin/challenges.
func (h *Handler) AdminChallengeList(c *gin.Context) {
	items, err := h.Challenge.AdminList(c.Request.Context())
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, items)
}

// AdminChallengeDetail handles GET /admin/challenges/:id — چالش + همهٔ شرکت‌کنندگان.
func (h *Handler) AdminChallengeDetail(c *gin.Context) {
	detail, err := h.Challenge.AdminDetail(c.Request.Context(), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, detail)
}

// AdminChallengeUpdate handles PUT /admin/challenges/:id — فقط در ثبت‌نام.
func (h *Handler) AdminChallengeUpdate(c *gin.Context) {
	input, valid := challengeInputFromJSON(c)
	if !valid {
		return
	}
	ch, err := h.Challenge.Update(c.Request.Context(), paramID(c), input)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, ch)
}

// AdminChallengeDelete handles DELETE /admin/challenges/:id — فقط ثبت‌نامِ بدون عضو.
func (h *Handler) AdminChallengeDelete(c *gin.Context) {
	if err := h.Challenge.Delete(c.Request.Context(), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"deleted": true})
}

// AdminChallengeStart handles POST /admin/challenges/:id/start — آغاز دستوری.
func (h *Handler) AdminChallengeStart(c *gin.Context) {
	ch, err := h.Challenge.Start(c.Request.Context(), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, ch)
}

// AdminChallengeJudging handles POST /admin/challenges/:id/judging — ورود به داوری.
func (h *Handler) AdminChallengeJudging(c *gin.Context) {
	ch, err := h.Challenge.ToJudging(c.Request.Context(), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, ch)
}

// AdminChallengePublish handles POST /admin/challenges/:id/publish — اعلان نتایج.
func (h *Handler) AdminChallengePublish(c *gin.Context) {
	ch, err := h.Challenge.Publish(c.Request.Context(), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, ch)
}

// AdminChallengeSetScore handles PUT /admin/challenges/:id/participants/:pid/score
// — نظر مستقیم مدیریت ادمین (۰ تا ۱۰۰) برای یک اثر.
func (h *Handler) AdminChallengeSetScore(c *gin.Context) {
	var in struct {
		Score int `json:"score"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	pid, parseErr := parseUintParam(c.Param("pid"))
	if parseErr != nil {
		fail(c, domain.ErrValidation)
		return
	}
	p, err := h.Challenge.SetAdminScore(c.Request.Context(), paramID(c), pid, in.Score)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, p)
}

// AdminChallengeUpload handles POST /admin/challenge-upload — بارگذاری مقطع
// صوتی استاد معروف برای چالش (سخت‌افزاریِ فرمت با ValidateSessionMediaUpload).
func (h *Handler) AdminChallengeUpload(c *gin.Context) {
	header, err := c.FormFile("file")
	if err != nil || header == nil {
		fail(c, domain.ErrValidation)
		return
	}
	url, saveErr := saveChallengeAudio(header, fmt.Sprintf("chal_admin_u%d", userID(c)))
	if saveErr != nil {
		fail(c, saveErr)
		return
	}
	ok(c, gin.H{"url": url})
}

const challengeMediaDir = "uploads/challenge"

// ValidateChallengeAudioUpload گارد آپلود اثر چالش — فایل «اختیاری» است
// (ارسال فقط متنی هم مجاز است)؛ در صورت وجود فایل، بایت‌های واقعی با نقشهٔ
// sniff بررسی می‌شود تا فایلِ تغییرنام‌داده نتواند خودش را صوت جا بزند.
func ValidateChallengeAudioUpload(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !strings.HasPrefix(strings.ToLower(c.ContentType()), "multipart/") {
			c.Next()
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes+(1<<20))
		if err := c.Request.ParseMultipartForm(maxBytes); err != nil {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": "حجم فایل بیش از حد مجاز است (حداکثر ۵ مگابایت)"})
			return
		}
		header, err := c.FormFile("file")
		if err != nil {
			if err == http.ErrMissingFile {
				c.Next()
				return
			}
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "فایل پیوست معتبر نیست"})
			return
		}
		if header.Size <= 0 || header.Size > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": "حجم فایل باید حداکثر ۵ مگابایت باشد"})
			return
		}
		file, err := header.Open()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "خواندن فایل ممکن نیست"})
			return
		}
		buf := make([]byte, 512)
		n, readErr := io.ReadFull(file, buf)
		_ = file.Close()
		if readErr != nil && readErr != io.ErrUnexpectedEOF {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "فایل ناقص است"})
			return
		}
		mimeType := http.DetectContentType(buf[:n])
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext == ".oga" {
			ext = ".ogg"
		}
		validExtensions, ok := sessionMediaSniffs[mimeType]
		if !ok || !validExtensions[ext] {
			c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{
				"error": "فرمت اثر باید فایل صوتی (WebM/OGG/MP3/M4A/WAV) باشد",
			})
			return
		}
		c.Next()
	}
}

// saveChallengeAudio فایل صوتی را زیر uploads/challenge/ ذخیره و URL نسبیِ
// سروش‌دهی از مسیر StaticFS (/uploads) را برمی‌گرداند — همان الگوی پیام صوتی کلاس.
func saveChallengeAudio(header *multipart.FileHeader, prefix string) (string, error) {
	if err := os.MkdirAll(challengeMediaDir, 0o755); err != nil {
		return "", domain.ErrInternal
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == ".oga" {
		ext = ".ogg"
	}
	filename := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)
	savePath := filepath.Join(challengeMediaDir, filename)
	src, err := header.Open()
	if err != nil {
		return "", domain.ErrValidation
	}
	defer src.Close()
	dst, err := os.OpenFile(savePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return "", domain.ErrInternal
	}
	_, copyErr := io.Copy(dst, src)
	closeErr := dst.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(savePath)
		return "", domain.ErrInternal
	}
	return "/" + savePath, nil
}
