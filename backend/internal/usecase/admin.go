package usecase

import (
	"context"
	"sort"
	"strings"
	"time"

	"vodda/backend/internal/domain"
)

// validTeacherTiers mirrors the badge set used by the learner-facing UI.
var validTeacherTiers = map[string]bool{"": true, "international": true, "grade2": true, "grade3": true}

// AdminUsecase powers the admin panel: moderation and reporting.
type AdminUsecase struct {
	users       domain.UserRepository
	teachers    domain.TeacherRepository
	sessions    domain.SessionRepository
	wallet      domain.WalletRepository
	notif       domain.NotificationRepository
	analytics   domain.AdminAnalyticsRepository
	reviewRepo  domain.ReviewRepository
	reviewTx    domain.ReviewTransactionRepository
	financial   domain.FinancialRepository
	support     domain.SupportMessageRepository
	supportChat domain.SupportChatRepository
	settings    domain.SettingRepository
}

// AdminExtendedDeps carries the optional admin dependencies added with the
// advanced panel (reviews, wallet moves, support counters, platform settings).
type AdminExtendedDeps struct {
	ReviewRepo  domain.ReviewRepository
	ReviewTx    domain.ReviewTransactionRepository
	Financial   domain.FinancialRepository
	Support     domain.SupportMessageRepository
	SupportChat domain.SupportChatRepository
	Settings    domain.SettingRepository
}

// NewAdminUsecase builds an AdminUsecase. The variadic tail keeps the original
// six-argument call sites compiling while production wiring passes the extended
// dependencies.
func NewAdminUsecase(u domain.UserRepository, t domain.TeacherRepository, s domain.SessionRepository, w domain.WalletRepository, n domain.NotificationRepository, a domain.AdminAnalyticsRepository, extended ...AdminExtendedDeps) *AdminUsecase {
	uc := &AdminUsecase{users: u, teachers: t, sessions: s, wallet: w, notif: n, analytics: a}
	if len(extended) > 0 {
		uc.reviewRepo = extended[0].ReviewRepo
		uc.reviewTx = extended[0].ReviewTx
		uc.financial = extended[0].Financial
		uc.support = extended[0].Support
		uc.supportChat = extended[0].SupportChat
		uc.settings = extended[0].Settings
	}
	return uc
}

// Dashboard aggregates headline metrics for the admin home.
type Dashboard struct {
	Learners        int64 `json:"learners"`
	Teachers        int64 `json:"teachers"`
	PendingTeachers int64 `json:"pending_teachers"`
	Sessions        int64 `json:"sessions"`
	DoneSessions    int64 `json:"done_sessions"`
	ChargeVolume    int64 `json:"charge_volume"`
	Commission      int64 `json:"commission"`
}

// Dashboard computes the admin dashboard metrics. Reporting errors are returned
// instead of silently publishing partially-zero statistics.
func (uc *AdminUsecase) Dashboard(ctx context.Context) (*Dashboard, error) {
	d := &Dashboard{}
	var err error

	if d.Learners, err = uc.users.Count(ctx, domain.RoleLearner); err != nil {
		return nil, err
	}
	if d.Teachers, err = uc.teachers.Count(ctx, ""); err != nil {
		return nil, err
	}
	if d.PendingTeachers, err = uc.teachers.Count(ctx, domain.TeacherPending); err != nil {
		return nil, err
	}
	if d.Sessions, err = uc.sessions.Count(ctx, ""); err != nil {
		return nil, err
	}
	if d.DoneSessions, err = uc.sessions.Count(ctx, domain.SessionDone); err != nil {
		return nil, err
	}
	if d.ChargeVolume, err = uc.wallet.SumByType(ctx, domain.TxCharge); err != nil {
		return nil, err
	}
	if d.Commission, err = uc.wallet.SumByType(ctx, domain.TxCommission); err != nil {
		return nil, err
	}
	// Commission ledger entries are stored as negative deductions from the teacher.
	if d.Commission < 0 {
		d.Commission = -d.Commission
	}
	return d, nil
}

