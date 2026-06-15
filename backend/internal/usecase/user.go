package usecase

import (
	"context"
	"strings"

	"vodda/backend/internal/domain"
)

// UserUsecase handles account profile operations.
type UserUsecase struct {
	users    domain.UserRepository
	teachers domain.TeacherRepository
}

// NewUserUsecase builds a UserUsecase.
func NewUserUsecase(u domain.UserRepository, t domain.TeacherRepository) *UserUsecase {
	return &UserUsecase{users: u, teachers: t}
}

// Me returns the current user.
func (uc *UserUsecase) Me(ctx context.Context, id uint) (*domain.User, error) {
	return uc.users.ByID(ctx, id)
}

// UpdateProfileInput carries editable profile fields.
type UpdateProfileInput struct {
	Name      string
	City      string
	Bio       string
	AvatarURL string
}

// UpdateProfile mutates the user's basic profile.
func (uc *UserUsecase) UpdateProfile(ctx context.Context, id uint, in UpdateProfileInput) (*domain.User, error) {
	u, err := uc.users.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if s := strings.TrimSpace(in.Name); s != "" {
		u.Name = s
	}
	u.City = strings.TrimSpace(in.City)
	u.Bio = strings.TrimSpace(in.Bio)
	if in.AvatarURL != "" {
		u.AvatarURL = in.AvatarURL
	}
	if err := uc.users.Update(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

// BecomeTeacherInput is the teacher onboarding payload.
type BecomeTeacherInput struct {
	Field     string
	Tag       string
	Level     string
	City      string
	Bio       string
	Skills    []string
	Price30   int64
	Price60   int64
	Female    bool
	Available *bool
}

// BecomeTeacher promotes a learner to a (pending) teacher profile.
func (uc *UserUsecase) BecomeTeacher(ctx context.Context, userID uint, in BecomeTeacherInput) (*domain.Teacher, error) {
	if in.Field == "" || in.Bio == "" || in.Price30 <= 0 {
		return nil, domain.ErrValidation
	}
	if existing, err := uc.teachers.ByUserID(ctx, userID); err == nil {
		return existing, domain.ErrConflict
	}
	t := &domain.Teacher{
		UserID:   userID,
		Field:    in.Field,
		Tag:      in.Tag,
		Level:    in.Level,
		City:     in.City,
		Bio:      in.Bio,
		Skills:   strings.Join(in.Skills, ","),
		Price30:  in.Price30,
		Price60:  in.Price60,
		Female:   in.Female,
		Status:   domain.TeacherPending,
		Verified: false,
	}
	if err := uc.teachers.Create(ctx, t); err != nil {
		return nil, err
	}
	// promote account role
	u, err := uc.users.ByID(ctx, userID)
	if err == nil {
		u.Role = domain.RoleTeacher
		_ = uc.users.Update(ctx, u)
	}
	return t, nil
}
