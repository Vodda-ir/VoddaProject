package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
)

func (h *Handler) AdminDashboard(c *gin.Context) {
	dashboard, err := h.Admin.Dashboard(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, dashboard)
}

// AdminAnalytics serves the reporting payload of the advanced dashboard.
func (h *Handler) AdminAnalytics(c *gin.Context) {
	overview, err := h.Admin.Analytics(c, queryInt(c, "days", 30))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, overview)
}

func (h *Handler) AdminUsers(c *gin.Context) {
	filter := domain.UserListFilter{
		Role:   domain.Role(c.Query("role")),
		Query:  c.Query("q"),
		Limit:  queryInt(c, "limit", 30),
		Offset: queryInt(c, "offset", 0),
	}
	switch c.Query("active") {
	case "true", "1":
		active := true
		filter.Active = &active
	case "false", "0":
		active := false
		filter.Active = &active
	case "":
	default:
		fail(c, domain.ErrValidation)
		return
	}
	users, total, err := h.Admin.ListUsers(c, filter)
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, users, total)
}

// AdminUserDetail serves the advanced user drill-down payload.
func (h *Handler) AdminUserDetail(c *gin.Context) {
	detail, err := h.Admin.UserDetail(c, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, detail)
}

// AdminNotifyUser sends an in-app notification on behalf of the platform team.
func (h *Handler) AdminNotifyUser(c *gin.Context) {
	var in struct {
		Title string `json:"title" binding:"required"`
		Body  string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	if err := h.Admin.NotifyUser(c, paramID(c), in.Title, in.Body); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"sent": true})
}

func (h *Handler) AdminSetUserActive(c *gin.Context) {
	var in struct {
		Active *bool `json:"active" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Active == nil {
		fail(c, domain.ErrValidation)
		return
	}
	if paramID(c) == userID(c) && !*in.Active {
		fail(c, domain.ErrConflict)
		return
	}
	if err := h.Admin.SetUserActive(c, paramID(c), *in.Active); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"active": *in.Active})
}

func (h *Handler) AdminTeachers(c *gin.Context) {
	filter := domain.TeacherFilter{
		Status: domain.TeacherStatus(c.Query("status")),
		Query:  c.Query("q"),
		Field:  c.Query("field"),
		City:   c.Query("city"),
		Limit:  queryInt(c, "limit", 30),
		Offset: queryInt(c, "offset", 0),
	}
	if value := c.Query("female"); value != "" {
		if value != "true" && value != "false" && value != "1" && value != "0" {
			fail(c, domain.ErrValidation)
			return
		}
		female := value == "true" || value == "1"
		filter.Female = &female
	}

	teachers, total, err := h.Admin.ListTeachersFiltered(c, filter)
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, teachers, total)
}

func (h *Handler) AdminReviewTeacher(c *gin.Context) {
	var in struct {
		Approve *bool `json:"approve" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Approve == nil {
		fail(c, domain.ErrValidation)
		return
	}
	teacher, err := h.Admin.ReviewTeacher(c, paramID(c), *in.Approve)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, teacher)
}

// AdminTeacherSettings updates the verified badge and quality tier markers.
func (h *Handler) AdminTeacherSettings(c *gin.Context) {
	var in struct {
		Verified *bool   `json:"verified"`
		Tier     *string `json:"tier"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || (in.Verified == nil && in.Tier == nil) {
		fail(c, domain.ErrValidation)
		return
	}
	teacher, err := h.Admin.SetTeacherModeration(c, paramID(c), in.Verified, in.Tier)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, teacher)
}

func (h *Handler) AdminSessions(c *gin.Context) {
	sessions, total, err := h.Admin.ListSessions(c, domain.SessionStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, sessions, total)
}

func (h *Handler) AdminWithdrawals(c *gin.Context) {
	withdrawals, total, err := h.Admin.ListWithdrawals(c, domain.WithdrawalStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, withdrawals, total)
}

func (h *Handler) AdminProcessWithdrawal(c *gin.Context) {
	var in struct {
		Paid *bool `json:"paid" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Paid == nil {
		fail(c, domain.ErrValidation)
		return
	}
	withdrawal, err := h.Wallet.ProcessWithdrawal(c, paramID(c), *in.Paid)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, withdrawal)
}

func (h *Handler) AdminServices(c *gin.Context) {
	services, err := h.Admin.ListPendingServices(c)
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, services, int64(len(services)))
}

