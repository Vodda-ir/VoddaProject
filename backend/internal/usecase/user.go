package usecase

import (
	"context"
	"errors"
	"strings"

	"vodda/backend/internal/domain"
)

// UserUsecase handles account profile operations.
type UserUsecase struct {
	users      domain.UserRepository
	teachers   domain.TeacherRepository
	onboarding domain.TeacherOnboardingRepository
}

// NewUserUsecase builds a UserUsecase. Production injects an onboarding
// transaction boundary; the optional argument keeps isolated mocks compatible.
func NewUserUsecase(u domain.UserRepository, t domain.TeacherRepository, onboarding ...domain.TeacherOnboardingRepository) *UserUsecase {
	var transaction domain.TeacherOnboardingRepository
	if len(onboarding) > 0 {
		transaction = onboarding[0]
	}
	return &UserUsecase{users: u, teachers: t, onboarding: transaction}
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
	if len([]rune(name)) > 120 || len([]rune(city)) > 80 || len([]rune(bio)) > 500 {
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

// BecomeTeacher promotes a learner to a pending teacher profile. In production,
// profile creation and role promotion are committed atomically.
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
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	cleanSkills := make([]string, 0, len(in.Skills))
	seenSkills := make(map[string]struct{}, len(in.Skills))
	for _, skill := range in.Skills {
		if value := strings.TrimSpace(skill); value != "" {
			if _, exists := seenSkills[value]; exists {
				continue
			}
			seenSkills[value] = struct{}{}
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
		Available: true,
	}

	if uc.onboarding != nil {
		if err := uc.onboarding.CreateTeacherProfile(ctx, userID, t); err != nil {
			return nil, err
		}
		return t, nil
	}

	// Compatibility fallback for isolated repository mocks.
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
