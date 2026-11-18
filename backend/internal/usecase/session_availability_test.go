package usecase

import (
	"context"
	"testing"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
)

type availabilityTeacherRepository struct {
	domain.TeacherRepository
	teacher  domain.Teacher
	service  domain.Service
	workTime domain.WorkTime
}

func (r *availabilityTeacherRepository) ByID(context.Context, uint) (*domain.Teacher, error) {
	copy := r.teacher
	return &copy, nil
}

func (r *availabilityTeacherRepository) ServiceByID(context.Context, uint) (*domain.Service, error) {
	copy := r.service
	return &copy, nil
}

func (r *availabilityTeacherRepository) WorkTimes(context.Context, uint) ([]domain.WorkTime, error) {
	return []domain.WorkTime{r.workTime}, nil
}

type availabilitySessionRepository struct {
	domain.SessionRepository
	sessions []domain.Session
}

func (r *availabilitySessionRepository) ForTeacher(context.Context, uint, []domain.SessionStatus) ([]domain.Session, error) {
	return append([]domain.Session(nil), r.sessions...), nil
}

func TestAvailableSlotsUsesBusinessTimezoneAndExcludesOccupiedStarts(t *testing.T) {
	location, err := time.LoadLocation("Asia/Tehran")
	if err != nil {
		t.Fatal(err)
	}
	localDay := time.Date(2026, 7, 27, 0, 0, 0, 0, location)
	weekday := (int(localDay.Weekday()) + 1) % 7
	occupiedStart := time.Date(2026, 7, 27, 10, 0, 0, 0, location).UTC()

	teachers := &availabilityTeacherRepository{
		teacher: domain.Teacher{
			ID: 8, Status: domain.TeacherApproved, Verified: true, Available: true,
			User: &domain.User{ID: 9, Active: true},
		},
		service:  domain.Service{ID: 12, TeacherID: 8, Duration: 30, Price: 1000, Active: true},
		workTime: domain.WorkTime{TeacherID: 8, Weekday: weekday, FromTime: "09:00", ToTime: "12:00", Active: true},
	}
	sessions := &availabilitySessionRepository{sessions: []domain.Session{
		{ID: 1, TeacherID: 8, ScheduledAt: occupiedStart, Duration: 30, Status: domain.SessionConfirmed},
	}}
	uc := NewSessionUsecase(sessions, teachers, nil, nil, nil, &config.Config{AppTimezone: "Asia/Tehran"})
	now := time.Date(2026, 7, 27, 4, 0, 0, 0, time.UTC) // 07:30 Tehran

	slots, err := uc.availableSlotsAt(context.Background(), 8, 12, 1, now)
	if err != nil {
		t.Fatalf("availability: %v", err)
	}
	got := make([]string, 0, len(slots))
	for _, slot := range slots {
		got = append(got, slot.LocalStart)
		if slot.LocalDate != "2026-07-27" || slot.Weekday != weekday {
			t.Fatalf("unexpected local representation: %#v", slot)
		}
	}
	want := []string{"09:00", "09:30", "10:30", "11:00", "11:30"}
	if len(got) != len(want) {
		t.Fatalf("slots=%v, want=%v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("slots=%v, want=%v", got, want)
		}
	}
}

func TestAvailableSlotsRejectsServiceFromAnotherTeacher(t *testing.T) {
	teachers := &availabilityTeacherRepository{
		teacher: domain.Teacher{ID: 8, Status: domain.TeacherApproved, Verified: true, Available: true, User: &domain.User{Active: true}},
		service: domain.Service{ID: 12, TeacherID: 99, Duration: 30, Price: 1000, Active: true},
	}
	uc := NewSessionUsecase(&availabilitySessionRepository{}, teachers, nil, nil, nil, &config.Config{AppTimezone: "Asia/Tehran"})
	_, err := uc.availableSlotsAt(context.Background(), 8, 12, 14, time.Now())
	if err != domain.ErrValidation {
		t.Fatalf("got %v, want validation", err)
	}
}
