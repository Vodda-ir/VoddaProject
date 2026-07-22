package usecase

import (
	"context"
	"strings"

	"vodda/backend/internal/domain"
)

// SupportUsecase validates and manages contact requests.
type SupportUsecase struct {
	messages domain.SupportMessageRepository
}

func NewSupportUsecase(messages domain.SupportMessageRepository) *SupportUsecase {
	return &SupportUsecase{messages: messages}
}

type CreateSupportMessageInput struct {
	Name    string
	Contact string
	Message string
}

func (uc *SupportUsecase) Create(ctx context.Context, in CreateSupportMessageInput) (*domain.SupportMessage, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Contact = strings.TrimSpace(in.Contact)
	in.Message = strings.TrimSpace(in.Message)
	if len([]rune(in.Name)) < 2 || len([]rune(in.Name)) > 120 ||
		len([]rune(in.Contact)) < 5 || len([]rune(in.Contact)) > 160 ||
		len([]rune(in.Message)) < 10 || len([]rune(in.Message)) > 4000 {
		return nil, domain.ErrValidation
	}
	message := &domain.SupportMessage{
		Name: in.Name, Contact: in.Contact, Message: in.Message,
		Status: domain.SupportMessageNew,
	}
	if err := uc.messages.Create(ctx, message); err != nil {
		return nil, err
	}
	return message, nil
}

func (uc *SupportUsecase) List(ctx context.Context, status domain.SupportMessageStatus, limit, offset int) ([]domain.SupportMessage, int64, error) {
	if status != "" && status != domain.SupportMessageNew && status != domain.SupportMessageResolved {
		return nil, 0, domain.ErrValidation
	}
	return uc.messages.List(ctx, status, limit, offset)
}

func (uc *SupportUsecase) Resolve(ctx context.Context, id uint) error {
	if id == 0 {
		return domain.ErrValidation
	}
	return uc.messages.Resolve(ctx, id)
}