// Analytics returns the reporting payload for the admin dashboard.
func (uc *AdminUsecase) Analytics(ctx context.Context, days int) (*domain.AnalyticsOverview, error) {
	return uc.analytics.Overview(ctx, days)
}

// ListUsers returns paginated accounts, optionally by role and free-text search.
func (uc *AdminUsecase) ListUsers(ctx context.Context, f domain.UserListFilter) ([]domain.User, int64, error) {
	return uc.users.List(ctx, f)
}

// SetUserActive toggles account access.
func (uc *AdminUsecase) SetUserActive(ctx context.Context, id uint, active bool) error {
	u, err := uc.users.ByID(ctx, id)
	if err != nil {
		return err
	}
	u.Active = active
	return uc.users.Update(ctx, u)
}

// AdminUserSessionStats summarizes a user's bookings from both angles.
type AdminUserSessionStats struct {
	AsLearner   int64 `json:"as_learner"`
	LearnerDone int64 `json:"learner_done"`
	AsTeacher   int64 `json:"as_teacher"`
	TeacherDone int64 `json:"teacher_done"`
	Upcoming    int64 `json:"upcoming"`
}

// AdminUserDetail is the drill-down payload of the advanced user panel.
type AdminUserDetail struct {
	User         *domain.User          `json:"user"`
	Stats        AdminUserSessionStats `json:"stats"`
	Sums         domain.WalletSums     `json:"sums"`
	Transactions []domain.Transaction  `json:"transactions"`
	Sessions     []domain.Session      `json:"sessions"`
	Reviews      []domain.Review       `json:"reviews"`
	ReviewsCount int64                 `json:"reviews_count"`
}

// UserDetail assembles the full operational picture of one account: profile,
// teacher profile, session counters, wallet aggregates and recent activity.
func (uc *AdminUsecase) UserDetail(ctx context.Context, id uint) (*AdminUserDetail, error) {
	user, err := uc.users.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	detail := &AdminUserDetail{User: user, Sessions: []domain.Session{}, Transactions: []domain.Transaction{}, Reviews: []domain.Review{}}

	learnerSessions, err := uc.sessions.ForLearner(ctx, user.ID, "")
	if err != nil {
		return nil, err
	}
	detail.Stats.AsLearner = int64(len(learnerSessions))
	merged := make([]domain.Session, 0, len(learnerSessions)+8)
	seen := map[uint]bool{}
	for _, s := range learnerSessions {
		detail.Stats.LearnerDone += boolToInt(s.Status == domain.SessionDone)
		detail.Stats.Upcoming += boolToInt(s.Status == domain.SessionPending || s.Status == domain.SessionConfirmed)
		if !seen[s.ID] {
			seen[s.ID] = true
			merged = append(merged, s)
		}
	}

	if user.Teacher != nil {
		teacherSessions, err := uc.sessions.ForTeacher(ctx, user.Teacher.ID, nil)
		if err != nil {
			return nil, err
		}
		detail.Stats.AsTeacher = int64(len(teacherSessions))
		for _, s := range teacherSessions {
			detail.Stats.TeacherDone += boolToInt(s.Status == domain.SessionDone)
			detail.Stats.Upcoming += boolToInt(s.Status == domain.SessionPending || s.Status == domain.SessionConfirmed)
			if !seen[s.ID] {
				seen[s.ID] = true
				merged = append(merged, s)
			}
		}

		reviews, err := uc.reviewRepo.ForTeacher(ctx, user.Teacher.ID)
		if err != nil {
			return nil, err
		}
		detail.Reviews = reviews
		detail.ReviewsCount = int64(len(reviews))
	}

	if uc.reviewRepo != nil {
		written, err := uc.reviewRepo.ForLearner(ctx, user.ID, 8)
		if err != nil {
			return nil, err
		}
		// written reviews only enrich the received list when the account has
		// no teacher profile (otherwise the received list is already shown).
		if user.Teacher == nil {
			detail.Reviews = written
			detail.ReviewsCount = int64(len(written))
		}
	}

	sort.Slice(merged, func(i, j int) bool {
		return merged[i].ScheduledAt.After(merged[j].ScheduledAt)
	})
	if len(merged) > 10 {
		merged = merged[:10]
	}
	detail.Sessions = merged

	transactions, err := uc.wallet.Transactions(ctx, user.ID, 12, 0)
	if err != nil {
		return nil, err
	}
	detail.Transactions = transactions

	if uc.wallet == nil {
		return detail, nil
	}
	sums, err := uc.wallet.SumsForUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	detail.Sums = sums
	return detail, nil
}

