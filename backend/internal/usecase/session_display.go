package usecase

import (
	"context"
	"time"

	"vodda/backend/internal/domain"
)

// SessionDisplay keeps the canonical UTC timestamp while adding the official
// business-timezone values that clients should render. This avoids displaying
// a different clock time when the browser or device uses another timezone.
type SessionDisplay struct {
	domain.Session
	LocalDate  string `json:"local_date"`
	LocalStart string `json:"local_start"`
	LocalEnd   string `json:"local_end"`
	Weekday    int    `json:"weekday"`
}

func (uc *SessionUsecase) sessionDisplay(session domain.Session, location *time.Location) SessionDisplay {
	local := session.ScheduledAt.In(location)
	return SessionDisplay{
		Session:    session,
		LocalDate:  local.Format("2006-01-02"),
		LocalStart: local.Format("15:04"),
		LocalEnd:   local.Add(time.Duration(session.Duration) * time.Minute).Format("15:04"),
		Weekday:    (int(local.Weekday()) + 1) % 7,
	}
}

func (uc *SessionUsecase) displayLocation() (*time.Location, error) {
	if uc.cfg == nil || uc.cfg.AppTimezone == "" {
		return nil, domain.ErrValidation
	}
	return time.LoadLocation(uc.cfg.AppTimezone)
}

func (uc *SessionUsecase) displaySessions(sessions []domain.Session) ([]SessionDisplay, error) {
	location, err := uc.displayLocation()
	if err != nil {
		return nil, err
	}
	result := make([]SessionDisplay, 0, len(sessions))
	for _, session := range sessions {
		result = append(result, uc.sessionDisplay(session, location))
	}
	return result, nil
}

// LearnerSessionDisplays lists learner sessions with official local date/time.
func (uc *SessionUsecase) LearnerSessionDisplays(ctx context.Context, learnerID uint, when string) ([]SessionDisplay, error) {
	sessions, err := uc.sessions.ForLearner(ctx, learnerID, when)
	if err != nil {
		return nil, err
	}
	return uc.displaySessions(sessions)
}

// TeacherSessionDisplays lists teacher sessions with official local date/time.
func (uc *SessionUsecase) TeacherSessionDisplays(ctx context.Context, userID uint, statuses []domain.SessionStatus) ([]SessionDisplay, error) {
	teacher, err := uc.teacherProfileForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	sessions, err := uc.sessions.ForTeacher(ctx, teacher.ID, statuses)
	if err != nil {
		return nil, err
	}
	return uc.displaySessions(sessions)
}

// AdminSessionDisplays lists all sessions for operational reporting with the
// same official local date/time contract used by learner and teacher clients.
func (uc *SessionUsecase) AdminSessionDisplays(ctx context.Context, status domain.SessionStatus, limit, offset int) ([]SessionDisplay, int64, error) {
	sessions, total, err := uc.sessions.List(ctx, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	displays, err := uc.displaySessions(sessions)
	if err != nil {
		return nil, 0, err
	}
	return displays, total, nil
}
