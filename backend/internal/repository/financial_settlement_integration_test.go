package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"vodda/backend/internal/domain"
)

func TestFinancialRepositorySettlementLedgerMatchesWalletDelta(t *testing.T) {
	db := integrationDB(t)
	learner, teacherUser, teacher, service := seedFinancialFixture(t, db)
	repo := NewFinancialRepository(db)
	ctx := context.Background()

	session := domain.Session{
		LearnerID: learner.ID, TeacherID: teacher.ID, ServiceID: service.ID,
		Title: service.Title, Duration: service.Duration, Price: service.Price,
		ScheduledAt: time.Now().UTC().Add(-time.Hour), Status: domain.SessionConfirmed,
	}
	if err := db.Create(&session).Error; err != nil {
		t.Fatal(err)
	}

	commission := int64(90)
	earning := service.Price - commission
	if err := repo.CompleteAndSettleSession(ctx, &session, teacherUser.ID, earning, commission); err != nil {
		t.Fatalf("settle: %v", err)
	}

	var user domain.User
	if err := db.First(&user, teacherUser.ID).Error; err != nil {
		t.Fatal(err)
	}
	if user.Wallet != earning {
		t.Fatalf("teacher wallet: got %d, want %d", user.Wallet, earning)
	}

	var entries []domain.Transaction
	if err := db.Where("ref_id = ?", session.ID).Order("id asc").Find(&entries).Error; err != nil {
		t.Fatal(err)
	}
	if len(entries) != 2 {
		t.Fatalf("settlement entries: got %d, want 2", len(entries))
	}
	var ledgerDelta int64
	for _, entry := range entries {
		ledgerDelta += entry.Amount
	}
	if ledgerDelta != earning {
		t.Fatalf("ledger delta: got %d, want %d", ledgerDelta, earning)
	}

	if err := repo.CompleteAndSettleSession(ctx, &session, teacherUser.ID, earning, commission); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("duplicate settlement: got %v, want conflict", err)
	}
	var afterReplay domain.User
	if err := db.First(&afterReplay, teacherUser.ID).Error; err != nil {
		t.Fatal(err)
	}
	if afterReplay.Wallet != earning {
		t.Fatalf("wallet after duplicate settlement: got %d, want %d", afterReplay.Wallet, earning)
	}
}