// NotifyUser delivers an in-app notification written by an administrator.
func (uc *AdminUsecase) NotifyUser(ctx context.Context, userID uint, title, body string) error {
	if _, err := uc.users.ByID(ctx, userID); err != nil {
		return err
	}
	title = strings.TrimSpace(title)
	body = strings.TrimSpace(body)
	if title == "" || body == "" {
		return domain.ErrValidation
	}
	if len([]rune(title)) > 160 {
		title = string([]rune(title)[:160])
	}
	if len([]rune(body)) > 500 {
		body = string([]rune(body)[:500])
	}
	return uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}

func boolToInt(b bool) int64 {
	if b {
		return 1
	}
	return 0
}

// ListTeachers returns teachers filtered by status.
func (uc *AdminUsecase) ListTeachers(ctx context.Context, status domain.TeacherStatus, limit, offset int) ([]domain.Teacher, int64, error) {
	return uc.ListTeachersFiltered(ctx, domain.TeacherFilter{Status: status, Limit: limit, Offset: offset})
}

// ListTeachersFiltered powers the operational teacher directory in the admin
// panel. It deliberately reuses the repository filter contract so search,
// city, field, gender and moderation status are applied server-side.
func (uc *AdminUsecase) ListTeachersFiltered(ctx context.Context, filter domain.TeacherFilter) ([]domain.Teacher, int64, error) {
	return uc.teachers.List(ctx, filter)
}

// ReviewTeacher approves or rejects a pending teacher profile.
func (uc *AdminUsecase) ReviewTeacher(ctx context.Context, id uint, approve bool) (*domain.Teacher, error) {
	t, err := uc.teachers.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if t.Status != domain.TeacherPending {
		return nil, domain.ErrConflict
	}
	if approve {
		t.Status = domain.TeacherApproved
		t.Verified = true
	} else {
		t.Status = domain.TeacherRejected
		t.Verified = false
	}
	if err := uc.teachers.Update(ctx, t); err != nil {
		return nil, err
	}
	if approve {
		uc.notify(ctx, t.UserID, "پروفایل تأیید شد", "پروفایل استادی شما تأیید و منتشر شد.")
	} else {
		uc.notify(ctx, t.UserID, "پروفایل رد شد", "پروفایل استادی شما تأیید نشد.")
	}
	return t, nil
}

// ListSessions returns paginated sessions filtered by status.
func (uc *AdminUsecase) ListSessions(ctx context.Context, status domain.SessionStatus, limit, offset int) ([]domain.Session, int64, error) {
	return uc.sessions.List(ctx, status, limit, offset)
}

