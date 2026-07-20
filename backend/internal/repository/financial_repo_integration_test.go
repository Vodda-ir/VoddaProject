package repository

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

func integrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_MYSQL_DSN")
	if dsn == "" {
		t.Skip("TEST_MYSQL_DSN is not configured")
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open MySQL: %v", err)
	}
	if err := db.AutoMigrate(
		&domain.User{},
		&domain.Teacher{},
		&domain.Service{},
		&domain.Session{},
		&domain.Transaction{},
		&domain.Withdrawal{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	for _, model := range []any{
		&domain.Transaction{},
		&domain.Withdrawal{},
		&domain.Session{},
		&domain.Service{},
		&domain.Teacher{},
		&domain.User{},
	} {
		if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(model).Error; err != nil {
			t.Fatalf("clean database: %v", err)
		}
	}
	return db
}

func seedFinancialFixture(t *testing.T, db *gorm.DB) (domain.User, domain.User, domain.Teacher, domain.Service) {
	t.Helper()
	learner := domain.User{Name: "learner", Mobile: "09120000000", Role: domain.RoleLearner, Active: true, Wallet: 1_000}
	teacherUser := domain.User{Name: "teacher", Mobile: "09120000001", Role: domain.RoleTeacher, Active: true, Wallet: 0}
	if err := db.Create(&learner).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&teacherUser).Error; err != nil {
		t.Fatal(err)
	}
	teacher := domain.Teacher{
		UserID: teacherUser.ID, Field: "quran", Status: domain.TeacherApproved,
		Verified: true, Available: true,
	}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatal(err)
	}
	service := domain.Service{TeacherID: teacher.ID, Title: "test", Duration: 30, Price: 600, Active: true}
	if err := db.Create(&service).Error; err != nil {
		t.Fatal(err)
	}
	return learner, teacherUser, teacher, service
}

func TestFinancialRepositoryBookingAndRefundAreAtomicAndIdempotent(t *testing.T) {
	db := integrationDB(t)
	learner, _, teacher, service := seedFinancialFixture(t, db)
	repo := NewFinancialRepository(db)
	ctx := context.Background()

	session := &domain.Session{
		LearnerID: learner.ID, TeacherID: teacher.ID, ServiceID: service.ID,
		ScheduledAt: time.Now().UTC().Add(24 * time.Hour), Note: "integration",
	}
	if err := repo.CreateFundedSession(ctx, session); err != nil {
		t.Fatalf("book: %v", err)
	}

	var afterBook domain.User
	if err := db.First(&afterBook, learner.ID).Error; err != nil {
		t.Fatal(err)
	}
	if afterBook.Wallet != 400 {
		t.Fatalf("wallet after book: got %d, want 400", afterBook.Wallet)
	}
	var txCount int64
	if err := db.Model(&domain.Transaction{}).Where("ref_id = ?", session.ID).Count(&txCount).Error; err != nil {
		t.Fatal(err)
	}
	if txCount != 1 {
		t.Fatalf("booking ledger entries: got %d, want 1", txCount)
	}

	if err := repo.CancelAndRefundSession(ctx, session, []domain.SessionStatus{domain.SessionPending}, "test refund"); err != nil {
		t.Fatalf("refund: %v", err)
	}
	var afterRefund domain.User
	if err := db.First(&afterRefund, learner.ID).Error; err != nil {
		t.Fatal(err)
	}
	if afterRefund.Wallet != 1_000 {
		t.Fatalf("wallet after refund: got %d, want 1000", afterRefund.Wallet)
	}
	if err := db.Model(&domain.Transaction{}).Where("ref_id = ?", session.ID).Count(&txCount).Error; err != nil {
		t.Fatal(err)
	}
	if txCount != 2 {
		t.Fatalf("ledger entries after refund: got %d, want 2", txCount)
	}

	err := repo.CancelAndRefundSession(ctx, session, []domain.SessionStatus{domain.SessionPending}, "duplicate")
	if !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("duplicate refund: got %v, want conflict", err)
	}
	var finalUser domain.User
	if err := db.First(&finalUser, learner.ID).Error; err != nil {
		t.Fatal(err)
	}
	if finalUser.Wallet != 1_000 {
		t.Fatalf("wallet after duplicate refund: got %d, want 1000", finalUser.Wallet)
	}
}

func TestFinancialRepositoryWithdrawalRejectCannotRefundTwice(t *testing.T) {
	db := integrationDB(t)
	_, teacherUser, teacher, _ := seedFinancialFixture(t, db)
	if err := db.Model(&domain.User{}).Where("id = ?", teacherUser.ID).Update("wallet", 1_000).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewFinancialRepository(db)
	ctx := context.Background()

	withdrawal := &domain.Withdrawal{
		TeacherID: teacher.ID, UserID: teacherUser.ID, Amount: 700,
		Sheba: "IR000000000000000000000000", Status: domain.WithdrawalPending,
	}
	if err := repo.CreateFundedWithdrawal(ctx, withdrawal); err != nil {
		t.Fatalf("create withdrawal: %v", err)
	}
	if err := repo.ProcessWithdrawal(ctx, withdrawal, false); err != nil {
		t.Fatalf("reject withdrawal: %v", err)
	}
	if err := repo.ProcessWithdrawal(ctx, withdrawal, false); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("duplicate rejection: got %v, want conflict", err)
	}

	var user domain.User
	if err := db.First(&user, teacherUser.ID).Error; err != nil {
		t.Fatal(err)
	}
	if user.Wallet != 1_000 {
		t.Fatalf("wallet after rejected withdrawal: got %d, want 1000", user.Wallet)
	}
}

func TestUserRepositoryConcurrentDebitsNeverMakeBalanceNegative(t *testing.T) {
	db := integrationDB(t)
	user := domain.User{Name: "race", Mobile: "09120000009", Active: true, Wallet: 1_000}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewUserRepository(db)

	start := make(chan struct{})
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			results <- repo.AddWallet(context.Background(), user.ID, -700)
		}()
	}
	close(start)
	wg.Wait()
	close(results)

	successes := 0
	insufficient := 0
	for err := range results {
		switch {
		case err == nil:
			successes++
		case errors.Is(err, domain.ErrInsufficient):
			insufficient++
		default:
			t.Fatalf("unexpected debit error: %v", err)
		}
	}
	if successes != 1 || insufficient != 1 {
		t.Fatalf("results: successes=%d insufficient=%d", successes, insufficient)
	}

	var final domain.User
	if err := db.First(&final, user.ID).Error; err != nil {
		t.Fatal(err)
	}
	if final.Wallet != 300 {
		t.Fatalf("final wallet: got %d, want 300", final.Wallet)
	}
}
