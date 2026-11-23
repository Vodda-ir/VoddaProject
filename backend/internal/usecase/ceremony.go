package usecase

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
)

// Ceremony time and money bounds.
const (
	// CeremonyMinLead is how soon a ceremony can be scheduled from now.
	CeremonyMinLead = 2 * time.Hour
	// CeremonyDeadlineMax bounds how long a broadcast stays open.
	CeremonyDeadlineMax = 72 * time.Hour
	// CeremonyDeadlineBeforeEvent closes the race this long before the event.
	CeremonyDeadlineBeforeEvent = 6 * time.Hour
	// CeremonyDeadlineFloor keeps ultra-late calls actionable long enough
	// for reciters to actually see and answer the race.
	CeremonyDeadlineFloor = 2 * time.Hour
	// CeremonyMaxSearchingCalls limits an organizer's simultaneous open calls.
	CeremonyMaxSearchingCalls = 3
	// CeremonyBroadcastLimit caps one call's fan-out to reciters.
	CeremonyBroadcastLimit = 500
	// CeremonyDepositRate is the escrow share of the agreed price.
	CeremonyDepositRate = 50
	// CeremonyCancelFreeHours is the full-refund boundary.
	CeremonyCancelFreeHours = 48 * time.Hour
	// CeremonyCancelHalfHours is the half-refund boundary.
	CeremonyCancelHalfHours = 24 * time.Hour
	// CeremonyPriceMin/Max bound one reciter's agreed ceremony price (Toman).
	CeremonyPriceMin int64 = 10_000
	CeremonyPriceMax int64 = 100_000_000
)

// CeremonyUsecase implements خدمات حضوری قرآنی: ceremony calls, reciter
// acceptance, firm contracts with escrow deposits and settlement.
type CeremonyUsecase struct {
	ceremonies domain.CeremonyRepository
	teachers   domain.TeacherRepository
	users      domain.UserRepository
	financial  domain.FinancialRepository
	payments   *PaymentUsecase
	notifs     domain.NotificationRepository
	cfg        *config.Config
}

// NewCeremonyUsecase wires the ceremony dependencies.
func NewCeremonyUsecase(
	ceremonies domain.CeremonyRepository,
	teachers domain.TeacherRepository,
	users domain.UserRepository,
	financial domain.FinancialRepository,
	payments *PaymentUsecase,
	notifs domain.NotificationRepository,
	cfg *config.Config,
) *CeremonyUsecase {
	return &CeremonyUsecase{
		ceremonies: ceremonies,
		teachers:   teachers,
		users:      users,
		financial:  financial,
		payments:   payments,
		notifs:     notifs,
		cfg:        cfg,
	}
}

// CreateCeremonyCallInput is the organizer's broadcast request.
type CreateCeremonyCallInput struct {
	OfficialServiceID uint
	Note              string
	ScheduledAt       time.Time
	City              string
	VenueHint         string
	GuestsCount       int
	RecitersNeeded    int
	BudgetMin         int64
	BudgetMax         int64
	Audience          string
}

// CreateCall broadcasts a new ceremony call to eligible reciters.
func (uc *CeremonyUsecase) CreateCall(ctx context.Context, organizerID uint, in CreateCeremonyCallInput) (*domain.CeremonyCallView, error) {
	if err := uc.ExpireSweep(ctx); err != nil {
		log.Printf("ceremony: lazy expire: %v", err)
	}

	in.City = strings.TrimSpace(in.City)
	in.VenueHint = strings.TrimSpace(in.VenueHint)
	in.Audience = normalizeAudience(in.Audience)
	if in.OfficialServiceID == 0 || in.City == "" || len(in.City) > 80 || len(in.VenueHint) > 255 {
		return nil, domain.ErrValidation
	}
	if len(in.Note) > 300 {
		return nil, domain.ErrValidation
	}
	if in.ScheduledAt.Before(time.Now().Add(CeremonyMinLead)) {
		return nil, domain.ErrValidation
	}
	if in.BudgetMin < 0 || in.BudgetMax < 0 || (in.BudgetMax > 0 && in.BudgetMax < in.BudgetMin) {
		return nil, domain.ErrValidation
	}
	if in.GuestsCount < 0 || in.GuestsCount > 100_000 {
		return nil, domain.ErrValidation
	}

	svc, err := uc.teachers.OfficialServiceByID(ctx, in.OfficialServiceID)
	if err != nil || !svc.Active || svc.Mode != domain.OfficialServiceModeInPerson {
		return nil, domain.ErrValidation
	}
	recitersNeeded := in.RecitersNeeded
	if recitersNeeded <= 0 {
		recitersNeeded = 1
	}
	if recitersNeeded > 10 {
		return nil, domain.ErrValidation
	}
	if recitersNeeded > 1 && !svc.GroupCapable {
		recitersNeeded = 1
	}

	organizer, err := uc.users.ByID(ctx, organizerID)
	if err != nil {
		return nil, err
	}
	if !organizer.Active {
		return nil, domain.ErrForbidden
	}
	searching, err := uc.ceremonies.SearchingCallsForOrganizer(ctx, organizerID)
	if err != nil {
		return nil, err
	}
	if len(searching) >= CeremonyMaxSearchingCalls {
		return nil, domain.ErrConflict
	}

	deadline := in.ScheduledAt.Add(-CeremonyDeadlineBeforeEvent)
	if maxDeadline := time.Now().Add(CeremonyDeadlineMax); deadline.After(maxDeadline) {
		deadline = maxDeadline
	}
	if floor := time.Now().Add(CeremonyDeadlineFloor); deadline.Before(floor) {
		deadline = floor
	}

	call := &domain.CeremonyCall{
		OrganizerID:       organizerID,
		OfficialServiceID: svc.ID,
		Title:             svc.Title,
		Icon:              svc.Icon,
		Note:              strings.TrimSpace(in.Note),
		ScheduledAt:       in.ScheduledAt,
		City:              in.City,
		VenueHint:         in.VenueHint,
		GuestsCount:       in.GuestsCount,
		RecitersNeeded:    recitersNeeded,
		BudgetMin:         in.BudgetMin,
		BudgetMax:         in.BudgetMax,
		Audience:          in.Audience,
		Status:            domain.CeremonySearching,
		Deadline:          deadline,
		DepositRate:       CeremonyDepositRate,
	}
	if err := uc.ceremonies.CreateCall(ctx, call); err != nil {
		return nil, err
	}

	// Best-effort broadcast to every eligible reciter on the platform —
	// not just those with a registered presence service, otherwise a fresh
	// marketplace would never deliver its first ceremony call.
	broadcast := "🔔 فراخوان مراسم: " + svc.Title
	body := "یک مراسم «" + svc.Title + "» در " + in.City + " ثبت شد. اگر آمادگی دارید، با قیمت خود پذیرش دهید."
	for _, provider := range uc.broadcastAudience(ctx, in.Audience, organizerID) {
		uc.notify(ctx, provider.UserID, broadcast, body)
	}
	return uc.callView(ctx, call)
}

