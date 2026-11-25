package repository

import (
        "context"
        "errors"
        "strings"
        "time"

        "gorm.io/gorm"
        "gorm.io/gorm/clause"

        "vodda/backend/internal/domain"
)

// ── چالش‌ها ──

type challengeRepo struct{ db *gorm.DB }

// NewChallengeRepository builds a domain.ChallengeRepository.
func NewChallengeRepository(db *gorm.DB) domain.ChallengeRepository { return &challengeRepo{db: db} }

func mapChallengeErr(err error) error {
        if errors.Is(err, gorm.ErrRecordNotFound) {
                return domain.ErrNotFound
        }
        return err
}

func (r *challengeRepo) Create(ctx context.Context, ch *domain.Challenge) error {
        return r.db.WithContext(ctx).Create(ch).Error
}

func (r *challengeRepo) Update(ctx context.Context, ch *domain.Challenge) error {
        return r.db.WithContext(ctx).Save(ch).Error
}

// ApplyStatusUpdate نوشتن فیلدهای چرخهٔ عمر (آغاز، داوری، اعلان) بدون دست‌زدن
// به ستون‌های دیگر؛ map خالی یعنی فقط وضعیت.
func (r *challengeRepo) ApplyStatusUpdate(ctx context.Context, ch *domain.Challenge, updates map[string]any) error {
        updates["status"] = string(ch.Status)
        updates["updated_at"] = time.Now()
        return r.db.WithContext(ctx).Model(&domain.Challenge{}).Where("id = ?", ch.ID).Updates(updates).Error
}

func (r *challengeRepo) Delete(ctx context.Context, id uint) error {
        return r.db.WithContext(ctx).Delete(&domain.Challenge{}, id).Error
}

func (r *challengeRepo) ByID(ctx context.Context, id uint) (*domain.Challenge, error) {
        var ch domain.Challenge
        err := r.db.WithContext(ctx).First(&ch, id).Error
        if err != nil {
                return nil, mapChallengeErr(err)
        }
        return &ch, nil
}

func (r *challengeRepo) List(ctx context.Context, f domain.ChallengeFilter) ([]domain.Challenge, int64, error) {
        if f.Limit <= 0 || f.Limit > 100 {
                f.Limit = 30
        }
        if f.Offset < 0 {
                f.Offset = 0
        }
        q := r.db.WithContext(ctx).Model(&domain.Challenge{})
        if !f.All && f.Status != "" {
                q = q.Where("status = ?", f.Status)
        }
        if !f.All && f.Status == "" {
                q = q.Where("status IN ?", domain.PublicChallengeStatuses)
        }
        var total int64
        if err := q.Count(&total).Error; err != nil {
                return nil, 0, err
        }
        var challenges []domain.Challenge
        err := q.Order("created_at desc").Limit(f.Limit).Offset(f.Offset).Find(&challenges).Error
        return challenges, total, err
}

func (r *challengeRepo) CountByStatus(ctx context.Context) (map[domain.ChallengeStatus]int64, error) {
        var rows []struct {
                Status domain.ChallengeStatus
                Total  int64
        }
        err := r.db.WithContext(ctx).Model(&domain.Challenge{}).
                Select("status, COUNT(*) as total").
                Group("status").Scan(&rows).Error
        if err != nil {
                return nil, err
        }
        counts := make(map[domain.ChallengeStatus]int64, len(rows))
        for _, row := range rows {
                counts[row.Status] = row.Total
        }
        return counts, nil
}

