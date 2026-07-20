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
	name := strings.TrimSpace(in.Name)
	city := strings.TrimSpace(in.City)
	bio := strings.TrimSpace(in.Bio)
	avatarURL := strings.TrimSpace(in.AvatarURL)
	if len([]rune(name)) > 120 || len([]rune(city)) > 80 || len([]rune(bio)) > 1000 {
		return nil, domain.ErrValidation
	}
	if avatarURL != "" && (!strings.HasPrefix(avatarURL, "/uploads/avatars/") || strings.Contains(avatarURL, "..")) {
		return nil, domain.ErrValidation
	}

	u, err := uc.users.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if name != "" {
		u.Name = name
	}
	u.City = city
	u.Bio = bio
	if avatarURL != "" {
		u.AvatarURL = avatarURL
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

// BecomeTeacher promotes a learner to a pending teacher profile. The teacher
// role allows completion of onboarding, while public discovery and money flows
// still require an approved, verified profile.
func (uc *UserUsecase) BecomeTeacher(ctx context.Context, userID uint, in BecomeTeacherInput) (*domain.Teacher, error) {
	in.Field = strings.TrimSpace(in.Field)
	in.Tag = strings.TrimSpace(in.Tag)
	in.Level = strings.TrimSpace(in.Level)
	in.City = strings.TrimSpace(in.City)
	in.Bio = strings.TrimSpace(in.Bio)
	if in.Field == "" || in.Bio == "" || in.Price30 <= 0 {
		return nil, domain.ErrValidation
	}
	if err := validateTeacherProfileInput(in); err != nil {
		return nil, err
	}
	if existing, err := uc.teachers.ByUserID(ctx, userID); err == nil {
		return existing, domain.ErrConflict
	}

	cleanSkills := make([]string, 0, len(in.Skills))
	for _, skill := range in.Skills {
		if value := strings.TrimSpace(skill); value != "" {
			cleanSkills = append(cleanSkills, value)
		}
	}
	t := &domain.Teacher{
		UserID:   userID,
		Field:    in.Field,
		Tag:      in.Tag,
		Level:    in.Level,
		City:     in.City,
		Bio:      in.Bio,
		Skills:   strings.Join(cleanSkills, ","),
		Price30:  in.Price30,
		Price60:  in.Price60,
		Female:   in.Female,
		Status:   domain.TeacherPending,
		Verified: false,
	}
	if err := uc.teachers.Create(ctx, t); err != nil {
		return nil, err
	}

	u, err := uc.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	u.Role = domain.RoleTeacher
	if err := uc.users.Update(ctx, u); err != nil {
		return nil, err
	}
	return t, nil
}