// broadcastAudience loads approved, available teachers the audience gender
// rule admits, excluding the organizer; used for ceremony call fan-out.
func (uc *CeremonyUsecase) broadcastAudience(ctx context.Context, audience string, excludeUserID uint) []*domain.Teacher {
	teachers, _, err := uc.teachers.List(ctx, domain.TeacherFilter{Status: domain.TeacherApproved, Limit: CeremonyBroadcastLimit})
	if err != nil {
		log.Printf("ceremony: broadcast audience lookup: %v", err)
		return nil
	}
	var out []*domain.Teacher
	for i := range teachers {
		teacher := &teachers[i]
		if !teacher.Available || teacher.UserID == excludeUserID {
			continue
		}
		if !audienceAdmits(audience, teacher.Female) {
			continue
		}
		out = append(out, teacher)
	}
	return out
}

func audienceAdmits(audience string, female bool) bool {
	switch audience {
	case domain.CeremonyAudienceBrothers:
		return !female
	case domain.CeremonyAudienceSisters:
		return female
	default:
		return true
	}
}

func normalizeAudience(a string) string {
	switch a {
	case domain.CeremonyAudienceBrothers, domain.CeremonyAudienceSisters:
		return a
	default:
		return domain.CeremonyAudienceBoth
	}
}

