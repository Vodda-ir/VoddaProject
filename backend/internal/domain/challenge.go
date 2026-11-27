package domain

import (
	"context"
	"time"
)

// ChallengeMode چیدمان محتوای چالش:
//   - audio       — برگزاری یک مقطع صوتی از اساتید معروف به‌عنوان مبنای چالش
//   - description — بدون بارگذاری صوت؛ فقط با توضیح خواستهٔ مدیر
type ChallengeMode string

const (
	ChallengeModeAudio       ChallengeMode = "audio"
	ChallengeModeDescription ChallengeMode = "description"
)

// ChallengeStatus چرخهٔ عمر چالش:
//
//	registration (ثبت‌نام) → active (در حال اجرا؛ مهلت ارسال اثر) →
//	judging (رأی‌گیری مخاطبان و اساتید داور) → finished (اعلان نتایج و کارنامه).
//
// رسیدن شمار شرکت‌کنندگان به ظرفیت ثبت‌نام، چالش را به‌طور خودکار به active می‌برد.
type ChallengeStatus string

const (
	ChallengeRegistration ChallengeStatus = "registration"
	ChallengeActive       ChallengeStatus = "active"
	ChallengeJudging      ChallengeStatus = "judging"
	ChallengeFinished     ChallengeStatus = "finished"
	ChallengeCanceled     ChallengeStatus = "canceled"
)

// PublicChallengeStatuses چالش‌های قابل نمایش به کاربران عادی.
var PublicChallengeStatuses = []ChallengeStatus{
	ChallengeRegistration,
	ChallengeActive,
	ChallengeJudging,
	ChallengeFinished,
}

// ParticipantStatus وضعیت اثر شرکت‌کننده.
type ParticipantStatus string

const (
	ChallengeJoined    ParticipantStatus = "joined"
	ChallengeSubmitted ParticipantStatus = "submitted"
)

// دلایل ثبت امتیاز در دفتر اینستاقرآن (PointLedger.reason).
const (
	PointReasonChallengeJoin       = "challenge_join"
	PointReasonChallengeJoinRefund = "challenge_join_refund"
	PointReasonChallengeRank       = "challenge_rank"
	PointReasonAdminGrant          = "admin_grant"
)

// پاداش امتیاز اینستاقرآن — شرکت در چالش و رتبه‌های ۱ تا ۵.
const (
	PointsChallengeJoin = 10
	PointsRankFirst     = 100
	PointsRankSecond    = 70
	PointsRankThird     = 50
	PointsRankFourth    = 30
	PointsRankFifth     = 20
)

// RankBonusPoints پاداش امتیازی هر رتبه (۰ برای بیرون از سه‌رتبهٔ اول تا پنجم).
func RankBonusPoints(rank uint) int {
	switch rank {
	case 1:
		return PointsRankFirst
	case 2:
		return PointsRankSecond
	case 3:
		return PointsRankThird
	case 4:
		return PointsRankFourth
	case 5:
		return PointsRankFifth
	}
	return 0
}

// Challenge یک رقابت قرآنی که فقط مدیر ادمین آن را می‌سازد.
type Challenge struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	Title       string        `gorm:"size:160" json:"title"`
	Description string        `gorm:"type:text" json:"description"`
	Mode        ChallengeMode `gorm:"size:16;default:description" json:"mode"`
	// AudioURL مقطع صوتی استاد معروف (فقط برای حالت audio) — زیر /uploads/challenge/.
	AudioURL         string `gorm:"size:255;default:''" json:"audio_url"`
	AudioTeacherName string `gorm:"size:120;default:''" json:"audio_teacher_name"`
	// Capacity ظرفیت ثبت‌نام؛ رسیدن به آن چالش را خودکار آغاز می‌کند.
	Capacity int `json:"capacity"`
	// DurationHours مهلت ارسال اثر پس از آغاز (ساعت).
	DurationHours int `json:"duration_hours"`
	// VotingHours مهلت رأی‌گیری پس از ورود به مرحلهٔ داوری (ساعت).
	VotingHours int `json:"voting_hours"`
	// وزن‌های سه منبع مستقل امتیازدهی (مجموعشان ۱۰۰ فرض می‌شود).
	WeightAudience     int             `json:"weight_audience"`
	WeightJudges       int             `json:"weight_judges"`
	WeightAdmin        int             `json:"weight_admin"`
	Status             ChallengeStatus `gorm:"size:16;default:registration;index" json:"status"`
	StartedAt          *time.Time      `gorm:"index" json:"started_at,omitempty"`
	SubmissionDeadline *time.Time      `json:"submission_deadline,omitempty"`
	VotingDeadline     *time.Time      `json:"voting_deadline,omitempty"`
	PublishedAt        *time.Time      `json:"published_at,omitempty"`
	CreatedBy          uint            `json:"created_by"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// ChallengeParticipant یک شرکت‌کنندهٔ چالش و اثر ثبت‌شدهٔ او.
type ChallengeParticipant struct {
	ID                 uint              `gorm:"primaryKey" json:"id"`
	ChallengeID        uint              `gorm:"uniqueIndex:idx_challenge_participant_unique;index" json:"challenge_id"`
	UserID             uint              `gorm:"uniqueIndex:idx_challenge_participant_unique;index" json:"user_id"`
	Status             ParticipantStatus `gorm:"size:16;default:joined" json:"status"`
	SubmissionText     string            `gorm:"size:2000;default:''" json:"submission_text"`
	SubmissionAudioURL string            `gorm:"size:255;default:''" json:"submission_audio_url"`
	SubmittedAt        *time.Time        `json:"submitted_at,omitempty"`
	// AdminScore نظر مستقیم مدیریت ادمین (۰ تا ۱۰۰) — منبع سوم امتیازدهی.
	AdminScore int `gorm:"default:0" json:"admin_score"`
	// مقادیر نهایی هنگام اعلان نتایج ثبت می‌شوند (کارنامهٔ همیشه‌در دسترس).
	AudienceVotes int       `gorm:"default:0" json:"audience_votes"`
	JudgeVotes    int       `gorm:"default:0" json:"judge_votes"`
	AudienceScore float64   `gorm:"default:0" json:"audience_score"`
	JudgeScore    float64   `gorm:"default:0" json:"judge_score"`
	FinalScore    float64   `gorm:"default:0" json:"final_score"`
	Rank          uint      `gorm:"default:0;index" json:"rank"`
	PointsJoin    int       `gorm:"default:0" json:"points_join"`
	PointsBonus   int       `gorm:"default:0" json:"points_bonus"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ChallengeVote یک رأی در مرحلهٔ داوری. نقش رأی‌دهنده هنگام رأی ثبت می‌شود:
