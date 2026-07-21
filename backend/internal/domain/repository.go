package domain

import "context"

// TeacherFilter narrows teacher listing/search queries.
type TeacherFilter struct {
	Query  string
	Field  string
	City   string
	Female *bool
	Status TeacherStatus
	Limit  int
	Offset int
}

// UserRepository persists accounts.
type UserRepository interface {
	Create(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	ByID(ctx context.Context, id uint) (*User, error)
	ByMobile(ctx context.Context, mobile string) (*User, error)
	List(ctx context.Context, role Role, limit, offset int) ([]User, int64, error)
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
	Stats(ctx context.Context, teacherID uint) (avg float64, count int, err error)
}

// ReviewTransactionRepository atomically creates a review, marks its session
// rated, and refreshes the teacher aggregate.
type ReviewTransactionRepository interface {
	RateCompletedSession(ctx context.Context, learnerID uint, review *Review) error
}

// WalletRepository persists transactions and withdrawals.
type WalletRepository interface {
	AddTx(ctx context.Context, t *Transaction) error
	Transactions(ctx context.Context, userID uint, limit, offset int) ([]Transaction, error)
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
