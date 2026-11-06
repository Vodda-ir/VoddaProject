// Package domain — reporting aggregates powering the advanced admin dashboard.
package domain

import (
	"context"
	"time"
)

// AnalyticsPoint is one UTC day of platform activity inside the reporting window.
type AnalyticsPoint struct {
	Date            string `json:"date"` // YYYY-MM-DD (UTC)
	NewUsers        int64  `json:"new_users"`
	NewTeachers     int64  `json:"new_teachers"`
	SessionsCreated int64  `json:"sessions_created"`
	SessionsDone    int64  `json:"sessions_done"`
	Charge          int64  `json:"charge"`
	Commission      int64  `json:"commission"`
}

// NamedCount is a label→count pair used by distribution charts.
type NamedCount struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// StatusCount is a status→count pair for lifecycle breakdowns.
type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

// TeacherRank is one entry of the top-teachers leaderboard.
type TeacherRank struct {
	ID           uint    `json:"id"`
	Name         string  `json:"name"`
	AvatarURL    string  `json:"avatar_url"`
	Field        string  `json:"field"`
	City         string  `json:"city"`
	Tier         string  `json:"tier"`
	Rating       float64 `json:"rating"`
	Reviews      int     `json:"reviews"`
	DoneSessions int64   `json:"done_sessions"`
	Earned       int64   `json:"earned"`
}

// RecentUser is a compact account row for activity feeds.
type RecentUser struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	Role      Role      `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// RecentSession is a compact booking row for activity feeds.
type RecentSession struct {
	ID            uint          `json:"id"`
	Title         string        `json:"title"`
	Status        SessionStatus `json:"status"`
	Price         int64         `json:"price"`
	ScheduledAt   time.Time     `json:"scheduled_at"`
	LearnerName   string        `json:"learner_name"`
	LearnerAvatar string        `json:"learner_avatar"`
	TeacherName   string        `json:"teacher_name"`
}

// AnalyticsUsers aggregates account counters for the KPI row.
type AnalyticsUsers struct {
	Total    int64 `json:"total"`
	Learners int64 `json:"learners"`
	Teachers int64 `json:"teachers"`
	Admins   int64 `json:"admins"`
	Active   int64 `json:"active"`
	NewWeek  int64 `json:"new_week"`
}

// AnalyticsSessions aggregates booking lifecycle counters.
type AnalyticsSessions struct {
	Total     int64 `json:"total"`
	Pending   int64 `json:"pending"`
	Confirmed int64 `json:"confirmed"`
	Done      int64 `json:"done"`
	Canceled  int64 `json:"canceled"`
	Rated     int64 `json:"rated"`
	Minutes   int64 `json:"minutes"`
}

// AnalyticsFinance aggregates the ledger for the money panel.
type AnalyticsFinance struct {
	ChargeVolume            int64 `json:"charge_volume"`
	Commission              int64 `json:"commission"`
	Earnings                int64 `json:"earnings"`
	WalletLiability         int64 `json:"wallet_liability"`
	PendingWithdrawals      int64 `json:"pending_withdrawals"`
	PendingWithdrawalAmount int64 `json:"pending_withdrawal_amount"`
}

// AnalyticsRating is the platform-wide review health.
type AnalyticsRating struct {
	Avg   float64 `json:"avg"`
	Count int64   `json:"count"`
}

// AnalyticsOverview is the full payload of GET /admin/analytics.
type AnalyticsOverview struct {
	Days            int               `json:"days"`
	Series          []AnalyticsPoint  `json:"series"`
	Users           AnalyticsUsers    `json:"users"`
	Sessions        AnalyticsSessions `json:"sessions"`
	Finance         AnalyticsFinance  `json:"finance"`
	Rating          AnalyticsRating   `json:"rating"`
	StatusBreakdown []StatusCount     `json:"status_breakdown"`
	Fields          []NamedCount      `json:"fields"`
	TopTeachers     []TeacherRank     `json:"top_teachers"`
	RecentUsers     []RecentUser      `json:"recent_users"`
	RecentSessions  []RecentSession   `json:"recent_sessions"`
}

// AdminAnalyticsRepository computes reporting aggregates with read-only queries.
type AdminAnalyticsRepository interface {
	Overview(ctx context.Context, days int) (*AnalyticsOverview, error)
}
