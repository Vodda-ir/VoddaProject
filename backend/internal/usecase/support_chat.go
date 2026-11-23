package usecase

import (
	"context"
	"strconv"
	"strings"
	"time"

	"vodda/backend/internal/domain"
)

// SupportChatUsecase powers the live chat + ticketing support system:
// app users (learners/teachers) open tickets and exchange text, voice and
// image messages; admins and appointed support agents (کارشناس پشتیبانی)
// answer in real time from the admin panel.
type SupportChatUsecase struct {
	chat   domain.SupportChatRepository
	notifs domain.NotificationRepository
	users  domain.UserRepository
}

func NewSupportChatUsecase(chat domain.SupportChatRepository) *SupportChatUsecase {
	return &SupportChatUsecase{chat: chat}
}

// WithObservers wires the optional repos used for in-app notifications.
func (uc *SupportChatUsecase) WithObservers(notifs domain.NotificationRepository, users domain.UserRepository) *SupportChatUsecase {
	uc.notifs = notifs
	uc.users = users
	return uc
}

// ---------- helpers ----------

func normalizeKind(kind domain.ChatKind) domain.ChatKind {
	switch kind {
	case domain.ChatAudio, domain.ChatImage:
		return kind
	default:
		return domain.ChatText
	}
}

func (uc *SupportChatUsecase) notifyStaff(ctx context.Context, ticket *domain.SupportTicket, title, body string) {
	if uc.notifs == nil {
		return
	}
	if ticket.AssignedTo != nil {
		_ = uc.notifs.Create(ctx, &domain.Notification{UserID: *ticket.AssignedTo, Title: title, Body: body})
		return
	}
	// بدون کارشناس مشخص: همهٔ مدیران و همهٔ کارشناسان پشتیبانی خبر می‌شوند.
	if uc.users != nil {
		if ids, err := uc.users.AdminIDs(ctx); err == nil {
			for _, id := range ids {
				_ = uc.notifs.Create(ctx, &domain.Notification{UserID: id, Title: title, Body: body})
			}
		}
	}
	if agents, err := uc.chat.SupportAgents(ctx); err == nil {
		for _, agent := range agents {
			_ = uc.notifs.Create(ctx, &domain.Notification{UserID: agent.ID, Title: title, Body: body})
		}
	}
}

func (uc *SupportChatUsecase) notifyUser(ctx context.Context, ticket *domain.SupportTicket, title, body string) {
	if uc.notifs == nil {
		return
	}
	_ = uc.notifs.Create(ctx, &domain.Notification{UserID: ticket.UserID, Title: title, Body: body})
}

func senderDisplayName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "کاربر"
	}
	return trimmed
}

// ---------- user side ----------

type CreateTicketInput struct {
	UserID  uint
	Subject string
	Body    string
}

// CreateTicket opens a conversation with the first user message attached.
func (uc *SupportChatUsecase) CreateTicket(ctx context.Context, in CreateTicketInput) (*domain.SupportTicket, error) {
	if in.UserID == 0 {
		return nil, domain.ErrUnauthorized
	}
	subject := strings.TrimSpace(in.Subject)
	body := strings.TrimSpace(in.Body)
	if len([]rune(subject)) < 2 || len([]rune(subject)) > 150 || len([]rune(body)) < 1 || len([]rune(body)) > 2000 {
		return nil, domain.ErrValidation
	}

	owner, err := uc.chat.FindUserByID(ctx, in.UserID)
	if err != nil || owner == nil {
		return nil, domain.ErrNotFound
	}

	now := time.Now().UTC()
	ticket := &domain.SupportTicket{
		UserID:        in.UserID,
		Subject:       subject,
		Status:        domain.TicketOpen,
		LastMessageAt: now,
	}
	if err := uc.chat.CreateTicket(ctx, ticket); err != nil {
		return nil, err
	}

	first := &domain.SupportChatMessage{
		TicketID:   ticket.ID,
		SenderID:   in.UserID,
		SenderName: senderDisplayName(owner.Name),
		SenderSide: domain.SideUser,
		Kind:       domain.ChatText,
		Body:       body,
	}
	if err := uc.chat.AppendMessage(ctx, first); err != nil {
		return nil, err
	}

	uc.notifyStaff(ctx, ticket, "تیکت پشتیبانی جدید",
		"«"+subject+"» از طرف "+senderDisplayName(owner.Name)+" ثبت شد؛ در صندوق پشتیبانی پاسخ دهید.")
	return ticket, nil
}