// OrganizerCalls lists the organizer's own ceremony calls (with offers).
func (uc *CeremonyUsecase) OrganizerCalls(ctx context.Context, organizerID uint, limit int) ([]domain.CeremonyCallView, error) {
	if err := uc.ExpireSweep(ctx); err != nil {
		log.Printf("ceremony: lazy expire: %v", err)
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	calls, err := uc.ceremonies.CallsForOrganizer(ctx, organizerID, limit)
	if err != nil {
		return nil, err
	}
	views := make([]domain.CeremonyCallView, 0, len(calls))
	for i := range calls {
		view, err := uc.callView(ctx, &calls[i])
		if err != nil {
			return nil, err
		}
		views = append(views, *view)
	}
	return views, nil
}

// CallViewForOrganizer returns one of the organizer's calls with offers.
func (uc *CeremonyUsecase) CallViewForOrganizer(ctx context.Context, organizerID, callID uint) (*domain.CeremonyCallView, error) {
	call, err := uc.ceremonies.CallByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.OrganizerID != organizerID {
		return nil, domain.ErrForbidden
	}
	return uc.callView(ctx, call)
}

func (uc *CeremonyUsecase) callView(ctx context.Context, call *domain.CeremonyCall) (*domain.CeremonyCallView, error) {
	offers, err := uc.ceremonies.OffersOfCall(ctx, call.ID)
	if err != nil {
		return nil, err
	}
	views := make([]domain.CeremonyOfferView, 0, len(offers))
	for i := range offers {
		views = append(views, *uc.offerView(&offers[i]))
	}
	return &domain.CeremonyCallView{Call: call, Offers: views}, nil
}

func (uc *CeremonyUsecase) offerView(offer *domain.CeremonyOffer) *domain.CeremonyOfferView {
	view := &domain.CeremonyOfferView{
		ID:          offer.ID,
		CallID:      offer.CallID,
		Status:      offer.Status,
		Price:       offer.Price,
		Message:     offer.Message,
		RespondedAt: offer.RespondedAt,
	}
	if offer.Teacher != nil {
		view.Provider = uc.providerView(offer.Teacher, false)
	}
	return view
}

// providerView projects a teacher for the reciter-facing surfaces. When
// withServices is true the active presence services are attached.
func (uc *CeremonyUsecase) providerView(teacher *domain.Teacher, withServices bool) *domain.CeremonyProviderView {
	view := &domain.CeremonyProviderView{
		TeacherID: teacher.ID,
		Tag:       teacher.Tag,
		Field:     teacher.Field,
		City:      teacher.City,
		Level:     teacher.Level,
		Tier:      teacher.Tier,
		Female:    teacher.Female,
		Rating:    teacher.Rating,
		Reviews:   teacher.Reviews,
		Sessions:  teacher.Sessions,
		Bio:       teacher.Bio,
		Samples:   []domain.CeremonySampleView{},
	}
	if teacher.User != nil {
		view.Name = teacher.User.Name
		view.AvatarURL = teacher.User.AvatarURL
	}
	for _, sample := range teacher.Samples {
		view.Samples = append(view.Samples, domain.CeremonySampleView{
			ID: sample.ID, Title: sample.Title, URL: sample.URL, Length: sample.Length,
		})
	}
	if withServices {
		if presence, err := uc.ceremonies.PresenceServicesOfTeacher(context.Background(), teacher.ID); err == nil {
			services := make([]domain.PresenceService, 0, len(presence))
			for i := range presence {
				if presence[i].Active {
					services = append(services, presence[i])
				}
			}
			view.Services = services
		}
	}
	return view
}

// ChooseOffer turns a waiting offer into a firm contract draft: the booking
// is created in deposit_pending and, when the call needs no more reciters,
// the race closes and the remaining candidates are released.
func (uc *CeremonyUsecase) ChooseOffer(ctx context.Context, organizerID, callID, offerID uint) (*domain.CeremonyBookingView, error) {
	call, err := uc.ceremonies.CallByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.OrganizerID != organizerID {
		return nil, domain.ErrForbidden
	}
	if call.Status != domain.CeremonySearching || time.Now().After(call.Deadline) {
		return nil, domain.ErrConflict
	}
	offer, err := uc.ceremonies.OfferByID(ctx, offerID)
	if err != nil || offer.CallID != call.ID {
		return nil, domain.ErrNotFound
	}
	if offer.Status != domain.CeremonyOfferWaiting {
		return nil, domain.ErrConflict
	}
	teacher := offer.Teacher
	if teacher == nil {
		return nil, domain.ErrNotFound
	}

	booking := &domain.CeremonyBooking{
		CallID:            call.ID,
		OfferID:           offer.ID,
		ProviderID:        teacher.ID,
		ProviderUserID:    teacher.UserID,
		OrganizerID:       organizerID,
		OfficialServiceID: call.OfficialServiceID,
		ServiceTitle:      call.Title,
		ScheduledAt:       call.ScheduledAt,
		City:              call.City,
		Venue:             call.VenueHint,
		GuestsCount:       call.GuestsCount,
		Audience:          call.Audience,
		Price:             offer.Price,
		CommissionRate:    uc.cfg.PlatformCommissionPercent,
		CommissionAmount:  offer.Price * int64(uc.cfg.PlatformCommissionPercent) / 100,
		DepositRate:       call.DepositRate,
		DepositAmount:     offer.Price * int64(call.DepositRate) / 100,
		Note:              call.Note,
		Status:            domain.CeremonyBookingDepositPending,
	}
	if err := uc.ceremonies.CreateBooking(ctx, booking); err != nil {
		return nil, err
	}
	offer.Status = domain.CeremonyOfferChosen
	if err := uc.ceremonies.UpdateOffer(ctx, offer); err != nil {
		return nil, err
	}

	chosen, err := uc.ceremonies.ChosenOfferCount(ctx, call.ID)
	if err == nil && int(chosen) >= call.RecitersNeeded {
		call.Status = domain.CeremonyAssigned
		if err := uc.ceremonies.UpdateCall(ctx, call); err != nil {
			log.Printf("ceremony: close call: %v", err)
		}
		others, err := uc.ceremonies.OffersOfCall(ctx, call.ID)
		if err == nil {
			for i := range others {
				other := &others[i]
				if other.ID == offer.ID || other.Status != domain.CeremonyOfferWaiting {
					continue
				}
				other.Status = domain.CeremonyOfferReleased
				if err := uc.ceremonies.UpdateOffer(ctx, other); err == nil && other.Teacher != nil {
					uc.notify(ctx, other.Teacher.UserID,
						"فراخوان مراسم بسته شد",
						"برگزارکننده این‌بار قاری دیگری را انتخاب کرد؛ فراخوان‌های بعدی را از دست ندهید.")
				}
			}
		}
	}

	if teacher.User != nil {
		uc.notify(ctx, teacher.UserID,
			"پذیرش شما انتخاب شد",
			"قرارداد مراسم «"+call.Title+"» ساخته شد. پس از پرداخت ودیعه توسط برگزارکننده، مراسم قطعی می‌شود.")
	}
	return uc.bookingView(ctx, booking, organizerID)
}

// CancelCall aborts a still-open ceremony call and releases all candidates.
func (uc *CeremonyUsecase) CancelCall(ctx context.Context, organizerID, callID uint) error {
	call, err := uc.ceremonies.CallByID(ctx, callID)
	if err != nil {
		return err
	}
	if call.OrganizerID != organizerID {
		return domain.ErrForbidden
	}
	if call.Status != domain.CeremonySearching {
		return domain.ErrConflict
	}
	call.Status = domain.CeremonyCanceled
	if err := uc.ceremonies.UpdateCall(ctx, call); err != nil {
		return err
	}
	offers, err := uc.ceremonies.OffersOfCall(ctx, call.ID)
	if err == nil {
		for i := range offers {
			offer := &offers[i]
			if offer.Status != domain.CeremonyOfferWaiting {
				continue
			}
			offer.Status = domain.CeremonyOfferReleased
			if err := uc.ceremonies.UpdateOffer(ctx, offer); err == nil && offer.Teacher != nil {
				uc.notify(ctx, offer.Teacher.UserID,
					"فراخوان مراسم لغو شد",
					"برگزارکننده فراخوان «"+call.Title+"» را لغو کرد.")
			}
		}
	}
	return nil
}

// DirectBookingInput books a reciter straight from their presence service.
type DirectBookingInput struct {
	PresenceServiceID uint
	ScheduledAt       time.Time
	City              string
	VenueHint         string
	Note              string
}

// DirectBooking creates a deposit_pending contract from a presence service,
// bypassing the call race.
func (uc *CeremonyUsecase) DirectBooking(ctx context.Context, userID uint, in DirectBookingInput) (*domain.CeremonyBookingView, error) {
	in.City = strings.TrimSpace(in.City)
	in.VenueHint = strings.TrimSpace(in.VenueHint)
	if in.PresenceServiceID == 0 || in.City == "" || len(in.City) > 80 || len(in.VenueHint) > 255 || len(in.Note) > 300 {
		return nil, domain.ErrValidation
	}
	if in.ScheduledAt.Before(time.Now().Add(CeremonyMinLead)) {
		return nil, domain.ErrValidation
	}
	user, err := uc.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !user.Active {
		return nil, domain.ErrForbidden
	}
	service, err := uc.ceremonies.PresenceServiceByID(ctx, in.PresenceServiceID)
	if err != nil {
		return nil, err
	}
	if !service.Active || service.Teacher == nil {
		return nil, domain.ErrValidation
	}
	teacher := service.Teacher
	if teacher.Status != domain.TeacherApproved || !teacher.Available {
		return nil, domain.ErrTeacherNotReady
	}
	if teacher.UserID == userID {
		return nil, domain.ErrSelfBooking
	}

	booking := &domain.CeremonyBooking{
		ProviderID:        teacher.ID,
		ProviderUserID:    teacher.UserID,
		OrganizerID:       userID,
		OfficialServiceID: service.OfficialServiceID,
		ServiceTitle:      service.Title,
		ScheduledAt:       in.ScheduledAt,
		City:              in.City,
		Venue:             in.VenueHint,
		Audience:          domain.CeremonyAudienceBoth,
		Price:             service.BasePrice,
		CommissionRate:    uc.cfg.PlatformCommissionPercent,
		CommissionAmount:  service.BasePrice * int64(uc.cfg.PlatformCommissionPercent) / 100,
		DepositRate:       CeremonyDepositRate,
		DepositAmount:     service.BasePrice * CeremonyDepositRate / 100,
		Note:              strings.TrimSpace(in.Note),
		Status:            domain.CeremonyBookingDepositPending,
	}
	if err := uc.ceremonies.CreateBooking(ctx, booking); err != nil {
		return nil, err
	}
	uc.notify(ctx, teacher.UserID,
		"درخواست مراسم جدید",
		"یک برگزارکننده برای «"+service.Title+"» درخواست مستقیم ثبت کرد؛ منتظر پرداخت ودیعه است.")
	return uc.bookingView(ctx, booking, userID)
}

// MyBookings lists every ceremony contract the user participates in.
func (uc *CeremonyUsecase) MyBookings(ctx context.Context, userID uint, limit int) ([]domain.CeremonyBookingView, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	bookings, err := uc.ceremonies.BookingsForUser(ctx, userID, limit)
	if err != nil {
		return nil, err
	}
	views := make([]domain.CeremonyBookingView, 0, len(bookings))
	for i := range bookings {
		view, err := uc.bookingView(ctx, &bookings[i], userID)
		if err != nil {
			return nil, err
		}
		views = append(views, *view)
	}
	return views, nil
}

// BookingView returns one booking with role-aware privacy (venue and phones
// unlock once the deposit is in escrow).
func (uc *CeremonyUsecase) BookingView(ctx context.Context, userID, bookingID uint) (*domain.CeremonyBookingView, error) {
	booking, err := uc.ceremonies.BookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if booking.OrganizerID != userID && booking.ProviderUserID != userID {
		return nil, domain.ErrForbidden
	}
	return uc.bookingView(ctx, booking, userID)
}

func (uc *CeremonyUsecase) bookingView(ctx context.Context, booking *domain.CeremonyBooking, viewerID uint) (*domain.CeremonyBookingView, error) {
	role := "organizer"
	if viewerID != 0 && booking.ProviderUserID == viewerID && booking.OrganizerID != viewerID {
		role = "provider"
	}
	firm := booking.Status == domain.CeremonyBookingDepositPaid || booking.Status == domain.CeremonyBookingSettled

	view := &domain.CeremonyBookingView{
		ID:               booking.ID,
		CallID:           booking.CallID,
		Role:             role,
		Status:           booking.Status,
		ScheduledAt:      booking.ScheduledAt,
		City:             booking.City,
		Venue:            "",
		GuestsCount:      booking.GuestsCount,
		Audience:         booking.Audience,
		ServiceTitle:     booking.ServiceTitle,
		Price:            booking.Price,
		CommissionRate:   booking.CommissionRate,
		CommissionAmount: booking.CommissionAmount,
		DepositRate:      booking.DepositRate,
		DepositAmount:    booking.DepositAmount,
		Note:             booking.Note,
		CreatedAt:        booking.CreatedAt,
		SettledAt:        booking.SettledAt,
	}
	if firm {
		view.Venue = booking.Venue
	}
	if booking.Provider != nil {
		view.Provider = domain.CeremonyBookingProvider{
			TeacherID: booking.Provider.ID,
			Name:      providerDisplayName(booking.Provider),
			AvatarURL: providerAvatar(booking.Provider),
			Tag:       booking.Provider.Tag,
			City:      booking.Provider.City,
			Tier:      booking.Provider.Tier,
		}
		if firm && booking.Provider.User != nil {
			view.Provider.Phone = booking.Provider.User.Mobile
		}
	}
	if booking.Organizer != nil {
		view.Organizer = domain.CeremonyBookingParty{
			Name:      organizerDisplayName(booking.Organizer),
			AvatarURL: booking.Organizer.AvatarURL,
		}
		if firm {
			view.Organizer.Phone = booking.Organizer.Mobile
		}
	}
	return view, nil
}

func providerDisplayName(teacher *domain.Teacher) string {
	if teacher.User != nil && strings.TrimSpace(teacher.User.Name) != "" {
		return strings.TrimSpace(teacher.User.Name)
	}
	return "قاری وُدّا"
}

func providerAvatar(teacher *domain.Teacher) string {
	if teacher.User != nil {
		return teacher.User.AvatarURL
	}
	return ""
}

func organizerDisplayName(user *domain.User) string {
	name := strings.TrimSpace(user.Name)
	if name == "" {
		return "برگزارکننده"
	}
	// Privacy: only the first given name leaves the platform before contact
	// details unlock.
	if parts := strings.Fields(name); len(parts) > 0 {
		return parts[0]
	}
	return name
}

// CeremonyPayResult is the pay-deposit outcome: wallet payments settle
// immediately; gateway payments carry the OnlinePG token.
type CeremonyPayResult struct {
	Booking       *domain.CeremonyBookingView `json:"booking"`
	PaidViaWallet bool                        `json:"paid_via_wallet,omitempty"`
	Token         string                      `json:"token,omitempty"`
	ResNum        string                      `json:"res_num,omitempty"`
	Amount        int64                       `json:"amount,omitempty"`
}

// PayDeposit funds the escrow: wallet settles instantly, the gateway path
// returns a Sep token the payer's browser posts to OnlinePG.
func (uc *CeremonyUsecase) PayDeposit(ctx context.Context, userID, bookingID uint, method, returnPath string) (*CeremonyPayResult, error) {
	booking, err := uc.ceremonies.BookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if booking.OrganizerID != userID {
		return nil, domain.ErrForbidden
	}
	if booking.Status != domain.CeremonyBookingDepositPending {
		return nil, domain.ErrConflict
	}
	if method != "wallet" && method != "gateway" {
		return nil, domain.ErrValidation
	}

	if method == "wallet" {
		if _, err := uc.financial.PayCeremonyDepositFromWallet(ctx, booking.ID, userID, booking.DepositAmount); err != nil {
			return nil, err
		}
		updated, err := uc.ceremonies.BookingByID(ctx, booking.ID)
		if err != nil {
			return nil, err
		}
		uc.notify(ctx, booking.ProviderUserID,
			"مراسم قطعی شد",
			"ودیعه قرارداد «"+booking.ServiceTitle+"» پرداخت شد؛ جزئیات مکان و زمان در قرارداد فعال است.")
		view, err := uc.bookingView(ctx, updated, userID)
		if err != nil {
			return nil, err
		}
		return &CeremonyPayResult{Booking: view, PaidViaWallet: true}, nil
	}

	if uc.payments == nil {
		return nil, domain.ErrForbidden
	}
	if err := uc.payments.FailPendingCeremonyOrders(ctx, booking.ID); err != nil {
		log.Printf("ceremony: fail stale orders: %v", err)
	}
	user, err := uc.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	result, err := uc.payments.CreateCeremonyDepositPayment(ctx, user, booking, returnPath)
	if err != nil {
		return nil, err
	}
	view, err := uc.bookingView(ctx, booking, userID)
	if err != nil {
		return nil, err
	}
	return &CeremonyPayResult{Booking: view, Token: result.Token, ResNum: result.ResNum, Amount: result.Amount}, nil
}

// ConfirmBooking marks the executed ceremony settled and pays the reciter.
func (uc *CeremonyUsecase) ConfirmBooking(ctx context.Context, userID, bookingID uint) (*domain.CeremonyBookingView, error) {
	booking, err := uc.ceremonies.BookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if booking.OrganizerID != userID {
		return nil, domain.ErrForbidden
	}
	if booking.Status != domain.CeremonyBookingDepositPaid {
		return nil, domain.ErrConflict
	}
	if time.Now().Before(booking.ScheduledAt) {
		return nil, domain.ErrConflict
	}
	payout := booking.Price - booking.CommissionAmount
	if payout < 0 {
		return nil, domain.ErrInternal
	}
	if _, err := uc.financial.SettleCeremonyBooking(ctx, booking.ID, booking.ProviderUserID, payout, booking.CommissionAmount, booking.Price); err != nil {
		return nil, err
	}
	updated, err := uc.ceremonies.BookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	uc.notify(ctx, booking.ProviderUserID,
		"تسویه مراسم انجام شد",
		fmt.Sprintf("قرارداد «%s» تسویه شد و مبلغ به کیف پول شما اضافه گردید.", booking.ServiceTitle))
	uc.notify(ctx, booking.OrganizerID,
		"مراسم تکمیل شد",
		"از همراهی شما سپاسگزاریم؛ اگر مایل باشید برای قاری نظر ثبت کنید.")
	view, err := uc.bookingView(ctx, updated, userID)
	if err != nil {
		return nil, err
	}
	return view, nil
}

// CancelBooking applies the escrow refund policy. Pending-deposit contracts
// cancel freely; funded contracts follow the time-based policy for the
// organizer and full protection for a reciter whose contract is dropped.
func (uc *CeremonyUsecase) CancelBooking(ctx context.Context, userID, bookingID uint) (*domain.CeremonyBookingView, error) {
	booking, err := uc.ceremonies.BookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	isOrganizer := booking.OrganizerID == userID
	isProvider := booking.ProviderUserID == userID
	if !isOrganizer && !isProvider {
		return nil, domain.ErrForbidden
	}
	if booking.Status != domain.CeremonyBookingDepositPaid && booking.Status != domain.CeremonyBookingDepositPending {
		return nil, domain.ErrConflict
	}

	deposit := booking.DepositAmount
	if booking.Status == domain.CeremonyBookingDepositPending {
		deposit = 0
	}
	var organizerRefund, providerShare int64
	if deposit > 0 {
		if isProvider {
			organizerRefund, providerShare = deposit, 0
		} else {
			delta := time.Until(booking.ScheduledAt)
			switch {
			case delta >= CeremonyCancelFreeHours:
				organizerRefund, providerShare = deposit, 0
			case delta >= CeremonyCancelHalfHours:
				organizerRefund = deposit / 2
				providerShare = deposit - organizerRefund
			default:
				organizerRefund, providerShare = 0, deposit
			}
		}
	}
	if _, err := uc.financial.CancelCeremonyBooking(ctx, booking.ID, organizerRefund, providerShare); err != nil {
		return nil, err
	}
	updated, err := uc.ceremonies.BookingByID(ctx, booking.ID)
	if err != nil {
		return nil, err
	}
	if isOrganizer {
		uc.notify(ctx, booking.ProviderUserID, "قرارداد مراسم لغو شد",
			"قرارداد «"+booking.ServiceTitle+"» توسط برگزارکننده لغو شد؛ سهم شما طبق سیاست لغو اعمال گردید.")
	} else {
		uc.notify(ctx, booking.OrganizerID, "انصراف قاری",
			"قاری قرارداد «"+booking.ServiceTitle+"» را لغو کرد؛ ودیعه به‌طور کامل به کیف پول شما بازگشت.")
	}
	view, err := uc.bookingView(ctx, updated, userID)
	if err != nil {
		return nil, err
	}
	return view, nil
}

// ── Teacher (reciter) side ──

// TeacherCeremonyInbox is the reciter's پذیرش payload: open calls their
// presence services qualify for, plus their placed offers.
func (uc *CeremonyUsecase) TeacherCeremonyInbox(ctx context.Context, userID uint) (*domain.CeremonyTeacherInbox, error) {
	if err := uc.ExpireSweep(ctx); err != nil {
		log.Printf("ceremony: lazy expire: %v", err)
	}
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	inbox := &domain.CeremonyTeacherInbox{
		Calls:  []domain.TeacherCeremonyCallView{},
		Offers: []domain.CeremonyOfferView{},
	}
	if teacher.Status != domain.TeacherApproved || !teacher.Available {
		return inbox, nil
	}
	services, err := uc.ceremonies.PresenceServicesOfTeacher(ctx, teacher.ID)
	if err != nil {
		return nil, err
	}
	matched := make(map[uint]bool, len(services))
	for i := range services {
		if services[i].Active {
			matched[services[i].OfficialServiceID] = true
		}
	}
	open, err := uc.ceremonies.OpenCalls(ctx, teacher.Female, teacher.UserID, 30)
	if err != nil {
		return nil, err
	}
	for i := range open {
		call := &open[i]
		// Venue stays confidential until a firm contract exists.
		call.VenueHint = ""
		view := domain.TeacherCeremonyCallView{
			Call:            call,
			MatchesServices: matched[call.OfficialServiceID],
		}
		if myOffer, err := uc.ceremonies.MyOfferOfCall(ctx, call.ID, teacher.ID); err == nil && myOffer != nil {
			view.Accepted = true
			offerView := uc.offerView(myOffer)
			view.MyOffer = offerView
		}
		inbox.Calls = append(inbox.Calls, view)
	}
	placed, err := uc.ceremonies.OffersOfTeacher(ctx, teacher.ID, 50)
	if err != nil {
		return nil, err
	}
	for i := range placed {
		inbox.Offers = append(inbox.Offers, *uc.offerView(&placed[i]))
	}
	return inbox, nil
}

// TeacherAccept answers a ceremony call with a price. The price defaults to
// the teacher's presence service for the requested topic.
func (uc *CeremonyUsecase) TeacherAccept(ctx context.Context, userID, callID uint, price *int64, message string) (*domain.CeremonyOfferView, error) {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved || !teacher.Verified || !teacher.Available {
		return nil, domain.ErrTeacherNotReady
	}
	call, err := uc.ceremonies.CallByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.OrganizerID == teacher.UserID {
		return nil, domain.ErrSelfBooking
	}
	if call.Status != domain.CeremonySearching || time.Now().After(call.Deadline) {
		return nil, domain.ErrConflict
	}
	if !audienceAdmits(call.Audience, teacher.Female) {
		return nil, domain.ErrForbidden
	}
	if existing, err := uc.ceremonies.MyOfferOfCall(ctx, call.ID, teacher.ID); err == nil && existing != nil {
		return uc.offerView(existing), nil // idempotent re-accept
	}

	// Quality note: audio-bearing ceremonies prefer reciters with published
	// work samples, but samples cannot be uploaded anywhere in the product
	// yet — a hard gate here would deadlock every accept. The organizer
	// still reviews profile, rating and reviews before choosing.
	full, err := uc.teachers.ByID(ctx, teacher.ID)
	if err != nil {
		return nil, err
	}

	agreed := int64(0)
	if price != nil && *price > 0 {
		agreed = *price
	} else {
		services, err := uc.ceremonies.PresenceServicesOfTeacher(ctx, teacher.ID)
		if err != nil {
			return nil, err
		}
		for i := range services {
			if services[i].Active && services[i].OfficialServiceID == call.OfficialServiceID {
				agreed = services[i].BasePrice
				break
			}
		}
	}
	if agreed < CeremonyPriceMin || agreed > CeremonyPriceMax {
		return nil, domain.ErrValidation
	}
	if len(message) > 300 {
		return nil, domain.ErrValidation
	}

	offer := &domain.CeremonyOffer{
		CallID:      call.ID,
		TeacherID:   teacher.ID,
		Status:      domain.CeremonyOfferWaiting,
		Price:       agreed,
		Message:     strings.TrimSpace(message),
		RespondedAt: time.Now(),
	}
	if err := uc.ceremonies.CreateOffer(ctx, offer); err != nil {
		if existing, getErr := uc.ceremonies.MyOfferOfCall(ctx, call.ID, teacher.ID); getErr == nil && existing != nil {
			return uc.offerView(existing), nil
		}
		return nil, domain.ErrConflict
	}
	if n, err := uc.ceremonies.CountOffers(ctx, call.ID); err == nil {
		call.OfferCount = int(n)
		if err := uc.ceremonies.UpdateCall(ctx, call); err != nil {
			log.Printf("ceremony: offer count update: %v", err)
		}
	}
	offer.Teacher = full
	if call.Organizer != nil {
		name := providerDisplayName(full)
		uc.notify(ctx, call.OrganizerID,
			"پذیرش جدید برای مراسم",
			name+" برای «"+call.Title+"» پذیرش داد. پرفایل و قیمت را ببینید و انتخاب کنید.")
	}
	return uc.offerView(offer), nil
}

// TeacherWithdraw pulls a waiting offer back.
func (uc *CeremonyUsecase) TeacherWithdraw(ctx context.Context, userID, offerID uint) error {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	offer, err := uc.ceremonies.OfferByID(ctx, offerID)
	if err != nil || offer.TeacherID != teacher.ID {
		return domain.ErrNotFound
	}
	if offer.Status != domain.CeremonyOfferWaiting {
		return domain.ErrConflict
	}
	offer.Status = domain.CeremonyOfferReleased
	if err := uc.ceremonies.UpdateOffer(ctx, offer); err != nil {
		return err
	}
	call := offer.Call
	if call != nil && call.OrganizerID > 0 {
		uc.notify(ctx, call.OrganizerID,
			"انصراف قاری",
			providerDisplayName(teacher)+" از فراخوان «"+call.Title+"» انصراف داد؛ پذیرش‌های دیگران همچنان فعال است.")
	}
	return nil
}

// ── Presence services (قاری's in-person offerings) ──

// MyPresenceServices lists the teacher's in-person offerings.
func (uc *CeremonyUsecase) MyPresenceServices(ctx context.Context, userID uint) ([]domain.PresenceService, error) {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return uc.ceremonies.PresenceServicesOfTeacher(ctx, teacher.ID)
}

// PresenceServiceInput is the create/update payload. The title always comes
// from the official catalog entry — like online services, reciters never
// invent titles.
type PresenceServiceInput struct {
	OfficialServiceID uint
	BasePrice         int64
	Duration          int
	Cities            string
	Note              string
}

func (uc *CeremonyUsecase) validatePresenceInput(ctx context.Context, in PresenceServiceInput) (*domain.OfficialService, error) {
	svc, err := uc.teachers.OfficialServiceByID(ctx, in.OfficialServiceID)
	if err != nil || !svc.Active || svc.Mode != domain.OfficialServiceModeInPerson {
		return nil, domain.ErrValidation
	}
	if in.BasePrice < CeremonyPriceMin || in.BasePrice > CeremonyPriceMax {
		return nil, domain.ErrValidation
	}
	if in.Duration == 0 {
		in.Duration = 60
	}
	if in.Duration < 15 || in.Duration > 600 {
		return nil, domain.ErrValidation
	}
	if len(in.Cities) > 255 || len(in.Note) > 300 {
		return nil, domain.ErrValidation
	}
	return svc, nil
}

// AddPresenceService publishes a new in-person offering.
func (uc *CeremonyUsecase) AddPresenceService(ctx context.Context, userID uint, in PresenceServiceInput) (*domain.PresenceService, error) {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved {
		return nil, domain.ErrTeacherNotReady
	}
	svc, err := uc.validatePresenceInput(ctx, in)
	if err != nil {
		return nil, err
	}
	if count, err := uc.ceremonies.CountPresenceServicesOfTeacher(ctx, teacher.ID); err == nil && count >= domain.PresenceServiceMaxPerTeacher {
		return nil, domain.ErrConflict
	}
	service := &domain.PresenceService{
		TeacherID:         teacher.ID,
		OfficialServiceID: svc.ID,
		Title:             svc.Title,
		BasePrice:         in.BasePrice,
		Duration:          in.Duration,
		Cities:            strings.TrimSpace(in.Cities),
		Note:              strings.TrimSpace(in.Note),
		Active:            true,
	}
	if err := uc.ceremonies.CreatePresenceService(ctx, service); err != nil {
		return nil, err
	}
	return service, nil
}

// UpdatePresenceService edits the teacher's own offering.
func (uc *CeremonyUsecase) UpdatePresenceService(ctx context.Context, userID, serviceID uint, in PresenceServiceInput) (*domain.PresenceService, error) {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	service, err := uc.ceremonies.PresenceServiceByID(ctx, serviceID)
	if err != nil {
		return nil, err
	}
	if service.TeacherID != teacher.ID {
		return nil, domain.ErrForbidden
	}
	svc, err := uc.validatePresenceInput(ctx, in)
	if err != nil {
		return nil, err
	}
	service.OfficialServiceID = svc.ID
	service.Title = svc.Title
	service.BasePrice = in.BasePrice
	service.Duration = in.Duration
	service.Cities = strings.TrimSpace(in.Cities)
	service.Note = strings.TrimSpace(in.Note)
	if err := uc.ceremonies.UpdatePresenceService(ctx, service); err != nil {
		return nil, err
	}
	return service, nil
}

// DeletePresenceService removes the teacher's own offering.
func (uc *CeremonyUsecase) DeletePresenceService(ctx context.Context, userID, serviceID uint) error {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	return uc.ceremonies.DeletePresenceService(ctx, teacher.ID, serviceID)
}

// ── Public presence catalog ──

// PresenceProviders lists approved reciters that publish at least one active
// presence service, optionally filtered by city and catalog entry.
func (uc *CeremonyUsecase) PresenceProviders(ctx context.Context, city string, officialServiceID uint, limit int) ([]domain.CeremonyProviderView, error) {
	if limit <= 0 || limit > 60 {
		limit = 60
	}
	ids, err := uc.ceremonies.PresenceServiceTeacherIDs(ctx, 120)
	if err != nil {
		return nil, err
	}
	city = strings.TrimSpace(city)
	views := make([]domain.CeremonyProviderView, 0, len(ids))
	for _, id := range ids {
		teacher, err := uc.teachers.ByID(ctx, id)
		if err != nil || teacher == nil || teacher.Status != domain.TeacherApproved {
			continue
		}
		services, err := uc.ceremonies.PresenceServicesOfTeacher(ctx, teacher.ID)
		if err != nil {
			continue
		}
		active := make([]domain.PresenceService, 0, len(services))
		for i := range services {
			if !services[i].Active {
				continue
			}
			if officialServiceID != 0 && services[i].OfficialServiceID != officialServiceID {
				continue
			}
			active = append(active, services[i])
		}
		if len(active) == 0 {
			continue
		}
		if city != "" && teacher.City != city && !citiesContain(active, city) {
			continue
		}
		view := uc.providerView(teacher, false)
		view.Services = active
		views = append(views, *view)
		if len(views) >= limit {
			break
		}
	}
	sort.SliceStable(views, func(i, j int) bool {
		if views[i].Rating != views[j].Rating {
			return views[i].Rating > views[j].Rating
		}
		return views[i].Sessions > views[j].Sessions
	})
	return views, nil
}

func citiesContain(services []domain.PresenceService, city string) bool {
	for i := range services {
		for _, part := range strings.Split(services[i].Cities, ",") {
			if strings.TrimSpace(part) == city {
				return true
			}
		}
	}
	return false
}

// PresenceProvider returns one reciter's public presence profile.
func (uc *CeremonyUsecase) PresenceProvider(ctx context.Context, teacherID uint) (*domain.CeremonyProviderView, error) {
	teacher, err := uc.teachers.ByID(ctx, teacherID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved {
		return nil, domain.ErrNotFound
	}
	services, err := uc.ceremonies.PresenceServicesOfTeacher(ctx, teacher.ID)
	if err != nil {
		return nil, err
	}
	active := make([]domain.PresenceService, 0, len(services))
	for i := range services {
		if services[i].Active {
			active = append(active, services[i])
		}
	}
	if len(active) == 0 {
		return nil, domain.ErrNotFound
	}
	view := uc.providerView(teacher, false)
	view.Services = active
	return view, nil
}

// ExpireSweep flips stale ceremony calls to expired. Runs lazily before
// reads and from the background ticker.
func (uc *CeremonyUsecase) ExpireSweep(ctx context.Context) error {
	_, err := uc.ceremonies.ExpireStaleCalls(ctx, time.Now())
	return err
}

// notify is a best-effort in-app notification helper.
func (uc *CeremonyUsecase) notify(ctx context.Context, userID uint, title, body string) {
	if uc.notifs == nil {
		return
	}
	if err := uc.notifs.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body}); err != nil {
		log.Printf("ceremony: notification: %v", err)
	}
}