func (h *Handler) AdminApproveService(c *gin.Context) {
	if err := h.Admin.ApproveService(c, paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"approved": true})
}

func (h *Handler) AdminRejectService(c *gin.Context) {
	if err := h.Admin.RejectService(c, paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"rejected": true})
}

// AdminReviews lists platform-wide reviews for moderation.
func (h *Handler) AdminReviews(c *gin.Context) {
	reviews, total, err := h.Admin.ListReviews(c, queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, reviews, total)
}

// AdminDeleteReview removes a review and repairs teacher aggregates.
func (h *Handler) AdminDeleteReview(c *gin.Context) {
	if err := h.Admin.DeleteReview(c, paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"deleted": true})
}

// AdminSetUserRole changes an account role.
func (h *Handler) AdminSetUserRole(c *gin.Context) {
	var in struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	user, err := h.Admin.SetUserRole(c, userID(c), paramID(c), domain.Role(in.Role))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, user)
}

// AdminAdjustWallet applies a signed manual wallet move.
func (h *Handler) AdminAdjustWallet(c *gin.Context) {
	var in struct {
		Amount int64  `json:"amount" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	if err := h.Admin.AdjustWallet(c, paramID(c), in.Amount, in.Reason); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"adjusted": true})
}

// AdminGetSettings returns effective platform settings.
func (h *Handler) AdminGetSettings(c *gin.Context) {
	settings, err := h.Admin.GetSettings(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, settings)
}

// AdminUpdateSettings validates and stores platform settings.
func (h *Handler) AdminUpdateSettings(c *gin.Context) {
	var in struct {
		Settings map[string]string `json:"settings" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Settings == nil {
		fail(c, domain.ErrValidation)
		return
	}
	settings, err := h.Admin.UpdateSettings(c, in.Settings)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, settings)
}

// AdminSummary returns pending-work counters for the notification bell.
func (h *Handler) AdminSummary(c *gin.Context) {
	summary, err := h.Admin.Summary(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, summary)
}

// PublicSettings exposes the whitelisted platform settings to the public site.
func (h *Handler) PublicSettings(c *gin.Context) {
	settings, err := h.Admin.GetSettings(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, settings)
}

// CatalogServices exposes the official, platform-approved service catalog.
// Teachers must pick one of these entries when publishing a bookable service.
func (h *Handler) CatalogServices(c *gin.Context) {
	rows, err := h.Teacher.ListOfficialServices(c)
	if err != nil {
		fail(c, err)
		return
	}
	// mode=in_person returns a flat array (presence catalog clients);
	// the default grouped shape stays untouched for the online flow.
	if mode := c.Query("mode"); mode == "in_person" || mode == "online" {
		flat := make([]gin.H, 0, len(rows))
		for _, row := range rows {
			if row.Mode != mode || !row.Active {
				continue
			}
			flat = append(flat, gin.H{
				"id": row.ID, "category": row.Category, "title": row.Title,
				"description": row.Description, "icon": row.Icon, "mode": row.Mode,
				"requires_audio": row.RequiresAudio, "group_capable": row.GroupCapable,
			})
		}
		ok(c, flat)
		return
	}
	grouped := make([]gin.H, 0, 8)
	order := make([]string, 0, 8)
	byCategory := make(map[string][]gin.H, 8)
	for _, row := range rows {
		entry := gin.H{
			"id":          row.ID,
			"title":       row.Title,
			"description": row.Description,
			"icon":        row.Icon,
		}
		if _, seen := byCategory[row.Category]; !seen {
			order = append(order, row.Category)
		}
		byCategory[row.Category] = append(byCategory[row.Category], entry)
	}
	for _, category := range order {
		grouped = append(grouped, gin.H{"category": category, "services": byCategory[category]})
	}
	ok(c, gin.H{"categories": grouped, "total": len(rows)})
}

// FreeServices exposes the public «خدمات رایگان» board: every active
// zero-price service of a public, approved, verified and available teacher.
func (h *Handler) FreeServices(c *gin.Context) {
	rows, err := h.Teacher.ListFreeServices(c, queryInt(c, "limit", 20))
	if err != nil {
		fail(c, err)
		return
	}
	if rows == nil {
		rows = []domain.FreeServiceCard{}
	}
	okList(c, rows, int64(len(rows)))
}