type SendMessageInput struct {
	TicketID   uint
	SenderID   uint
	SenderName string
	Kind       domain.ChatKind
	Body       string
	Attachment string
	Mime       string
	DurationMS int
}

// SendUserMessage appends a message from the ticket owner (learner/teacher).
func (uc *SupportChatUsecase) SendUserMessage(ctx context.Context, in SendMessageInput) (*domain.SupportChatMessage, error) {
	if in.SenderID == 0 {
		return nil, domain.ErrUnauthorized
	}
	ticket, err := uc.chat.GetTicket(ctx, in.TicketID)
	if err != nil {
		return nil, err
	}
	if ticket.UserID != in.SenderID {
		return nil, domain.ErrForbidden
	}
	if ticket.Status == domain.TicketClosed {
		return nil, domain.ErrConflict
	}

	kind := normalizeKind(in.Kind)
	body := strings.TrimSpace(in.Body)
	if kind == domain.ChatText {
		if len([]rune(body)) < 1 || len([]rune(body)) > 2000 {
			return nil, domain.ErrValidation
		}
	} else {
		if body == "" {
			if kind == domain.ChatAudio {
				body = "پیام صوتی"
			} else {
				body = "تصویر"
			}
		}
		if len([]rune(body)) > 2000 {
			return nil, domain.ErrValidation
		}
	}
	if kind != domain.ChatText && strings.TrimSpace(in.Attachment) == "" {
		return nil, domain.ErrValidation
	}
	if in.DurationMS < 0 || in.DurationMS > 600_000 {
		in.DurationMS = 0
	}

	owner, err := uc.chat.FindUserByID(ctx, in.SenderID)
	if err != nil || owner == nil {
		return nil, domain.ErrNotFound
	}

	message := &domain.SupportChatMessage{
		TicketID:       ticket.ID,
		SenderID:       in.SenderID,
		SenderName:     senderDisplayName(owner.Name),
		SenderSide:     domain.SideUser,
		Kind:           kind,
		Body:           body,
		AttachmentURL:  strings.TrimSpace(in.Attachment),
		AttachmentMime: strings.TrimSpace(in.Mime),
		DurationMS:     in.DurationMS,
	}
	if err := uc.chat.AppendMessage(ctx, message); err != nil {
		return nil, err
	}

	ticket.Status = domain.TicketPending
	ticket.UnreadStaff++
	ticket.LastMessageAt = time.Now().UTC()
	if err := uc.chat.UpdateTicket(ctx, ticket); err != nil {
		return nil, err
	}

	uc.notifyStaff(ctx, ticket, "پاسخ جدید در تیکت #"+itoa(ticket.ID),
		senderDisplayName(owner.Name)+" در «"+ticket.Subject+"» پیام فرستاد.")
	return message, nil
}

// UserTickets lists the caller's own conversations.
func (uc *SupportChatUsecase) UserTickets(ctx context.Context, userID uint, limit, offset int) ([]domain.SupportTicket, int64, error) {
	if userID == 0 {
		return nil, 0, domain.ErrUnauthorized
	}
	return uc.chat.ListTicketsForUser(ctx, userID, limit, offset)
}

// UserThread returns the messages of one ticket for its owner and marks the
// ticket read on the user side.
func (uc *SupportChatUsecase) UserThread(ctx context.Context, userID, ticketID, afterID uint, limit int) (*domain.SupportTicket, []domain.SupportChatMessage, error) {
	ticket, err := uc.chat.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, nil, err
	}
	if ticket.UserID != userID {
		return nil, nil, domain.ErrForbidden
	}
	messages, err := uc.chat.ListMessages(ctx, ticketID, afterID, limit)
	if err != nil {
		return nil, nil, err
	}
	if ticket.UnreadUser > 0 {
		if err := uc.chat.ResetUserUnread(ctx, ticketID); err == nil {
			ticket.UnreadUser = 0
		}
	}
	return ticket, messages, nil
}

// UserClose lets the owner close their own ticket.
func (uc *SupportChatUsecase) UserClose(ctx context.Context, userID, ticketID uint) error {
	ticket, err := uc.chat.GetTicket(ctx, ticketID)
	if err != nil {
		return err
	}
	if ticket.UserID != userID {
		return domain.ErrForbidden
	}
	ticket.Status = domain.TicketClosed
	ticket.UnreadStaff = 0
	return uc.chat.UpdateTicket(ctx, ticket)
}

