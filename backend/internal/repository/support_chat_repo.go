package repository

import (
	"context"
	"strings"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

// supportChatRepo keeps live support conversations: tickets and their chat
// messages (text/audio/image). Used by the in-app support widget and the
// admin-panel support inbox.
type supportChatRepo struct{ db *gorm.DB }

func NewSupportChatRepository(db *gorm.DB) domain.SupportChatRepository {
	return &supportChatRepo{db: db}
}

func (r *supportChatRepo) CreateTicket(ctx context.Context, ticket *domain.SupportTicket) error {
	return r.db.WithContext(ctx).Create(ticket).Error
}

func (r *supportChatRepo) ticketPreload(q *gorm.DB) *gorm.DB {
	return q.
		Preload("User", func(tx *gorm.DB) *gorm.DB { return tx.Select("id, name, mobile, role, city, avatar_url, is_support_agent") }).
		Preload("Assignee", func(tx *gorm.DB) *gorm.DB { return tx.Select("id, name, mobile, role, avatar_url") })
}

func (r *supportChatRepo) GetTicket(ctx context.Context, id uint) (*domain.SupportTicket, error) {
	var ticket domain.SupportTicket
	if err := r.ticketPreload(r.db.WithContext(ctx)).First(&ticket, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &ticket, nil
}

func (r *supportChatRepo) UpdateTicket(ctx context.Context, ticket *domain.SupportTicket) error {
	return r.db.WithContext(ctx).Save(ticket).Error
}

func (r *supportChatRepo) ListTicketsForUser(ctx context.Context, userID uint, limit, offset int) ([]domain.SupportTicket, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.SupportTicket{}).Where("user_id = ?", userID)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	limit, offset = normalizedPage(limit, offset, 30, 100)
	var tickets []domain.SupportTicket
	err := r.ticketPreload(q.Order("last_message_at DESC")).Limit(limit).Offset(offset).Find(&tickets).Error
	return tickets, total, err
}

func (r *supportChatRepo) ListTicketsForStaff(ctx context.Context, filter domain.StaffTicketFilter) ([]domain.SupportTicket, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.SupportTicket{})
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.AssignedTo > 0 {
		q = q.Where("assigned_to = ?", filter.AssignedTo)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	limit, offset := normalizedPage(filter.Limit, filter.Offset, 40, 100)
	var tickets []domain.SupportTicket
	err := r.ticketPreload(q.Order("last_message_at DESC")).Limit(limit).Offset(offset).Find(&tickets).Error
	return tickets, total, err
}

func (r *supportChatRepo) AppendMessage(ctx context.Context, message *domain.SupportChatMessage) error {
	return r.db.WithContext(ctx).Create(message).Error
}

func (r *supportChatRepo) ListMessages(ctx context.Context, ticketID uint, afterID uint, limit int) ([]domain.SupportChatMessage, error) {
	q := r.db.WithContext(ctx).Model(&domain.SupportChatMessage{}).Where("ticket_id = ?", ticketID)
	if afterID > 0 {
		q = q.Where("id > ?", afterID)
	}
	if limit <= 0 || limit > 300 {
		limit = 300
	}
	var messages []domain.SupportChatMessage
	err := q.Order("id ASC").Limit(limit).Find(&messages).Error
	return messages, err
}

func (r *supportChatRepo) LastMessage(ctx context.Context, ticketID uint) (*domain.SupportChatMessage, error) {
	var message domain.SupportChatMessage
	if err := r.db.WithContext(ctx).Where("ticket_id = ?", ticketID).Order("id DESC").First(&message).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &message, nil
}

func (r *supportChatRepo) ResetUserUnread(ctx context.Context, ticketID uint) error {
	return r.db.WithContext(ctx).Model(&domain.SupportTicket{}).Where("id = ?", ticketID).
		Update("unread_user", 0).Error
}

func (r *supportChatRepo) ResetStaffUnread(ctx context.Context, ticketID uint) error {
	return r.db.WithContext(ctx).Model(&domain.SupportTicket{}).Where("id = ?", ticketID).
		Update("unread_staff", 0).Error
}

func (r *supportChatRepo) UserUnreadTotal(ctx context.Context, userID uint) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&domain.SupportTicket{}).
		Where("user_id = ? AND unread_user > 0 AND status <> ?", userID, domain.TicketClosed).
		Count(&total).Error
	return total, err
}

func (r *supportChatRepo) StaffUnreadTotal(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&domain.SupportTicket{}).
		Where("unread_staff > 0 AND status <> ?", domain.TicketClosed).
		Count(&total).Error
	return total, err
}

func (r *supportChatRepo) CountByStatus(ctx context.Context, status domain.TicketStatus) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&domain.SupportTicket{}).Where("status = ?", status).Count(&total).Error
	return total, err
}

func (r *supportChatRepo) SupportAgents(ctx context.Context) ([]domain.User, error) {
	var agents []domain.User
	err := r.db.WithContext(ctx).
		Select("id, name, mobile, role, avatar_url").
		Where("is_support_agent = ? AND active = ?", true, true).
		Order("name ASC").Find(&agents).Error
	return agents, err
}

func (r *supportChatRepo) SetSupportAgent(ctx context.Context, userID uint, enabled bool) error {
	result := r.db.WithContext(ctx).Model(&domain.User{}).Where("id = ?", userID).
		Update("is_support_agent", enabled)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *supportChatRepo) FindUserByMobile(ctx context.Context, mobile string) (*domain.User, error) {
	normalized := strings.TrimSpace(mobile)
	if normalized == "" {
		return nil, domain.ErrValidation
	}
	var user domain.User
	if err := r.db.WithContext(ctx).Where("mobile = ?", normalized).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *supportChatRepo) FindUserByID(ctx context.Context, userID uint) (*domain.User, error) {
	var user domain.User
	if err := r.db.WithContext(ctx).First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}