// JoinChallenge با یک تراکنش: عضویت یگانه، سقف ظرفیت و آغاز خودکار چالش
// هنگام تکمیل ظرفیت. اگر عضویت باعث گذر از ظرفیت شود (مسابقهٔ آخرین صندلی)،
// درجِ خود تراکنش پس گرفته می‌شود تا ظرفیت هرگز سوراخ نشود.
func (r *challengeRepo) JoinChallenge(ctx context.Context, challengeID, userID uint, now time.Time) (*domain.Challenge, *domain.ChallengeParticipant, bool, error) {
        var joined *domain.Challenge
        var participant *domain.ChallengeParticipant
        started := false
        err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
                var ch domain.Challenge
                if err := tx.First(&ch, challengeID).Error; err != nil {
                        return mapChallengeErr(err)
                }
                if ch.Status != domain.ChallengeRegistration {
                        return domain.ErrChallengePhase
                }
                var existing domain.ChallengeParticipant
                dupErr := tx.Where("challenge_id = ? AND user_id = ?", challengeID, userID).First(&existing).Error
                if dupErr == nil {
                        return domain.ErrChallengeAlreadyJoined
                }
                if !errors.Is(dupErr, gorm.ErrRecordNotFound) {
                        return dupErr
                }
                var count int64
                if err := tx.Model(&domain.ChallengeParticipant{}).Where("challenge_id = ?", challengeID).Count(&count).Error; err != nil {
                        return err
                }
                if int(count) >= ch.Capacity {
                        return domain.ErrChallengeCapacity
                }
                p := &domain.ChallengeParticipant{ChallengeID: challengeID, UserID: userID, Status: domain.ChallengeJoined}
                if err := tx.Create(p).Error; err != nil {
                        return err
                }
                count++
                if int(count) > ch.Capacity {
                        // آخرین صندلی را نفر دیگری هم‌زمان گرفت؛ عضویت خود را پس بگیر.
                        if delErr := tx.Delete(p).Error; delErr != nil {
                                return delErr
                        }
                        return domain.ErrChallengeCapacity
                }
                if int(count) == ch.Capacity {
                        // تکمیل ظرفیت → آغاز خودکار چالش با مهلت ارسال اثر.
                        deadline := now.Add(time.Duration(ch.DurationHours) * time.Hour)
                        ch.Status = domain.ChallengeActive
                        ch.StartedAt = &now
                        ch.SubmissionDeadline = &deadline
                        if err := tx.Model(&domain.Challenge{}).Where("id = ?", ch.ID).Updates(map[string]any{
                                "status":              string(ch.Status),
                                "started_at":          now,
                                "submission_deadline": deadline,
                                "updated_at":          now,
                        }).Error; err != nil {
                                return err
                        }
                        started = true
                }
                joined = &ch
                participant = p
                return nil
        })
        if err != nil {
                return nil, nil, false, err
        }
        return joined, participant, started, nil
}

func (r *challengeRepo) ParticipantCount(ctx context.Context, challengeID uint) (int64, error) {
        var count int64
        err := r.db.WithContext(ctx).Model(&domain.ChallengeParticipant{}).
                Where("challenge_id = ?", challengeID).Count(&count).Error
        return count, err
}

func (r *challengeRepo) Participants(ctx context.Context, challengeID uint) ([]domain.ChallengeParticipant, error) {
        var rows []domain.ChallengeParticipant
        err := r.db.WithContext(ctx).Preload("User").
                Where("challenge_id = ?", challengeID).
                Order("created_at asc").Find(&rows).Error
        return rows, err
}

func (r *challengeRepo) ParticipantByID(ctx context.Context, challengeID, participantID uint) (*domain.ChallengeParticipant, error) {
        var p domain.ChallengeParticipant
        err := r.db.WithContext(ctx).Preload("User").
                Where("challenge_id = ? AND id = ?", challengeID, participantID).First(&p).Error
        if err != nil {
                return nil, mapChallengeErr(err)
        }
        return &p, nil
}

func (r *challengeRepo) ParticipantForUser(ctx context.Context, challengeID, userID uint) (*domain.ChallengeParticipant, error) {
        var p domain.ChallengeParticipant
        err := r.db.WithContext(ctx).
                Where("challenge_id = ? AND user_id = ?", challengeID, userID).First(&p).Error
        if err != nil {
                return nil, mapChallengeErr(err)
        }
        return &p, nil
}

func (r *challengeRepo) UpdateParticipant(ctx context.Context, p *domain.ChallengeParticipant) error {
        return r.db.WithContext(ctx).Save(p).Error
}

func (r *challengeRepo) AddVote(ctx context.Context, v *domain.ChallengeVote) error {
        v.CreatedAt = time.Now()
        err := r.db.WithContext(ctx).Create(v).Error
        if err != nil && isDuplicateKeyError(err) {
                return domain.ErrChallengeDuplicateVote
        }
        return err
}