func (uc *SupportChatUsecase) UserUnreadTotal(ctx context.Context, userID uint) (int64, error) {
	return uc.chat.UserUnreadTotal(ctx, userID)
}

// ---------- staff side (admin + support agents) ----------

// StaffTickets lists conversations for the support inbox with filters.
func (uc *SupportChatUsecase) StaffTickets(ctx context.Context, status domain.TicketStatus, assignedTo uint, limit, offset int) ([]domain.SupportTicket, int64, error) {
	switch status {
	case "", domain.TicketOpen, domain.TicketPending, domain.TicketAnswered, domain.TicketClosed:
	default:
		return nil, 0, domain.ErrValidation
	}
	return uc.chat.ListTicketsForStaff(ctx, domain.StaffTicketFilter{
		Status: status, AssignedTo: assignedTo, Limit: limit, Offset: offset,
	})
}

// StaffThread returns the messages of one ticket for support staff and marks
// the ticket read on the staff side.
func (uc *SupportChatUsecase) StaffThread(ctx context.Context, ticketID, afterID uint, limit int) (*domain.SupportTicket, []domain.SupportChatMessage, error) {
	ticket, err := uc.chat.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, nil, err
	}
	messages, err := uc.chat.ListMessages(ctx, ticketID, afterID, limit)
	if err != nil {
		return nil, nil, err
	}
	if ticket.UnreadStaff > 0 {
		if err := uc.chat.ResetStaffUnread(ctx, ticketID); err == nil {
			ticket.UnreadStaff = 0
		}
	}
	return ticket, messages, nil
}

// SendStaffMessage appends a reply from an admin/support agent.
func (uc *SupportChatUsecase) SendStaffMessage(ctx context.Context, staffID uint, in SendMessageInput) (*domain.SupportChatMessage, error) {
	if staffID == 0 {
		return nil, domain.ErrUnauthorized
	}
	ticket, err := uc.chat.GetTicket(ctx, in.TicketID)
	if err != nil {
		return nil, err
	}

	kind := normalizeKind(in.Kind)
	body := strings.TrimSpace(in.Body)
	if kind == domain.ChatText {
		if len([]rune(body)) < 1 || len([]rune(body)) > 4000 {
			return nil, domain.ErrValidation
		}
	} else {
		if body == "" {
			if kind == domain.ChatAudio {
				body = "پیام صوتی پشتیبانی"
			} else {
				body = "تصویر"
			}
		}
		if len([]rune(body)) > 4000 {
			return nil, domain.ErrValidation
		}
	}
	if kind != domain.ChatText && strings.TrimSpace(in.Attachment) == "" {
		return nil, domain.ErrValidation
	}
	if in.DurationMS < 0 || in.DurationMS > 600_000 {
		in.DurationMS = 0
	}

	staff, err := uc.chat.FindUserByID(ctx, staffID)
	if err != nil || staff == nil {
		return nil, domain.ErrNotFound
	}

	message := &domain.SupportChatMessage{
		TicketID:       ticket.ID,
		SenderID:       staffID,
		SenderName:     senderDisplayName(staff.Name),
		SenderSide:     domain.SideStaff,
		Kind:           kind,
		Body:           body,
		AttachmentURL:  strings.TrimSpace(in.Attachment),
		AttachmentMime: strings.TrimSpace(in.Mime),
		DurationMS:     in.DurationMS,
	}
	if err := uc.chat.AppendMessage(ctx, message); err != nil {
		return nil, err
	}

	// پاسخ کارشناس، تیکت را به او ارجاع می‌دهد (وقتی هنوز کسی نگرفته باشد).
	if ticket.AssignedTo == nil {
		assigned := staffID
		ticket.AssignedTo = &assigned
	}
	ticket.Status = domain.TicketAnswered
	ticket.UnreadUser++
	ticket.LastMessageAt = time.Now().UTC()
	if err := uc.chat.UpdateTicket(ctx, ticket); err != nil {
		return nil, err
	}

	uc.notifyUser(ctx, ticket, "پاسخ پشتیبانی وُدّا",
		"پشتیبانی به تیکت «"+ticket.Subject+"» پاسخ داد؛ برای دیدن پاسخ وارد گفتگو شوید.")
	return message, nil
}

