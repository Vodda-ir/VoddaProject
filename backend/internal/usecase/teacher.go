package usecase

import (
	"context"
	"errors"
	"strings"

	"vodda/backend/internal/domain"
)

// TeacherUsecase handles teacher discovery and self-management.
type TeacherUsecase struct {
	teachers domain.TeacherRepository
	reviews  domain.ReviewRepository
}

// NewTeacherUsecase builds a TeacherUsecase.
func NewTeacherUsecase(t domain.TeacherRepository, r domain.ReviewRepository) *TeacherUsecase {
	return &TeacherUsecase{teachers: t, reviews: r}
}

// Search returns approved teachers matching the public filter.
func (uc *TeacherUsecase) Search(ctx context.Context, f domain.TeacherFilter) ([]domain.Teacher, int64, error) {
	f.Status = domain.TeacherApproved
	return uc.teachers.List(ctx, f)
}

// Get returns a single teacher with services, samples and reviews.
func (uc *TeacherUsecase) Get(ctx context.Context, id uint) (*domain.Teacher, []domain.Review, error) {
	t, err := uc.teachers.ByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	reviews, _ := uc.reviews.ForTeacher(ctx, id)
	return t, reviews, nil
}

// Mine returns the teacher profile owned by the user.
// Auto-creates a minimal teacher record if one doesn't exist yet.
func (uc *TeacherUsecase) Mine(ctx context.Context, userID uint) (*domain.Teacher, error) {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err == nil {
		return t, nil
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	// Auto-create a minimal teacher profile
	t = &domain.Teacher{UserID: userID}
	if err := uc.teachers.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// MyWorkTimes returns the work times for the calling teacher.
func (uc *TeacherUsecase) MyWorkTimes(ctx context.Context, userID uint) ([]domain.WorkTime, error) {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, nil // no teacher record yet → empty list
		}
		return nil, err
	}
	return uc.teachers.WorkTimes(ctx, t.ID)
}

// UpdateMine updates editable teacher fields.
func (uc *TeacherUsecase) UpdateMine(ctx context.Context, userID uint, in BecomeTeacherInput) (*domain.Teacher, error) {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		if !errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		// Auto-create if not exists
		t = &domain.Teacher{UserID: userID}
		if err := uc.teachers.Create(ctx, t); err != nil {
			return nil, err
		}
	}
	if in.Tag != "" {
		t.Tag = in.Tag
	}
	if in.Field != "" {
		t.Field = in.Field
	}
	if in.Level != "" {
		t.Level = in.Level
	}
	if in.City != "" {
		t.City = in.City
	}
	if in.Bio != "" {
		t.Bio = in.Bio
	}
	if len(in.Skills) > 0 {
		t.Skills = strings.Join(in.Skills, ",")
	}
	if in.Price30 > 0 {
		t.Price30 = in.Price30
	}
	if in.Price60 > 0 {
		t.Price60 = in.Price60
	}
	if in.Available != nil {
		t.Available = *in.Available
	}
	if err := uc.teachers.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// ── services ──

// AddService creates a bookable service for the teacher.
func (uc *TeacherUsecase) AddService(ctx context.Context, userID uint, s *domain.Service) (*domain.Service, error) {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	s.TeacherID = t.ID
	s.Active = true
	if err := uc.teachers.AddService(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

// UpdateService edits a service owned by the teacher.
// Only updates fields that are explicitly set (non-zero). Active is only
// applied when s.ID is set AND the caller provides it via the handler.
func (uc *TeacherUsecase) UpdateService(ctx context.Context, userID uint, s *domain.Service) error {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	existing, err := uc.teachers.ServiceByID(ctx, s.ID)
	if err != nil {
		return err
	}
	if existing.TeacherID != t.ID {
		return domain.ErrForbidden
	}
	// Merge: only overwrite fields that were provided
	if s.Title != "" {
		existing.Title = s.Title
	}
	if s.Duration > 0 {
		existing.Duration = s.Duration
	}
	if s.Price > 0 {
		existing.Price = s.Price
	}
	if s.Icon != "" {
		existing.Icon = s.Icon
	}
	return uc.teachers.UpdateService(ctx, existing)
}

// ToggleServiceActive is a dedicated method to toggle a service's active state.
func (uc *TeacherUsecase) ToggleServiceActive(ctx context.Context, userID uint, serviceID uint, active bool) error {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	s, err := uc.teachers.ServiceByID(ctx, serviceID)
	if err != nil {
		return err
	}
	if s.TeacherID != t.ID {
		return domain.ErrForbidden
	}
	s.Active = active
	return uc.teachers.UpdateService(ctx, s)
}

// DeleteService removes a service owned by the teacher.
func (uc *TeacherUsecase) DeleteService(ctx context.Context, userID, serviceID uint) error {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	return uc.teachers.DeleteService(ctx, t.ID, serviceID)
}

// ── work times ──

// SetWorkTimes replaces the teacher's availability slots.
func (uc *TeacherUsecase) SetWorkTimes(ctx context.Context, userID uint, wt []domain.WorkTime) error {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	return uc.teachers.SetWorkTimes(ctx, t.ID, wt)
}

// WorkTimes returns the teacher's availability slots.
func (uc *TeacherUsecase) WorkTimes(ctx context.Context, teacherID uint) ([]domain.WorkTime, error) {
	return uc.teachers.WorkTimes(ctx, teacherID)
}
