package repository

import (
	"context"
	"sync"
	"testing"
	"time"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

func prepareAtomicWorkflowDB(t *testing.T) *gorm.DB {
	t.Helper()
	db := integrationDB(t)
	if err := db.AutoMigrate(&domain.Review{}); err != nil {
		t.Fatalf("migrate reviews: %v", err)
	}
	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&domain.Review{}).Error; err != nil {
		t.Fatalf("clean reviews: %v", err)
	}
	return db
}

func TestTeacherOnboardingIsAtomicUnderConcurrency(t *testing.T) {
	db := prepareAtomicWorkflowDB(t)
	user := domain.User{Name: "learner", Mobile: "09121111111", Role: domain.RoleLearner, Active: true}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewTeacherOnboardingRepository(db)

	var wg sync.WaitGroup
	errors := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			profile := &domain.Teacher{Field: "آموزش قرآن کریم", Bio: "test bio", Price30: 100, Status: domain.TeacherPending, Available: true}
			errors <- repo.CreateTeacherProfile(context.Background(), user.ID, profile)
		}()
	}
	wg.Wait()
	close(errors)

	successes := 0
	for err := range errors {
		if err == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Fatalf("successful onboarding calls: got %d, want 1", successes)
	}
	var profileCount int64
	if err := db.Model(&domain.Teacher{}).Where("user_id = ?", user.ID).Count(&profileCount).Error; err != nil {
		t.Fatal(err)
	}
	if profileCount != 1 {
		t.Fatalf("teacher profiles: got %d, want 1", profileCount)
	}
	var updated domain.User
	if err := db.First(&updated, user.ID).Error; err != nil {
		t.Fatal(err)
	}
	if updated.Role != domain.RoleTeacher {
		t.Fatalf("role: got %q, want teacher", updated.Role)
	}
}

func TestReviewTransactionPreventsDuplicateRatingsAndReconcilesAggregate(t *testing.T) {
	db := prepareAtomicWorkflowDB(t)
	learner, _, teacher, service := seedFinancialFixture(t, db)
	session := domain.Session{
		LearnerID: learner.ID, TeacherID: teacher.ID, ServiceID: service.ID,
		Title: service.Title, ScheduledAt: time.Now().UTC().Add(-time.Hour),
		Duration: service.Duration, Price: service.Price, Status: domain.SessionDone,
	}
	if err := db.Create(&session).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewReviewTransactionRepository(db)

	var wg sync.WaitGroup
	errors := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			review := &domain.Review{SessionID: session.ID, Rating: 5, Text: "عالی"}
			errors <- repo.RateCompletedSession(context.Background(), learner.ID, review)
		}()
	}
	wg.Wait()
	close(errors)

	successes := 0
	for err := range errors {
		if err == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Fatalf("successful review calls: got %d, want 1", successes)
	}
	var reviewCount int64
	if err := db.Model(&domain.Review{}).Where("session_id = ?", session.ID).Count(&reviewCount).Error; err != nil {
		t.Fatal(err)
	}
	if reviewCount != 1 {
		t.Fatalf("reviews: got %d, want 1", reviewCount)
	}
	var updatedSession domain.Session
	if err := db.First(&updatedSession, session.ID).Error; err != nil {
		t.Fatal(err)
	}
	if !updatedSession.Rated {
		t.Fatal("session was not marked rated")
	}
	var updatedTeacher domain.Teacher
	if err := db.First(&updatedTeacher, teacher.ID).Error; err != nil {
		t.Fatal(err)
	}
	if updatedTeacher.Reviews != 1 || updatedTeacher.Rating != 5 {
		t.Fatalf("teacher aggregate: reviews=%d rating=%v", updatedTeacher.Reviews, updatedTeacher.Rating)
	}
}
