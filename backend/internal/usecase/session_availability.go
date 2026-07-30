package usecase

import (
	"context"
	"sort"
	"time"

	"vodda/backend/internal/domain"
)

// AvailabilitySlot is an authoritative bookable start returned in UTC together
// with its business-timezone representation for clients that run in another
// device timezone.
type AvailabilitySlot struct {
	StartAt    time.Time
	EndAt      time.Time
	LocalDate  string
	LocalStart string
	LocalEnd   string
	Weekday    int
}

// AvailableSlots returns unoccupied starts for an active service. The backend
// is the source of truth for business timezone, lead time, range splitting and
// teacher conflicts; clients must still handle a conflict if another booking
// wins between listing and submission.
func (uc *SessionUsecase) AvailableSlots(ctx context.Context, teacherID, serviceID uint, days int) ([]AvailabilitySlot, error) {
	return uc.availableSlotsAt(ctx, teacherID, serviceID, days, time.Now())
}

func (uc *SessionUsecase) availableSlotsAt(ctx context.Context, teacherID, serviceID uint, days int, now time.Time) ([]AvailabilitySlot, error) {
	if uc.cfg == nil {
		return nil, domain.ErrValidation
	}
	if days <= 0 {
		days = 14
	}
	if days > 60 {
		days = 60
	}

	teacher, err := uc.teachers.ByID(ctx, teacherID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved || !teacher.Verified || !teacher.Available || teacher.User == nil || !teacher.User.Active {
		return nil, domain.ErrNotFound
	}

	service, err := uc.teachers.ServiceByID(ctx, serviceID)
	if err != nil {
		return nil, err
	}
	if service.TeacherID != teacher.ID || !service.Active || service.Duration <= 0 || service.Duration > 240 || service.Price <= 0 {
		return nil, domain.ErrValidation
	}

	location, err := time.LoadLocation(uc.cfg.AppTimezone)
	if err != nil {
		return nil, err
	}
	workTimes, err := uc.teachers.WorkTimes(ctx, teacher.ID)
	if err != nil {
		return nil, err
	}
	existing, err := uc.sessions.ForTeacher(ctx, teacher.ID, []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed})
	if err != nil {
		return nil, err
	}

	localNow := now.In(location)
	firstDay := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, location)
	minimumStart := now.Add(5 * time.Minute)
	result := make([]AvailabilitySlot, 0)
	seen := make(map[int64]struct{})

	for dayOffset := 0; dayOffset < days; dayOffset++ {
		day := firstDay.AddDate(0, 0, dayOffset)
		weekday := (int(day.Weekday()) + 1) % 7
		for _, workTime := range workTimes {
			if !workTime.Active || workTime.Weekday != weekday {
				continue
			}
			from, okFrom := parseClock(workTime.FromTime)
			to, okTo := parseClock(workTime.ToTime)
			if !okFrom || !okTo || from >= to {
				continue
			}
			for minute := from; minute+service.Duration <= to; minute += service.Duration {
				startLocal := time.Date(day.Year(), day.Month(), day.Day(), minute/60, minute%60, 0, 0, location)
				start := startLocal.UTC()
				end := start.Add(time.Duration(service.Duration) * time.Minute)
				if start.Before(minimumStart) {
					continue
				}
				if _, duplicate := seen[start.Unix()]; duplicate {
					continue
				}
				occupied := false
				for _, session := range existing {
					if overlaps(start, end, session.ScheduledAt, session.ScheduledAt.Add(time.Duration(session.Duration)*time.Minute)) {
						occupied = true
						break
					}
				}
				if occupied {
					continue
				}
				seen[start.Unix()] = struct{}{}
				result = append(result, AvailabilitySlot{
					StartAt:    start,
					EndAt:      end,
					LocalDate:  startLocal.Format("2006-01-02"),
					LocalStart: startLocal.Format("15:04"),
					LocalEnd:   startLocal.Add(time.Duration(service.Duration) * time.Minute).Format("15:04"),
					Weekday:    weekday,
				})
			}
		}
	}

	sort.Slice(result, func(i, j int) bool { return result[i].StartAt.Before(result[j].StartAt) })
	return result, nil
}