// SetTeacherModeration updates the public trust markers of an approved teacher:
// the verified checkmark and the quality tier badge. nil fields stay unchanged.
func (uc *AdminUsecase) SetTeacherModeration(ctx context.Context, id uint, verified *bool, tier *string) (*domain.Teacher, error) {
	if tier != nil && !validTeacherTiers[*tier] {
		return nil, domain.ErrValidation
	}
	t, err := uc.teachers.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if verified != nil {
		t.Verified = *verified
	}
	if tier != nil {
		t.Tier = *tier
	}
	if err := uc.teachers.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// ListWithdrawals returns payout requests filtered by status.
func (uc *AdminUsecase) ListWithdrawals(ctx context.Context, status domain.WithdrawalStatus, limit, offset int) ([]domain.Withdrawal, int64, error) {
	return uc.wallet.Withdrawals(ctx, status, limit, offset)
}

func (uc *AdminUsecase) ListPendingServices(ctx context.Context) ([]domain.Service, error) {
	return uc.teachers.ListPendingServices(ctx)
}

func (uc *AdminUsecase) ApproveService(ctx context.Context, serviceID uint) error {
	s, err := uc.teachers.ServiceByID(ctx, serviceID)
	if err != nil {
		return err
	}
	if s.Active {
		return domain.ErrConflict
	}
	s.Active = true
	if err := uc.teachers.UpdateService(ctx, s); err != nil {
		return err
	}
	uc.notifyTeacher(ctx, s.TeacherID, "خدمت تأیید شد", "خدمت «"+s.Title+"» توسط ادمین تأیید شد.")
	return nil
}

func (uc *AdminUsecase) RejectService(ctx context.Context, serviceID uint) error {
	s, err := uc.teachers.ServiceByID(ctx, serviceID)
	if err != nil {
		return err
	}
	if s.Active {
		return domain.ErrConflict
	}
	if err := uc.teachers.DeleteService(ctx, s.TeacherID, serviceID); err != nil {
		return err
	}
	uc.notifyTeacher(ctx, s.TeacherID, "خدمت رد شد", "خدمت «"+s.Title+"» توسط ادمین رد شد.")
	return nil
}

func (uc *AdminUsecase) notifyTeacher(ctx context.Context, teacherID uint, title, body string) {
	teacher, err := uc.teachers.ByID(ctx, teacherID)
	if err != nil {
		return
	}
	uc.notify(ctx, teacher.UserID, title, body)
}

func (uc *AdminUsecase) notify(ctx context.Context, userID uint, title, body string) {
	if userID == 0 {
		return
	}
	_ = uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}

// AdminReviewRow is the moderation-friendly projection of a review: it bundles
// the learner author and the reviewed teacher's display name in one payload so
// the admin table does not need extra lookups.
type AdminReviewRow struct {
	ID            uint      `json:"id"`
	SessionID     uint      `json:"session_id"`
	TeacherID     uint      `json:"teacher_id"`
	Rating        int       `json:"rating"`
	Text          string    `json:"text"`
	CreatedAt     time.Time `json:"created_at"`
	LearnerID     uint      `json:"learner_id"`
	LearnerName   string    `json:"learner_name"`
	LearnerAvatar string    `json:"learner_avatar"`
	TeacherName   string    `json:"teacher_name"`
	TeacherField  string    `json:"teacher_field"`
}

// ListReviews returns the newest reviews across the platform for moderation.
func (uc *AdminUsecase) ListReviews(ctx context.Context, limit, offset int) ([]AdminReviewRow, int64, error) {
	if uc.reviewRepo == nil {
		return nil, 0, domain.ErrNotFound
	}
	reviews, total, err := uc.reviewRepo.ListAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	rows := make([]AdminReviewRow, 0, len(reviews))
	teacherCache := map[uint]*domain.Teacher{}
	for _, review := range reviews {
		row := AdminReviewRow{
			ID:        review.ID,
			SessionID: review.SessionID,
			TeacherID: review.TeacherID,
			Rating:    review.Rating,
			Text:      review.Text,
			CreatedAt: review.CreatedAt,
		}
		if review.Learner != nil {
			row.LearnerID = review.Learner.ID
			row.LearnerName = review.Learner.Name
			row.LearnerAvatar = review.Learner.AvatarURL
		}
		teacher, cached := teacherCache[review.TeacherID]
		if !cached {
			teacher, _ = uc.teachers.ByID(ctx, review.TeacherID)
			teacherCache[review.TeacherID] = teacher
		}
		if teacher != nil {
			row.TeacherField = teacher.Field
			if teacher.User != nil {
				row.TeacherName = teacher.User.Name
			}
		}
		rows = append(rows, row)
	}
	return rows, total, nil
}

// DeleteReview removes an abusive/invalid review, reopens the session for a
// fresh rating and repairs the teacher aggregate atomically.
func (uc *AdminUsecase) DeleteReview(ctx context.Context, reviewID uint) error {
	if uc.reviewTx == nil {
		return domain.ErrNotFound
	}
	if err := uc.reviewTx.DeleteReview(ctx, reviewID); err != nil {
		return err
	}
	if review, err := uc.reviewRepo.ByID(ctx, reviewID); err == nil && review != nil {
		uc.notify(ctx, review.LearnerID, "نظر شما حذف شد", "نظر ثبت‌شده شما توسط تیم مدیریت حذف شد.")
	}
	return nil
}

// SetUserRole changes an account role. Admins cannot change their own role to
// keep at least one reachable administrator in the system.
func (uc *AdminUsecase) SetUserRole(ctx context.Context, actorID, targetID uint, role domain.Role) (*domain.User, error) {
	switch role {
	case domain.RoleLearner, domain.RoleTeacher, domain.RoleAdmin:
	default:
		return nil, domain.ErrValidation
	}
	if actorID == targetID {
		return nil, domain.ErrConflict
	}
	user, err := uc.users.ByID(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if user.Role == role {
		return user, nil
	}
	user.Role = role
	if err := uc.users.Update(ctx, user); err != nil {
		return nil, err
	}
	uc.notify(ctx, user.ID, "نقش حساب به‌روزرسانی شد", "نقش حساب شما توسط تیم مدیریت تغییر کرد.")
	return user, nil
}

// AdjustWallet moves a signed amount into/out of a user wallet and writes a
// signed ledger row. reason is embedded in the transaction title for audit.
func (uc *AdminUsecase) AdjustWallet(ctx context.Context, userID uint, amount int64, reason string) error {
	if uc.financial == nil {
		return domain.ErrNotFound
	}
	if amount == 0 {
		return domain.ErrValidation
	}
	title := "تعدیل دستی توسط مدیریت"
	if trimmed := strings.TrimSpace(reason); trimmed != "" {
		if len(trimmed) > 120 {
			trimmed = trimmed[:120]
		}
		title = title + " · " + trimmed
	}
	return uc.financial.AdminAdjustWallet(ctx, userID, amount, title)
}

// Platform settings: whitelisted keys only, safe to expose publicly.
var settingDefaults = map[string]string{
	"support_email":        "info@vodda.app",
	"support_phone":        "",
	"instagram":            "",
	"telegram":             "",
	"whatsapp":             "",
	"announcement_text":    "",
	"announcement_link":    "",
	"announcement_on":      "false",
	"about_short":          "وُدّا، پلتفرم آنلاین آموزش قرآن کریم با استادان تأییدشده.",
	"google_client_id":     "",
	"google_client_secret": "",
	"google_redirect_uri":  "https://api.vodda.ir/api/v1/auth/google/callback",
	// بیگ‌بلوباتن — URL و Secret اشتراک کلاس آنلاین؛ مقادیر از حساب کاربری
	// بیگ‌بلوباتن ایران (مدیریت جلسات ← تنظیمات) اینجا ثبت می‌شود و
	// Secret فقط پوشانده‌شده برمی‌گردد.
	"bbb_api_url":       "",
	"bbb_shared_secret": "",
}

var settingWhitelist = map[string]bool{}
var settingMaxValue = map[string]int{
	"support_email": 120, "support_phone": 40, "instagram": 120, "telegram": 120,
	"whatsapp": 120, "announcement_text": 300, "announcement_link": 300,
	"announcement_on": 8, "about_short": 400,
	"google_client_id": 220, "google_client_secret": 220, "google_redirect_uri": 300,
	"bbb_api_url": 300, "bbb_shared_secret": 300,
}

// settingSecrets are stored but never returned verbatim by GET /admin/settings;
// the client sends the sentinel back to keep the stored value untouched.
const settingsSecretMask = "••••••••"

var settingSecrets = map[string]bool{
	"google_client_secret": true,
	"bbb_shared_secret":    true,
}

func init() {
	for key := range settingDefaults {
		settingWhitelist[key] = true
	}
}

// AdminSettings is the merged view of defaults and stored overrides.
type AdminSettings struct {
	Settings map[string]string `json:"settings"`
}

// GetSettings returns the effective platform settings (defaults + overrides).
func (uc *AdminUsecase) GetSettings(ctx context.Context) (*AdminSettings, error) {
	merged := make(map[string]string, len(settingDefaults))
	for key, value := range settingDefaults {
		merged[key] = value
	}
	if uc.settings != nil {
		stored, err := uc.settings.All(ctx)
		if err != nil {
			return nil, err
		}
		for key, value := range stored {
			if settingWhitelist[key] {
				if settingSecrets[key] && value != "" {
					value = settingsSecretMask
				}
				merged[key] = value
			}
		}
	}
	for key := range settingSecrets {
		if merged[key] == "" {
			merged[key] = ""
		}
	}
	return &AdminSettings{Settings: merged}, nil
}

// UpdateSettings validates and stores whitelisted settings.
func (uc *AdminUsecase) UpdateSettings(ctx context.Context, values map[string]string) (*AdminSettings, error) {
	if uc.settings == nil {
		return nil, domain.ErrNotFound
	}
	clean := make(map[string]string, len(values))
	for key, value := range values {
		if !settingWhitelist[key] {
			return nil, domain.ErrValidation
		}
		if settingSecrets[key] && value == settingsSecretMask {
			continue // masked value round-tripped from GET — keep stored secret
		}
		value = strings.TrimSpace(value)
		if maxLen, ok := settingMaxValue[key]; ok && len([]rune(value)) > maxLen {
			return nil, domain.ErrValidation
		}
		if key == "support_email" && value != "" && !strings.Contains(value, "@") {
			return nil, domain.ErrValidation
		}
		if key == "announcement_on" && value != "true" && value != "false" {
			return nil, domain.ErrValidation
		}
		clean[key] = value
	}
	if len(clean) == 0 {
		return uc.GetSettings(ctx)
	}
	if err := uc.settings.SetMany(ctx, clean); err != nil {
		return nil, err
	}
	return uc.GetSettings(ctx)
}

// AdminSummary holds the pending-work counters that drive the admin
// notification bell and operational badges.
type AdminSummary struct {
	PendingTeachers    int64 `json:"pending_teachers"`
	PendingServices    int64 `json:"pending_services"`
	PendingWithdrawals int64 `json:"pending_withdrawals"`
	NewSupport         int64 `json:"new_support"`
	OpenTickets        int64 `json:"open_tickets"`
}

// Total sums all pending counters for badge display.
func (s *AdminSummary) Total() int64 {
	return s.PendingTeachers + s.PendingServices + s.PendingWithdrawals + s.NewSupport + s.OpenTickets
}

// Summary computes real-time pending-work counters for the admin panel.
func (uc *AdminUsecase) Summary(ctx context.Context) (*AdminSummary, error) {
	summary := &AdminSummary{}
	var err error

	if summary.PendingTeachers, err = uc.teachers.Count(ctx, domain.TeacherPending); err != nil {
		return nil, err
	}

	services, err := uc.teachers.ListPendingServices(ctx)
	if err != nil {
		return nil, err
	}
	summary.PendingServices = int64(len(services))

	if _, summary.PendingWithdrawals, err = uc.wallet.Withdrawals(ctx, domain.WithdrawalPending, 1, 0); err != nil {
		return nil, err
	}

	if uc.support != nil {
		if _, summary.NewSupport, err = uc.support.List(ctx, domain.SupportMessageNew, 1, 0); err != nil {
			return nil, err
		}
	}

	// تیکت‌های زندهٔ پشتیبانی که منتظر پاسخ کارشناس‌اند (باز یا در انتظار).
	if uc.supportChat != nil {
		var openCount, pendingCount int64
		openCount, err = uc.supportChat.CountByStatus(ctx, domain.TicketOpen)
		if err != nil {
			return nil, err
		}
		pendingCount, err = uc.supportChat.CountByStatus(ctx, domain.TicketPending)
		if err != nil {
			return nil, err
		}
		summary.OpenTickets = openCount + pendingCount
	}
	return summary, nil
}