// isDuplicateKeyError خطای یکتایی را در هر دو موتور MySQL و SQLite تشخیص می‌دهد
// (شاخص یکتای idx_challenge_votes_unique، دو رأی یک کاربر به یک اثر را می‌بندد).
func isDuplicateKeyError(err error) bool {
        if err == nil {
                return false
        }
        msg := err.Error()
        return strings.Contains(msg, "Duplicate entry") ||
                strings.Contains(msg, "UNIQUE constraint failed") ||
                strings.Contains(msg, "duplicate key value")
}

// VoteCounts شمارش رأی‌های هر اثر به تفکیک رأی مخاطب و رأی استاد داور.
func (r *challengeRepo) VoteCounts(ctx context.Context, challengeID uint) ([]domain.ChallengeVoteCount, error) {
        var rows []domain.ChallengeVoteCount
        err := r.db.WithContext(ctx).Model(&domain.ChallengeVote{}).
                Select("participant_id, " +
                        "SUM(CASE WHEN is_judge THEN 1 ELSE 0 END) as judge, " +
                        "SUM(CASE WHEN is_judge = 0 THEN 1 ELSE 0 END) as audience").
                Where("challenge_id = ?", challengeID).
                Group("participant_id").Scan(&rows).Error
        return rows, err
}

func (r *challengeRepo) MyVotes(ctx context.Context, challengeID, voterID uint) ([]uint, error) {
        var ids []uint
        err := r.db.WithContext(ctx).Model(&domain.ChallengeVote{}).
                Where("challenge_id = ? AND voter_id = ?", challengeID, voterID).
                Pluck("participant_id", &ids).Error
        return ids, err
}

// ── امتیاز اینستاقرآن ──

type pointRepo struct{ db *gorm.DB }

// NewPointRepository builds a domain.PointRepository.
func NewPointRepository(db *gorm.DB) domain.PointRepository { return &pointRepo{db: db} }

// Grant تغییر امتیاز را در یک تراکنش ثبت می‌کند: بالانس با UPSERT اتمیک
// به‌روز می‌شود و ردیف دفتر با موجودیِ پس از عملیات نوشته می‌شود.
func (r *pointRepo) Grant(ctx context.Context, userID uint, amount int, reason string, refID uint) (int, error) {
        var balanceAfter int
        err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
                if err := tx.Clauses(clause.OnConflict{
                        Columns:   []clause.Column{{Name: "user_id"}},
                        DoUpdates: clause.Assignments(map[string]any{"balance": gorm.Expr("point_balances.balance + ?", amount), "updated_at": time.Now()}),
                }).Create(&domain.PointBalance{UserID: userID, Balance: amount}).Error; err != nil {
                        return err
                }
                var bal domain.PointBalance
                if err := tx.Where("user_id = ?", userID).First(&bal).Error; err != nil {
                        return err
                }
                balanceAfter = bal.Balance
                return tx.Create(&domain.PointLedger{
                        UserID: userID, Amount: amount, BalanceAfter: balanceAfter,
                        Reason: reason, RefID: refID,
                }).Error
        })
        if err != nil {
                return 0, err
        }
        return balanceAfter, nil
}

func (r *pointRepo) Balance(ctx context.Context, userID uint) (int, error) {
        var bal domain.PointBalance
        err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&bal).Error
        if errors.Is(err, gorm.ErrRecordNotFound) {
                return 0, nil
        }
        if err != nil {
                return 0, err
        }
        return bal.Balance, nil
}

func (r *pointRepo) Ledger(ctx context.Context, userID uint, limit, offset int) ([]domain.PointLedger, error) {
        if limit <= 0 || limit > 200 {
                limit = 50
        }
        if offset < 0 {
                offset = 0
        }
        var rows []domain.PointLedger
        err := r.db.WithContext(ctx).
                Where("user_id = ?", userID).
                Order("created_at desc, id desc").Limit(limit).Offset(offset).Find(&rows).Error
        return rows, err
}
