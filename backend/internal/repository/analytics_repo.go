package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

// analyticsRepo computes admin reporting aggregates with read-only SQL.
// All timestamps are handled in UTC to match the DSN loc=UTC setting.
type analyticsRepo struct{ db *gorm.DB }

// NewAnalyticsRepository builds a domain.AdminAnalyticsRepository.
func NewAnalyticsRepository(db *gorm.DB) domain.AdminAnalyticsRepository { return &analyticsRepo{db: db} }

type dayRow struct {
	Date string
	N    int64
}

type sessionDayRow struct {
	Date string
	N    int64
	Done int64
}

type statusRow struct {
	Status string
	N      int64
}

type roleRow struct {
	Role  string
	N     int64
}

// Overview assembles the whole analytics payload. Each block is independent:
// a partial failure aborts the response rather than publishing zero stats.
func (r *analyticsRepo) Overview(ctx context.Context, days int) (*domain.AnalyticsOverview, error) {
	if days <= 0 {
		days = 30
	}
	if days > 90 {
		days = 90
	}
	start := time.Now().UTC().AddDate(0, 0, -(days - 1)).Truncate(24 * time.Hour)
	weekAgo := time.Now().UTC().AddDate(0, 0, -7)

	out := &domain.AnalyticsOverview{Days: days}

	// ── per-day series ──
	usersByDay, err := r.countByDay(ctx, "users", start)
	if err != nil {
		return nil, err
	}
	teachersByDay, err := r.countByDay(ctx, "teachers", start)
	if err != nil {
		return nil, err
	}
	var sessionDays []sessionDayRow
	if err := r.db.WithContext(ctx).
		Raw(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS n,
		             COALESCE(SUM(status = 'done'), 0) AS done
		      FROM sessions WHERE created_at >= ? GROUP BY date`, start).Scan(&sessionDays).Error; err != nil {
		return nil, err
	}
	var chargeDays, commissionDays []dayRow
	if err := r.db.WithContext(ctx).
		Raw(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COALESCE(SUM(amount), 0) AS n
		     FROM transactions WHERE type = ? AND created_at >= ? GROUP BY date`,
			domain.TxCharge, start).Scan(&chargeDays).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COALESCE(ABS(SUM(amount)), 0) AS n
		     FROM transactions WHERE type = ? AND created_at >= ? GROUP BY date`,
			domain.TxCommission, start).Scan(&commissionDays).Error; err != nil {
		return nil, err
	}

	chargeMap := dayMap(chargeDays)
	commissionMap := dayMap(commissionDays)
	sessionCreatedMap := make(map[string]int64, len(sessionDays))
	sessionDoneMap := make(map[string]int64, len(sessionDays))
	for _, row := range sessionDays {
		sessionCreatedMap[row.Date] = row.N
		sessionDoneMap[row.Date] = row.Done
	}

	for i := 0; i < days; i++ {
		date := start.AddDate(0, 0, i).Format("2006-01-02")
		out.Series = append(out.Series, domain.AnalyticsPoint{
			Date:            date,
			NewUsers:        usersByDay[date],
			NewTeachers:     teachersByDay[date],
			SessionsCreated: sessionCreatedMap[date],
			SessionsDone:    sessionDoneMap[date],
			Charge:          chargeMap[date],
			Commission:      commissionMap[date],
		})
	}

	// ── users ──
	var roles []roleRow
	if err := r.db.WithContext(ctx).
		Raw(`SELECT role, COUNT(*) AS n FROM users GROUP BY role`).Scan(&roles).Error; err != nil {
		return nil, err
	}
	for _, row := range roles {
		out.Users.Total += row.N
		switch domain.Role(row.Role) {
		case domain.RoleLearner:
			out.Users.Learners = row.N
		case domain.RoleTeacher:
			out.Users.Teachers = row.N
		case domain.RoleAdmin:
			out.Users.Admins = row.N
		}
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COUNT(*) FROM users WHERE active = 1`).Scan(&out.Users.Active).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COUNT(*) FROM users WHERE created_at >= ?`, weekAgo).Scan(&out.Users.NewWeek).Error; err != nil {
		return nil, err
	}

	// ── sessions ──
	var statuses []statusRow
	if err := r.db.WithContext(ctx).
		Raw(`SELECT status, COUNT(*) AS n FROM sessions GROUP BY status`).Scan(&statuses).Error; err != nil {
		return nil, err
	}
	for _, row := range statuses {
		out.Sessions.Total += row.N
		out.StatusBreakdown = append(out.StatusBreakdown, domain.StatusCount{Status: row.Status, Count: row.N})
		switch domain.SessionStatus(row.Status) {
		case domain.SessionPending:
			out.Sessions.Pending = row.N
		case domain.SessionConfirmed:
			out.Sessions.Confirmed = row.N
		case domain.SessionDone:
			out.Sessions.Done = row.N
		case domain.SessionCanceled:
			out.Sessions.Canceled = row.N
		}
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COUNT(*) FROM sessions WHERE rated = 1`).Scan(&out.Sessions.Rated).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(duration), 0) FROM sessions WHERE status = ?`, domain.SessionDone).
		Scan(&out.Sessions.Minutes).Error; err != nil {
		return nil, err
	}

	// ── finance ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = ?`, domain.TxCharge).
		Scan(&out.Finance.ChargeVolume).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(ABS(SUM(amount)), 0) FROM transactions WHERE type = ?`, domain.TxCommission).
		Scan(&out.Finance.Commission).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(ABS(SUM(amount)), 0) FROM transactions WHERE type = ?`, domain.TxEarning).
		Scan(&out.Finance.Earnings).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(wallet), 0) FROM users`).Scan(&out.Finance.WalletLiability).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COUNT(*) FROM withdrawals WHERE status = ?`, domain.WithdrawalPending).
		Scan(&out.Finance.PendingWithdrawals).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = ?`, domain.WithdrawalPending).
		Scan(&out.Finance.PendingWithdrawalAmount).Error; err != nil {
		return nil, err
	}

	// ── reviews ──
	var ratingRow struct {
		Avg   float64
		N     int64
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS n FROM reviews`).
		Scan(&ratingRow).Error; err != nil {
		return nil, err
	}
	out.Rating.Avg = ratingRow.Avg
	out.Rating.Count = ratingRow.N

	// ── teacher field distribution ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(NULLIF(field, ''), 'سایر') AS name, COUNT(*) AS n
		     FROM teachers GROUP BY name ORDER BY n DESC LIMIT 8`).
		Scan(&out.Fields).Error; err != nil {
		return nil, err
	}

	// ── top teachers ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT t.id, u.name, COALESCE(u.avatar_url, '') AS avatar_url, t.field, t.city, t.tier,
		            t.rating, t.reviews, COUNT(s.id) AS done_sessions,
		            COALESCE(SUM(s.price), 0) AS earned
		     FROM teachers t
		     JOIN users u ON u.id = t.user_id
		     LEFT JOIN sessions s ON s.teacher_id = t.id AND s.status = 'done'
		     WHERE t.status = 'approved'
		     GROUP BY t.id, u.name, u.avatar_url, t.field, t.city, t.tier, t.rating, t.reviews
		     ORDER BY done_sessions DESC, t.rating DESC
		     LIMIT 8`).Scan(&out.TopTeachers).Error; err != nil {
		return nil, err
	}

	// ── recent activity ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT id, COALESCE(NULLIF(name, ''), 'کاربر') AS name, COALESCE(avatar_url, '') AS avatar_url,
		            role, created_at
		     FROM users ORDER BY created_at DESC LIMIT 6`).Scan(&out.RecentUsers).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT s.id, s.title, s.status, s.price, s.scheduled_at,
		            COALESCE(lu.name, 'قرآن‌آموز') AS learner_name, COALESCE(lu.avatar_url, '') AS learner_avatar,
		            COALESCE(tu.name, 'استاد') AS teacher_name
		     FROM sessions s
		     LEFT JOIN users lu ON lu.id = s.learner_id
		     LEFT JOIN teachers t ON t.id = s.teacher_id
		     LEFT JOIN users tu ON tu.id = t.user_id
		     ORDER BY s.created_at DESC LIMIT 6`).Scan(&out.RecentSessions).Error; err != nil {
		return nil, err
	}

	return out, nil
}

func (r *analyticsRepo) countByDay(ctx context.Context, table string, start time.Time) (map[string]int64, error) {
	var rows []dayRow
	if err := r.db.WithContext(ctx).
		Raw("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS n FROM " + table +
			" WHERE created_at >= ? GROUP BY date", start).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return dayMap(rows), nil
}

func dayMap(rows []dayRow) map[string]int64 {
	m := make(map[string]int64, len(rows))
	for _, row := range rows {
		m[row.Date] = row.N
	}
	return m
}