// اساتید داور (role=teacher) رأیشان جداگانه شمرده می‌شود؛ بقیه رأی مخاطب‌اند.
type ChallengeVote struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ChallengeID   uint      `gorm:"index" json:"challenge_id"`
	ParticipantID uint      `gorm:"uniqueIndex:idx_challenge_votes_unique;index" json:"participant_id"`
	VoterID       uint      `gorm:"uniqueIndex:idx_challenge_votes_unique;index" json:"voter_id"`
	IsJudge       bool      `gorm:"default:false;index" json:"is_judge"`
	CreatedAt     time.Time `json:"created_at"`
}

// PointBalance موجودی جاری امتیاز اینستاقرآن یک کاربر.
type PointBalance struct {
	UserID    uint      `gorm:"primaryKey" json:"user_id"`
	Balance   int       `gorm:"default:0" json:"balance"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PointLedger دفتر امتیاز اینستاقرآن — هر تغییر با موجودی پس از عملیات.
type PointLedger struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index" json:"user_id"`
	Amount       int       `json:"amount"`
	BalanceAfter int       `json:"balance_after"`
	Reason       string    `gorm:"size:40;index" json:"reason"`
	RefID        uint      `gorm:"default:0;index" json:"ref_id"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}

// ChallengeVoteCount شمارش رأی‌های یک اثر به تفکیک مخاطب/داور.
type ChallengeVoteCount struct {
	ParticipantID uint `json:"participant_id"`
	Audience      int  `json:"audience"`
	Judge         int  `json:"judge"`
}

// ChallengeFilter نرمال‌سازی پرس‌وجوی فهرست چالش.
type ChallengeFilter struct {
	All    bool // ادمین: همهٔ وضعیت‌ها حتی لغوشده
	Status ChallengeStatus
	Limit  int
	Offset int
}

// ChallengeRepository نگه‌داری چالش‌ها، شرکت‌کنندگان و رأی‌ها.
type ChallengeRepository interface {
	Create(ctx context.Context, ch *Challenge) error
	Update(ctx context.Context, ch *Challenge) error
	ApplyStatusUpdate(ctx context.Context, ch *Challenge, updates map[string]any) error
	Delete(ctx context.Context, id uint) error
	ByID(ctx context.Context, id uint) (*Challenge, error)
	List(ctx context.Context, f ChallengeFilter) ([]Challenge, int64, error)
	CountByStatus(ctx context.Context) (map[ChallengeStatus]int64, error)

	// PurgeParticipants همهٔ شرکت‌کنندگان و رأی‌های یک چالش را با یک تراکنش حذف
	// می‌کند — مقدمهٔ حذف کامل چالش در ثبت‌نام یا پاک‌سازی چالش لغوشده.
	PurgeParticipants(ctx context.Context, challengeID uint) error

	// JoinChallenge با یک تراکنش: عضویت یگانه، سقف ظرفیت و آغاز خودکار
	// چالش هنگام تکمیل ظرفیت. مقدار started فقط برای اعلان است.
	JoinChallenge(ctx context.Context, challengeID, userID uint, now time.Time) (ch *Challenge, participant *ChallengeParticipant, started bool, err error)

	ParticipantCount(ctx context.Context, challengeID uint) (int64, error)
	Participants(ctx context.Context, challengeID uint) ([]ChallengeParticipant, error)
	ParticipantByID(ctx context.Context, challengeID, participantID uint) (*ChallengeParticipant, error)
	ParticipantForUser(ctx context.Context, challengeID, userID uint) (*ChallengeParticipant, error)
	UpdateParticipant(ctx context.Context, p *ChallengeParticipant) error

	// AddVote یک رأی ثبت می‌کند؛ تکرار (آرا یکسان) خطای ErrConflict می‌دهد.
	AddVote(ctx context.Context, v *ChallengeVote) error
	VoteCounts(ctx context.Context, challengeID uint) ([]ChallengeVoteCount, error)
	MyVotes(ctx context.Context, challengeID, voterID uint) ([]uint, error)
}

// PointRepository دفتر امتیاز اینستاقرآن.
type PointRepository interface {
	// Grant افزایش/کاهش امتیاز با ثبت در دفتر؛ موجودی پس از عملیات را برمی‌گرداند.
	Grant(ctx context.Context, userID uint, amount int, reason string, refID uint) (int, error)
	Balance(ctx context.Context, userID uint) (int, error)
	Ledger(ctx context.Context, userID uint, limit, offset int) ([]PointLedger, error)
}