// AssignTicket routes a ticket to a support agent (or self-assigns when
// agentID is 0). Only admins may re-route a ticket to someone else.
func (uc *SupportChatUsecase) AssignTicket(ctx context.Context, staffID, ticketID, agentID uint, is_admin bool) (*domain.SupportTicket, error) {
	ticket, err := uc.chat.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	target := agentID
	if target == 0 {
		target = staffID // خودارجاعی
	}
	if target != staffID && !is_admin {
		return nil, domain.ErrForbidden
	}
	agent, err := uc.chat.FindUserByID(ctx, target)
	if err != nil || agent == nil {
		return nil, domain.ErrNotFound
	}
	if agent.Role != domain.RoleAdmin && !agent.IsSupportAgent {
		return nil, domain.ErrValidation
	}
	ticket.AssignedTo = &target
	if ticket.Status == domain.TicketClosed {
		ticket.Status = domain.TicketPending
	}
	if err := uc.chat.UpdateTicket(ctx, ticket); err != nil {
		return nil, err
	}
	if target != staffID {
		uc.notifyUser2(ctx, target, "ارجاع تیکت پشتیبانی",
			"تیکت «"+ticket.Subject+"» برای پاسخ‌گویی به شما ارجاع شد.")
	}
	return ticket, nil
}

// SetTicketStatus closes or reopens a ticket from the staff side.
func (uc *SupportChatUsecase) SetTicketStatus(ctx context.Context, status domain.TicketStatus, ticketID uint) (*domain.SupportTicket, error) {
	switch status {
	case domain.TicketOpen, domain.TicketPending, domain.TicketAnswered, domain.TicketClosed:
	default:
		return nil, domain.ErrValidation
	}
	ticket, err := uc.chat.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	ticket.Status = status
	if status == domain.TicketClosed {
		ticket.UnreadUser = 0
		ticket.UnreadStaff = 0
	}
	if err := uc.chat.UpdateTicket(ctx, ticket); err != nil {
		return nil, err
	}
	if status == domain.TicketClosed {
		uc.notifyUser(ctx, ticket, "بستن تیکت پشتیبانی",
			"تیکت «"+ticket.Subject+"» بسته شد. اگر مسئلهٔ دیگری دارید تیکت جدیدی باز کنید.")
	}
	return ticket, nil
}

func (uc *SupportChatUsecase) StaffUnreadTotal(ctx context.Context) (int64, error) {
	return uc.chat.StaffUnreadTotal(ctx)
}

// ---------- support agents (کارشناسان پشتیبانی) ----------

func (uc *SupportChatUsecase) ListAgents(ctx context.Context) ([]domain.User, error) {
	return uc.chat.SupportAgents(ctx)
}

// AppointAgent grants the support-agent capability to an existing user found
// by mobile number (or id). Only admins can appoint/revoke.
func (uc *SupportChatUsecase) AppointAgent(ctx context.Context, mobile string, userID uint) (*domain.User, error) {
	var user *domain.User
	var err error
	if userID > 0 {
		user, err = uc.chat.FindUserByID(ctx, userID)
	} else {
		user, err = uc.chat.FindUserByMobile(ctx, normalizeMobile(mobile))
	}
	if err != nil || user == nil {
		return nil, domain.ErrNotFound
	}
	if err := uc.chat.SetSupportAgent(ctx, user.ID, true); err != nil {
		return nil, err
	}
	user.IsSupportAgent = true
	uc.notifyUser2(ctx, user.ID, "کارشناس پشتیبانی وُدّا",
		"شما به‌عنوان کارشناس پشتیبانی منصوب شدید؛ از پنل مدیریت به گفتگوهای کاربران پاسخ دهید.")
	return user, nil
}

func (uc *SupportChatUsecase) RevokeAgent(ctx context.Context, userID uint) error {
	if userID == 0 {
		return domain.ErrValidation
	}
	if err := uc.chat.SetSupportAgent(ctx, userID, false); err != nil {
		return err
	}
	uc.notifyUser2(ctx, userID, "لغو نقش پشتیبانی",
		"دسترسی کارشناس پشتیبانی شما متوقف شد.")
	return nil
}

// ---------- small utilities ----------

func itoa(n uint) string {
	return strconv.FormatUint(uint64(n), 10)
}

// notifyUser2 fans a notification to an arbitrary user id (agent assignment,
// appointment, ...). Kept separate from notifyUser to keep ticket semantics.
func (uc *SupportChatUsecase) notifyUser2(ctx context.Context, userID uint, title, body string) {
	if uc.notifs == nil {
		return
	}
	_ = uc.notifs.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}
