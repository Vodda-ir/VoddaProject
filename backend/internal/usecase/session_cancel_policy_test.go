package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"vodda/backend/internal/domain"
)

type cancelSessionRepository struct {
	domain.SessionRepository
	session *domain.Session
	updates int
}

func (r *cancelSessionRepository) ByID(context.Context, uint) (*domain.Session, error) {
	copy := *r.session
	return &copy, nil
}

func (r *cancelSessionRepository) Update(_ context.Context, session *domain.Session) error {
	r.updates++
	copy := *session
	r.session = &copy
	return nil
}

type cancelTeacherRepository struct {
	domain.TeacherRepository
	teacher domain.Teacher
}

func (r *cancelTeacherRepository) ByID(context.Context, uint) (*domain.Teacher, error) {
	copy := r.teacher
	return &copy, nil
}

type cancelUserRepository struct {
	domain.UserRepository
	delta int64
}

func (r *cancelUserRepository) AddWallet(_ context.Context, _ uint, delta int64) error {
	r.delta += delta
	return nil
}

type cancelWalletRepository struct {
	domain.WalletRepository
	transactions []domain.Transaction
}

func (r *cancelWalletRepository) AddTx(_ context.Context, transaction *domain.Transaction) error {
	r.transactions = append(r.transactions, *transaction)
	return nil
}

type cancelNotificationRepository struct {
	domain.NotificationRepository
	count int
}

func (r *cancelNotificationRepository) Create(context.Context, *domain.Notification) error {
	r.count++
	return nil
}

func newCancellationUsecase(session *domain.Session) (*SessionUsecase, *cancelSessionRepository, *cancelUserRepository, *cancelWalletRepository, *cancelNotificationRepository) {
	sessions := &cancelSessionRepository{session: session}
	users := &cancelUserRepository{}
	wallet := &cancelWalletRepository{}
	notifications := &cancelNotificationRepository{}
	teachers := &cancelTeacherRepository{teacher: domain.Teacher{ID: session.TeacherID, UserID: 99}}
	return NewSessionUsecase(sessions, teachers, users, wallet, notifications, nil), sessions, users, wallet, notifications
}

func TestCancelBeforeStartRejectsStartedSessionWithoutMutation(t *testing.T) {
	usecase, sessions, users, wallet, notifications := newCancellationUsecase(&domain.Session{
		ID: 1, LearnerID: 7, TeacherID: 8, Title: "جلسه", Price: 1000,
		Status: domain.SessionConfirmed, ScheduledAt: time.Now().Add(-time.Minute),
	})

	_, err := usecase.CancelBeforeStart(context.Background(), 7, 1)
	if !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("got %v, want conflict", err)
	}
	if sessions.updates != 0 || users.delta != 0 || len(wallet.transactions) != 0 || notifications.count != 0 {
		t.Fatalf("past cancellation mutated state: updates=%d delta=%d tx=%d notifications=%d", sessions.updates, users.delta, len(wallet.transactions), notifications.count)
	}
}

func TestCancelBeforeStartRefundsFutureSession(t *testing.T) {
	usecase, sessions, users, wallet, notifications := newCancellationUsecase(&domain.Session{
		ID: 2, LearnerID: 7, TeacherID: 8, Title: "جلسه", Price: 1000,
		Status: domain.SessionPending, ScheduledAt: time.Now().Add(time.Hour),
	})

	result, err := usecase.CancelBeforeStart(context.Background(), 7, 2)
	if err != nil {
		t.Fatalf("cancel: %v", err)
	}
	if result.Status != domain.SessionCanceled || sessions.session.Status != domain.SessionCanceled {
		t.Fatalf("status: got %s", result.Status)
	}
	if sessions.updates != 1 {
		t.Fatalf("updates: got %d, want 1", sessions.updates)
	}
	if users.delta != 1000 {
		t.Fatalf("refund delta: got %d, want 1000", users.delta)
	}
	if len(wallet.transactions) != 1 || wallet.transactions[0].Amount != 1000 || wallet.transactions[0].RefID != 2 {
		t.Fatalf("unexpected ledger: %#v", wallet.transactions)
	}
	if notifications.count != 1 {
		t.Fatalf("notifications: got %d, want 1", notifications.count)
	}
}
