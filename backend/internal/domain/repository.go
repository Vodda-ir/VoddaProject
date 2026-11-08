package domain

import "context"

// TeacherFilter narrows teacher listing/search queries.
type TeacherFilter struct {
	Query      string
	Field      string
	City       string
	Female     *bool
	Status     TeacherStatus
	PublicOnly bool
	Limit      int
	Offset     int
}

// UserListFilter narrows the admin account listing.
type UserListFilter struct {
	Role   Role
	Query  string
	Active *bool
	Limit  int
	Offset int
}

// UserRepository persists accounts.
type UserRepository interface {
	Create(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	ByID(ctx context.Context, id uint) (*User, error)
	ByMobile(ctx context.Context, mobile string) (*User, error)
	List(ctx context.Context, f UserListFilter) ([]User, int64, error)
	AddWallet(ctx context.Context, userID uint, delta int64) error
	Count(ctx context.Context, role Role) (int64, error)
}

// TeacherOnboardingRepository performs profile creation and role promotion in a
// single database transaction.
type TeacherOnboardingRepository interface {
	CreateTeacherProfile(ctx context.Context, userID uint, teacher *Teacher) error
}

// TeacherRepository persists teacher profiles and their sub-resources.
type TeacherRepository interface {
	Create(ctx context.Context, t *Teacher) error
	Update(ctx context.Context, t *Teacher) error
	ByID(ctx context.Context, id uint) (*Teacher, error)
	ByUserID(ctx context.Context, userID uint) (*Teacher, error)
	List(ctx context.Context, f TeacherFilter) ([]Teacher, int64, error)
	RecomputeRating(ctx context.Context, teacherID uint) error
	Count(ctx context.Context, status TeacherStatus) (int64, error)

	AddService(ctx context.Context, s *Service) error
	UpdateService(ctx context.Context, s *Service) error
	DeleteService(ctx context.Context, teacherID, serviceID uint) error
	ServiceByID(ctx context.Context, id uint) (*Service, error)

	OfficialServices(ctx context.Context) ([]OfficialService, error)
	OfficialServiceByID(ctx context.Context, id uint) (*OfficialService, error)
	OfficialServiceByTitle(ctx context.Context, title string) (*OfficialService, error)

	SetWorkTimes(ctx context.Context, teacherID uint, wt []WorkTime) error
	WorkTimes(ctx context.Context, teacherID uint) ([]WorkTime, error)
	AddWorkTime(ctx context.Context, wt *WorkTime) error
	UpdateWorkTime(ctx context.Context, wt *WorkTime) error
	DeleteWorkTime(ctx context.Context, teacherID, workTimeID uint) error

	ListPendingServices(ctx context.Context) ([]Service, error)
}

// SessionRepository persists bookings/sessions.
type SessionRepository interface {
	Create(ctx context.Context, s *Session) error
	Update(ctx context.Context, s *Session) error
	ByID(ctx context.Context, id uint) (*Session, error)
	ForLearner(ctx context.Context, learnerID uint, when string) ([]Session, error)
	ForTeacher(ctx context.Context, teacherID uint, statuses []SessionStatus) ([]Session, error)
	List(ctx context.Context, status SessionStatus, limit, offset int) ([]Session, int64, error)
	Count(ctx context.Context, status SessionStatus) (int64, error)
}

// ReviewRepository persists ratings.
type ReviewRepository interface {
	Create(ctx context.Context, r *Review) error
	ForTeacher(ctx context.Context, teacherID uint) ([]Review, error)
	ForLearner(ctx context.Context, learnerID uint, limit int) ([]Review, error)
	Stats(ctx context.Context, teacherID uint) (avg float64, count int, err error)
	ListAll(ctx context.Context, limit, offset int) ([]Review, int64, error)
	ByID(ctx context.Context, id uint) (*Review, error)
}

// ReviewTransactionRepository atomically creates a review, marks its session
// rated, refreshes the teacher aggregate, and removes reviews with full
// aggregate repair.
type ReviewTransactionRepository interface {
	RateCompletedSession(ctx context.Context, learnerID uint, review *Review) error
	DeleteReview(ctx context.Context, reviewID uint) error
}

// WalletSums aggregates a user's signed ledger by type for the admin user
// detail view. Values are raw sums of the amount column per transaction kind.
type WalletSums struct {
	Charge     int64 `json:"charge"`
	Session    int64 `json:"session"`
	Earning    int64 `json:"earning"`
	Withdrawal int64 `json:"withdrawal"`
	Commission int64 `json:"commission"`
	Adjust     int64 `json:"adjust"`
}

// WalletRepository persists transactions and withdrawals.
type WalletRepository interface {
	AddTx(ctx context.Context, t *Transaction) error
	Transactions(ctx context.Context, userID uint, limit, offset int) ([]Transaction, error)
	SumsForUser(ctx context.Context, userID uint) (WalletSums, error)
	CreateWithdrawal(ctx context.Context, w *Withdrawal) error
	UpdateWithdrawal(ctx context.Context, w *Withdrawal) error
	WithdrawalByID(ctx context.Context, id uint) (*Withdrawal, error)
	Withdrawals(ctx context.Context, status WithdrawalStatus, limit, offset int) ([]Withdrawal, int64, error)
	WithdrawalsForUser(ctx context.Context, userID uint) ([]Withdrawal, error)
	SumByType(ctx context.Context, t TxType) (int64, error)
}

// OTPRepository persists one-time code digests.
type OTPRepository interface {
	Create(ctx context.Context, c *OTPCode) error
	Latest(ctx context.Context, mobile string) (*OTPCode, error)
	Consume(ctx context.Context, id uint) error
}

// NotificationRepository persists in-app notifications.
type NotificationRepository interface {
	Create(ctx context.Context, n *Notification) error
	ForUser(ctx context.Context, userID uint, limit int) ([]Notification, error)
	MarkRead(ctx context.Context, userID, id uint) error
}

// SupportMessageRepository persists public contact requests.
type SupportMessageRepository interface {
	Create(ctx context.Context, message *SupportMessage) error
	List(ctx context.Context, status SupportMessageStatus, limit, offset int) ([]SupportMessage, int64, error)
	Resolve(ctx context.Context, id uint) error
}

// AdminAuditRepository persists privileged action logs.
type AdminAuditRepository interface {
	Create(ctx context.Context, entry *AdminAuditLog) error
	List(ctx context.Context, limit, offset int) ([]AdminAuditLog, int64, error)
}

// SettingRepository persists platform configuration key/value pairs.
type SettingRepository interface {
	All(ctx context.Context) (map[string]string, error)
	SetMany(ctx context.Context, values map[string]string) error
}

// PostFilter narrows blog article listing queries.
type PostFilter struct {
	Query    string
	Category string
	Status   PostStatus
	Public   bool
	Limit    int
	Offset   int
}

// PostRepository persists blog articles.
type PostRepository interface {
	Create(ctx context.Context, p *Post) error
	Update(ctx context.Context, p *Post) error
	Delete(ctx context.Context, id uint) error
	ByID(ctx context.Context, id uint) (*Post, error)
	BySlug(ctx context.Context, slug string) (*Post, error)
	SlugTaken(ctx context.Context, slug string, excludeID uint) (bool, error)
	List(ctx context.Context, f PostFilter) ([]Post, int64, error)
	IncrementViews(ctx context.Context, id uint) error
	Stats(ctx context.Context) (total, published, drafts int64, views int64, err error)
	Categories(ctx context.Context) ([]string, error)
}

// PaymentOrderFilter narrows admin-facing gateway order queries.
type PaymentOrderFilter struct {
	UserID uint
	Status PaymentStatus
	Limit  int
	Offset int
}

// PaymentOrderStore persists gateway payment orders (wallet top-ups and
// future product purchases). Settlement money-moves live in FinancialRepository
// so balance, ledger and lifecycle updates stay atomic.
type PaymentOrderStore interface {
	Create(ctx context.Context, o *PaymentOrder) error
	ByResNum(ctx context.Context, resNum string) (*PaymentOrder, error)
	ByID(ctx context.Context, id uint) (*PaymentOrder, error)
	RecentForUser(ctx context.Context, userID uint, limit int) ([]PaymentOrder, error)
	List(ctx context.Context, f PaymentOrderFilter) ([]PaymentOrder, int64, error)
}
