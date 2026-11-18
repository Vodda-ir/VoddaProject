package repository

import (
	"context"
	"database/sql"
	"time"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

// analyticsRepo computes admin reporting aggregates with read-only SQL.
// All timestamps are handled in UTC to match the DSN loc=UTC setting.
type analyticsRepo struct{ db *gorm.DB }

// NewAnalyticsRepository builds the combined domain.AnalyticsRepository.
func NewAnalyticsRepository(db *gorm.DB) domain.AnalyticsRepository { return &analyticsRepo{db: db} }

type dayRow struct {
	Date string
	N    int64
}

type sessionDayRow struct {
	Date    string
	N       int64
	Done    int64
	Minutes int64
}

type statusRow struct {
	Status string
	N      int64
}

type roleRow struct {
	Role string
	N    int64
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
		Raw("SELECT "+r.dayExpr()+" AS date, COUNT(*) AS n, "+
			"COALESCE(SUM(status = 'done'), 0) AS done "+
			"FROM sessions WHERE created_at >= ? GROUP BY date", start).Scan(&sessionDays).Error; err != nil {
		return nil, err
	}
	var chargeDays, commissionDays []dayRow
	if err := r.db.WithContext(ctx).
		Raw("SELECT "+r.dayExpr()+" AS date, COALESCE(SUM(amount), 0) AS n "+
			"FROM transactions WHERE type = ? AND created_at >= ? GROUP BY date",
			domain.TxCharge, start).Scan(&chargeDays).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw("SELECT "+r.dayExpr()+" AS date, COALESCE(ABS(SUM(amount)), 0) AS n "+
			"FROM transactions WHERE type = ? AND created_at >= ? GROUP BY date",
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
		Avg float64
		N   int64
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
		Raw("SELECT "+r.dayExpr()+" AS date, COUNT(*) AS n FROM "+table+
			" WHERE created_at >= ? GROUP BY date", start).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return dayMap(rows), nil
}

// dayExpr returns the dialect-specific expression that formats a timestamp
// column as YYYY-MM-DD (MySQL DATE_FORMAT vs SQLite strftime).
func (r *analyticsRepo) dayExpr() string {
	if r.db != nil && r.db.Dialector.Name() == "sqlite" {
		return "strftime('%Y-%m-%d', created_at)"
	}
	return "DATE_FORMAT(created_at, '%Y-%m-%d')"
}

// LearnerOverview assembles the personal analytics payload of one learner.
// Totals are all-time; the series covers the requested UTC window.
func (r *analyticsRepo) LearnerOverview(ctx context.Context, userID uint, days int) (*domain.LearnerAnalytics, error) {
	if days <= 0 {
		days = 30
	}
	if days > 90 {
		days = 90
	}
	start := time.Now().UTC().AddDate(0, 0, -(days - 1)).Truncate(24 * time.Hour)

	out := &domain.LearnerAnalytics{Days: days}

	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(wallet, 0) FROM users WHERE id = ?`, userID).
		Scan(&out.Wallet).Error; err != nil {
		return nil, err
	}

	// ── session lifecycle counters ──
	var statuses []statusRow
	if err := r.db.WithContext(ctx).
		Raw(`SELECT status, COUNT(*) AS n FROM sessions WHERE learner_id = ? GROUP BY status`, userID).
		Scan(&statuses).Error; err != nil {
		return nil, err
	}
	for _, row := range statuses {
		out.Totals.SessionsTotal += row.N
		switch domain.SessionStatus(row.Status) {
		case domain.SessionPending:
			out.Totals.Pending = row.N
		case domain.SessionConfirmed:
			out.Totals.Confirmed = row.N
		case domain.SessionDone:
			out.Totals.Done = row.N
		case domain.SessionCanceled:
			out.Totals.Canceled = row.N
		}
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COUNT(*) FROM sessions WHERE learner_id = ? AND rated = 1`, userID).
		Scan(&out.Totals.Rated).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(duration), 0) FROM sessions WHERE learner_id = ? AND status = ?`,
			userID, domain.SessionDone).Scan(&out.Totals.MinutesLearned).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COUNT(DISTINCT teacher_id) FROM sessions WHERE learner_id = ?`, userID).
		Scan(&out.Totals.TeachersCount).Error; err != nil {
		return nil, err
	}
	var nextAt sql.NullTime
	if err := r.db.WithContext(ctx).
		Raw(`SELECT MIN(scheduled_at) FROM sessions
		     WHERE learner_id = ? AND status IN (?, ?) AND scheduled_at >= ?`,
			userID, domain.SessionPending, domain.SessionConfirmed, time.Now().UTC()).
		Scan(&nextAt).Error; err != nil {
		return nil, err
	}
	if nextAt.Valid {
		next := nextAt.Time
		out.Totals.NextSessionAt = &next
	}

	// ── wallet ledger totals ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(ABS(SUM(amount)), 0) FROM transactions WHERE user_id = ? AND type = ?`,
			userID, domain.TxSession).Scan(&out.Totals.SpentTotal).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = ?`,
			userID, domain.TxCharge).Scan(&out.Totals.ChargedTotal).Error; err != nil {
		return nil, err
	}

	// ── per-day series ──
	var sessionDays []sessionDayRow
	if err := r.db.WithContext(ctx).
		Raw("SELECT "+r.dayExpr()+" AS date, COUNT(*) AS n, "+
			"COALESCE(SUM(status = ?), 0) AS done, "+
			"COALESCE(SUM(CASE WHEN status = ? THEN duration ELSE 0 END), 0) AS minutes "+
			"FROM sessions WHERE learner_id = ? AND created_at >= ? GROUP BY date",
			domain.SessionDone, domain.SessionDone, userID, start).Scan(&sessionDays).Error; err != nil {
		return nil, err
	}
	var spentDays, chargedDays []dayRow
	if err := r.db.WithContext(ctx).
		Raw("SELECT "+r.dayExpr()+" AS date, COALESCE(ABS(SUM(amount)), 0) AS n "+
			"FROM transactions WHERE user_id = ? AND type = ? AND created_at >= ? GROUP BY date",
			userID, domain.TxSession, start).Scan(&spentDays).Error; err != nil {
		return nil, err
	}
	if err := r.db.WithContext(ctx).
		Raw("SELECT "+r.dayExpr()+" AS date, COALESCE(SUM(amount), 0) AS n "+
			"FROM transactions WHERE user_id = ? AND type = ? AND created_at >= ? GROUP BY date",
			userID, domain.TxCharge, start).Scan(&chargedDays).Error; err != nil {
		return nil, err
	}

	sessionMap := make(map[string]learnerDay, len(sessionDays))
	for _, row := range sessionDays {
		sessionMap[row.Date] = learnerDay{N: row.N, Done: row.Done, Minutes: row.Minutes}
	}
	spentMap := dayMap(spentDays)
	chargedMap := dayMap(chargedDays)

	for i := 0; i < days; i++ {
		date := start.AddDate(0, 0, i).Format("2006-01-02")
		day := sessionMap[date]
		out.Series = append(out.Series, domain.LearnerPoint{
			Date:     date,
			Sessions: day.N,
			Done:     day.Done,
			Minutes:  day.Minutes,
			Spent:    spentMap[date],
			Charged:  chargedMap[date],
		})
	}

	// ── service distribution ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT COALESCE(NULLIF(title, ''), 'جلسه آموزشی') AS name, COUNT(*) AS n
		     FROM sessions WHERE learner_id = ? GROUP BY name ORDER BY n DESC LIMIT 6`, userID).
		Scan(&out.ByService).Error; err != nil {
		return nil, err
	}

	// ── my teachers ──
	if err := r.db.WithContext(ctx).
		Raw(`SELECT t.id, COALESCE(u.name, 'استاد') AS name, COALESCE(u.avatar_url, '') AS avatar_url,
			    t.field, t.rating, COUNT(s.id) AS sessions, MAX(s.created_at) AS last_at
		     FROM sessions s
		     JOIN teachers t ON t.id = s.teacher_id
		     JOIN users u ON u.id = t.user_id
		     WHERE s.learner_id = ?
		     GROUP BY t.id, u.name, u.avatar_url, t.field, t.rating
		     ORDER BY sessions DESC, last_at DESC
		     LIMIT 6`, userID).Scan(&out.Teachers).Error; err != nil {
		return nil, err
	}

	return out, nil
}

type learnerDay struct {
	N       int64
	Done    int64
	Minutes int64
}

func dayMap(rows []dayRow) map[string]int64 {
	m := make(map[string]int64, len(rows))
	for _, row := range rows {
		m[row.Date] = row.N
	}
	return m
}
