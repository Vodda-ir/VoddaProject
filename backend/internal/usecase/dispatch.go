package usecase

import (
	"context"
	"log"
	"time"

	"vodda/backend/internal/domain"
)

// Dispatch time windows.
const (
	// DispatchCallTTL bounds how long a broadcast stays visible to teachers.
	DispatchCallTTL = 12 * time.Minute
	// DispatchInstantOffset is the start delay of a flexible ("در اسرع وقت"
	// / جلسهٔ فوری) call: the confirmed session lands a couple of minutes
	// ahead so the live room opens the same moment the learner confirms —
	// never half an hour later. Teacher/learner can still adjust in chat.
	DispatchInstantOffset = 2 * time.Minute
	// DispatchSeenFreshness marks how recent a teacher's inbox poll must be
	// to consider them present for the فراخوان.
	DispatchSeenFreshness = 2 * time.Minute
)

// SessionBooker is the subset of SessionUsecase the dispatch confirm needs.
type SessionBooker interface {
	Book(ctx context.Context, learnerID uint, in BookInput) (*BookResult, error)
	ConfirmInstantDispatch(ctx context.Context, sessionID, teacherID uint) error
}

// DispatchUsecase implements the فراخوان اساتید flow: a learner broadcasts a
// topic request, every eligible teacher races to accept, accepted teachers
// become live candidates and the learner confirms one — which creates a
// regular booking through the standard payment pipeline.
type DispatchUsecase struct {
	dispatch domain.DispatchRepository
	teachers domain.TeacherRepository
	users    domain.UserRepository
	sessions SessionBooker
	notif    domain.NotificationRepository
}

// NewDispatchUsecase builds the dispatch usecase.
func NewDispatchUsecase(
	dispatch domain.DispatchRepository,
	teachers domain.TeacherRepository,
	users domain.UserRepository,
	sessions SessionBooker,
	notif domain.NotificationRepository,
) *DispatchUsecase {
	return &DispatchUsecase{dispatch: dispatch, teachers: teachers, users: users, sessions: sessions, notif: notif}
}

// CreateCallInput is the learner's broadcast request.
type CreateCallInput struct {
	OfficialServiceID uint
	Note              string
	ScheduledAt       *time.Time // nil + Flexible=false is invalid
	Flexible          bool
}

// CreateCall broadcasts a new call to eligible teachers of the topic.
func (uc *DispatchUsecase) CreateCall(ctx context.Context, learnerID uint, in CreateCallInput) (*domain.DispatchCallView, error) {
	if err := uc.ExpireSweep(ctx); err != nil {
		log.Printf("dispatch: lazy expire: %v", err)
	}

	if in.OfficialServiceID == 0 || len(in.Note) > 300 {
		return nil, domain.ErrValidation
	}
	if !in.Flexible && in.ScheduledAt == nil {
		return nil, domain.ErrValidation
	}
	if in.ScheduledAt != nil && in.ScheduledAt.Before(time.Now()) {
		return nil, domain.ErrValidation
	}
	if searching, err := uc.dispatch.SearchingCallForLearner(ctx, learnerID); err != nil {
		return nil, err
	} else if searching != nil {
		return nil, domain.ErrCallActive
	}

	learner, err := uc.users.ByID(ctx, learnerID)
	if err != nil {
		return nil, err
	}
	if !learner.Active {
		return nil, domain.ErrForbidden
	}

	svc, err := uc.teachers.OfficialServiceByID(ctx, in.OfficialServiceID)
	if err != nil || !svc.Active {
		return nil, domain.ErrValidation
	}

	// Eligible audience: public, approved, verified, available teachers that
	// publish an active service bound to this official topic.
	audience, _, err := uc.teachers.List(ctx, domain.TeacherFilter{
		PublicOnly:        true,
		AvailableOnly:     true,
		OfficialServiceID: in.OfficialServiceID,
		Limit:             200,
	})
	if err != nil {
		return nil, err
	}
	// جلسهٔ فوری فقط به اساتیدی می‌رسد که کلید جلسهٔ فوری آنان روشن است.
	if in.Flexible {
		instant := audience[:0]
		for _, t := range audience {
			if t.InstantEnabled {
				instant = append(instant, t)
			}
		}
		audience = instant
	}
	if len(audience) == 0 {
		if in.Flexible {
			return nil, domain.ErrNoInstantTeachers
		}
		return nil, domain.ErrNoTeachersForTopic
	}

	call := &domain.DispatchCall{
		LearnerID:         learnerID,
		OfficialServiceID: svc.ID,
		TopicTitle:        svc.Title,
		TopicIcon:         svc.Icon,
		Note:              in.Note,
		Flexible:          in.Flexible,
		ScheduledAt:       in.ScheduledAt,
		Status:            domain.DispatchSearching,
		ExpiresAt:         time.Now().Add(DispatchCallTTL),
	}
	if err := uc.dispatch.CreateCall(ctx, call); err != nil {
		return nil, err
	}

	// In-app broadcast — best effort; the inbox poll is the source of truth.
	broadcast := "📢 فراخوان جدید: " + svc.Title
	body := "یک کاربر درخواست «" + svc.Title + "» ثبت کرد. اگر میتوانید تدریس کنید، سریع پاسخ دهید."
	for _, t := range audience {
		if t.UserID == learnerID {
			continue
		}
		uc.notify(ctx, t.UserID, broadcast, body)
	}
	return uc.view(ctx, call)
}

// CurrentCallForLearner returns the learner's live call plus candidates in
// acceptance order.
func (uc *DispatchUsecase) CurrentCallForLearner(ctx context.Context, learnerID uint) (*domain.DispatchCallView, error) {
	if err := uc.ExpireSweep(ctx); err != nil {
		log.Printf("dispatch: lazy expire: %v", err)
	}
	call, err := uc.dispatch.CurrentCallForLearner(ctx, learnerID)
	if err != nil {
		return nil, err
	}
	if call == nil {
		return &domain.DispatchCallView{Call: nil, Candidates: []domain.Candidate{}, TopicTeachable: true}, nil
	}
	return uc.view(ctx, call)
}

// view assembles the learner-facing call projection.
func (uc *DispatchUsecase) view(ctx context.Context, call *domain.DispatchCall) (*domain.DispatchCallView, error) {
	offers, err := uc.dispatch.OffersOfCall(ctx, call.ID)
	if err != nil {
		return nil, err
	}
	candidates := make([]domain.Candidate, 0, len(offers))
	for _, offer := range offers {
		if offer.Status != domain.DispatchOfferWaiting && offer.Status != domain.DispatchOfferChosen {
			continue
		}
		candidate := domain.Candidate{
			OfferID:     offer.ID,
			RespondedAt: offer.RespondedAt,
			ServiceID:   offer.ServiceID,
			Duration:    offer.ServiceDur,
			Price:       offer.ServicePric,
		}
		if offer.Teacher != nil {
			candidate.TeacherID = offer.Teacher.ID
			candidate.Tag = offer.Teacher.Tag
			candidate.Field = offer.Teacher.Field
			candidate.City = offer.Teacher.City
			candidate.Level = offer.Teacher.Level
			candidate.Tier = offer.Teacher.Tier
			candidate.Female = offer.Teacher.Female
			candidate.Rating = offer.Teacher.Rating
			candidate.Reviews = offer.Teacher.Reviews
			candidate.Sessions = offer.Teacher.Sessions
			candidate.Bio = offer.Teacher.Bio
			if offer.Teacher.User != nil {
				candidate.Name = offer.Teacher.User.Name
				candidate.AvatarURL = offer.Teacher.User.AvatarURL
			}
		}
		candidates = append(candidates, candidate)
	}
	return &domain.DispatchCallView{Call: call, Candidates: candidates}, nil
}

// ChooseOffer confirms a candidate: creates the booking through the regular
// pipeline, marks the call matched and releases every other waiting teacher.
func (uc *DispatchUsecase) ChooseOffer(ctx context.Context, learnerID, callID, offerID uint, paymentMethod, returnPath string) (*BookResult, error) {
	call, err := uc.dispatch.CallByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.LearnerID != learnerID {
		return nil, domain.ErrForbidden
	}
	if call.Status != domain.DispatchSearching {
		return nil, domain.ErrConflict
	}
	if call.ExpiresAt.Before(time.Now()) {
		return nil, domain.ErrConflict
	}

	offer, err := uc.dispatch.OfferByID(ctx, offerID)
	if err != nil || offer.CallID != call.ID {
		return nil, domain.ErrNotFound
	}
	if offer.Status != domain.DispatchOfferWaiting {
		return nil, domain.ErrConflict
	}

	// The session hour: exact time when given; a flexible (فوری) call
	// starts minutes after the learner confirms — the live room must be
	// ready the same moment, not half an hour later.
	scheduledAt := call.ScheduledAt
	instant := call.Flexible
	if scheduledAt == nil || call.Flexible {
		at := time.Now().Add(DispatchInstantOffset).Truncate(time.Minute)
		scheduledAt = &at
	}

	result, err := uc.sessions.Book(ctx, learnerID, BookInput{
		TeacherID:         offer.TeacherID,
		ServiceID:         offer.ServiceID,
		ScheduledAt:       *scheduledAt,
		Note:              dispatchBookingNote(call),
		PaymentMethod:     paymentMethod,
		ReturnPath:        returnPath,
		SkipWorkTimeCheck: true, // the teacher opted in by accepting the call
		Instant:           instant,
		ViaDispatch:       true,
	})
	if err != nil {
		return nil, err
	}

	// جلسهٔ فوری: استاد با پذیرش فراخوان و ثبت پیشنهاد، وعدهٔ برگزاری داده
	// است؛ جلسه بدون منتظر ماندن برای تأیید دوم قطعی می‌شود تا کلاس همان
	// لحظه پس از انتخاب کاربر آمادهٔ ورود باشد.
	if instant && paymentMethod != "gateway" {
		if err := uc.sessions.ConfirmInstantDispatch(ctx, result.Session.ID, offer.TeacherID); err != nil {
			log.Printf("dispatch: instant auto-confirm session=%d teacher=%d: %v", result.Session.ID, offer.TeacherID, err)
		}
	}

	call.Status = domain.DispatchMatched
	call.MatchedTeacherID = &offer.TeacherID
	call.SessionID = &result.Session.ID
	if err := uc.dispatch.UpdateCall(ctx, call); err != nil {
		return nil, err
	}

	offer.Status = domain.DispatchOfferChosen
	if err := uc.dispatch.UpdateOffer(ctx, offer); err != nil {
		return nil, err
	}

	// Release everyone else — they raced but were not picked.
	others, err := uc.dispatch.OffersOfCall(ctx, call.ID)
	if err == nil {
		for _, other := range others {
			if other.ID == offer.ID || other.Status != domain.DispatchOfferWaiting {
				continue
			}
			other.Status = domain.DispatchOfferReleased
			if err := uc.dispatch.UpdateOffer(ctx, &other); err == nil && other.Teacher != nil {
				uc.notify(ctx, other.Teacher.UserID,
					"فراخوان بسته شد",
					"کاربر این‌بار استاد دیگری را انتخاب کرد. فراخوان‌های بعدی را از دست ندهید.")
			}
		}
	}
	return result, nil
}

// DeclineOffer lets the learner remove one candidate and keep waiting for
// the rest of the race.
func (uc *DispatchUsecase) DeclineOffer(ctx context.Context, learnerID, callID, offerID uint) (*domain.DispatchCallView, error) {
	call, err := uc.dispatch.CallByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.LearnerID != learnerID || call.Status != domain.DispatchSearching {
		return nil, domain.ErrForbidden
	}
	offer, err := uc.dispatch.OfferByID(ctx, offerID)
	if err != nil || offer.CallID != call.ID || offer.Status != domain.DispatchOfferWaiting {
		return nil, domain.ErrNotFound
	}
	offer.Status = domain.DispatchOfferDeclined
	if err := uc.dispatch.UpdateOffer(ctx, offer); err != nil {
		return nil, err
	}
	if offer.Teacher != nil {
		uc.notify(ctx, offer.Teacher.UserID,
			"پاسخ شما نمایش داده نشد",
			"کاربر این‌بار پاسخ شما را انتخاب نکرد؛ فراخوان همچنان برای اساتید دیگر باز است.")
	}
	return uc.view(ctx, call)
}

// CancelCall aborts the learner's broadcast and releases all waiting teachers.
func (uc *DispatchUsecase) CancelCall(ctx context.Context, learnerID, callID uint) error {
	call, err := uc.dispatch.CallByID(ctx, callID)
	if err != nil {
		return err
	}
	if call.LearnerID != learnerID {
		return domain.ErrForbidden
	}
	if call.Status != domain.DispatchSearching {
		return domain.ErrConflict
	}
	call.Status = domain.DispatchCanceled
	if err := uc.dispatch.UpdateCall(ctx, call); err != nil {
		return err
	}
	offers, err := uc.dispatch.OffersOfCall(ctx, call.ID)
	if err == nil {
		for _, offer := range offers {
			if offer.Status != domain.DispatchOfferWaiting {
				continue
			}
			offer.Status = domain.DispatchOfferReleased
			if err := uc.dispatch.UpdateOffer(ctx, &offer); err == nil && offer.Teacher != nil {
				uc.notify(ctx, offer.Teacher.UserID,
					"فراخوان لغو شد",
					"کاربر فراخوان «"+call.TopicTitle+"» را لغو کرد.")
			}
		}
	}
	return nil
}

// TeacherIncoming is the teacher's live dispatch inbox: open calls matching
// the teacher's official services plus offers they already placed. Polling
// this endpoint doubles as the presence heartbeat.
func (uc *DispatchUsecase) TeacherIncoming(ctx context.Context, userID uint) (*domain.TeacherInbox, error) {
	if err := uc.ExpireSweep(ctx); err != nil {
		log.Printf("dispatch: lazy expire: %v", err)
	}
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved || !teacher.Available {
		return &domain.TeacherInbox{Calls: []domain.TeacherCallView{}, Offers: []domain.DispatchOffer{}}, nil
	}

	now := time.Now()
	if teacher.DispatchSeenAt == nil || now.Sub(*teacher.DispatchSeenAt) > 30*time.Second {
		teacher.DispatchSeenAt = &now
		if err := uc.teachers.Update(ctx, teacher); err != nil {
			log.Printf("dispatch: presence update: %v", err)
		}
	}

	open, err := uc.dispatch.OpenCallsMatchingTeacher(ctx, teacher.ID, 30)
	if err != nil {
		return nil, err
	}
	calls := make([]domain.TeacherCallView, 0, len(open))
	for i := range open {
		calls = append(calls, domain.TeacherCallView{Call: &open[i], Accepted: false})
	}

	offers, err := uc.dispatch.WaitingOffersOfTeacher(ctx, teacher.ID)
	if err != nil {
		return nil, err
	}
	return &domain.TeacherInbox{Calls: calls, Offers: offers}, nil
}

// TeacherAccept answers a call. The unique (call, teacher) index makes the
// race safe: the first insert wins, duplicates fail cleanly.
func (uc *DispatchUsecase) TeacherAccept(ctx context.Context, userID, callID uint) (*domain.DispatchOffer, error) {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved || !teacher.Verified || !teacher.Available {
		return nil, domain.ErrTeacherNotReady
	}

	call, err := uc.dispatch.CallByID(ctx, callID)
	if err != nil {
		return nil, err
	}
	if call.LearnerID == teacher.UserID {
		return nil, domain.ErrSelfBooking
	}
	if call.Status != domain.DispatchSearching || call.ExpiresAt.Before(time.Now()) {
		return nil, domain.ErrConflict
	}
	if existing, err := uc.dispatch.MyOfferOfCall(ctx, call.ID, teacher.ID); err == nil && existing != nil {
		return existing, nil // idempotent re-accept
	}

	// The teacher's active service bound to this exact topic.
	serviceID, duration, price, err := uc.topicServiceOf(ctx, teacher.ID, call.OfficialServiceID)
	if err != nil {
		return nil, err
	}

	offer := &domain.DispatchOffer{
		CallID:      call.ID,
		TeacherID:   teacher.ID,
		Status:      domain.DispatchOfferWaiting,
		ServiceID:   serviceID,
		ServiceDur:  duration,
		ServicePric: price,
		RespondedAt: time.Now(),
	}
	if err := uc.dispatch.CreateOffer(ctx, offer); err != nil {
		// Lost the race or already answered — surface a clean conflict.
		if existing, getErr := uc.dispatch.MyOfferOfCall(ctx, call.ID, teacher.ID); getErr == nil && existing != nil {
			return existing, nil
		}
		return nil, domain.ErrConflict
	}
	if n, err := uc.dispatch.CountOffers(ctx, call.ID); err == nil {
		call.OfferCount = int(n)
		if err := uc.dispatch.UpdateCall(ctx, call); err != nil {
			log.Printf("dispatch: offer count update: %v", err)
		}
	}
	offer.Teacher = teacher

	// Learner notification — best effort.
	if call.Learner != nil {
		name := teacher.User.Name
		if name == "" {
			name = "استاد"
		}
		uc.notify(ctx, call.LearnerID,
			"🎉 استاد آماده شد",
			name+" برای «"+call.TopicTitle+"» پاسخ داد. پروفایل و قیمت را ببینید و تأیید کنید.")
	}
	return offer, nil
}

// TeacherWithdraw pulls the teacher's waiting offer back.
func (uc *DispatchUsecase) TeacherWithdraw(ctx context.Context, userID, offerID uint) error {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	offer, err := uc.dispatch.OfferByID(ctx, offerID)
	if err != nil || offer.TeacherID != teacher.ID {
		return domain.ErrNotFound
	}
	if offer.Status != domain.DispatchOfferWaiting {
		return domain.ErrConflict
	}
	offer.Status = domain.DispatchOfferReleased
	if err := uc.dispatch.UpdateOffer(ctx, offer); err != nil {
		return err
	}
	call, err := uc.dispatch.CallByID(ctx, offer.CallID)
	if err == nil && call.LearnerID > 0 {
		name := teacher.User.Name
		uc.notify(ctx, call.LearnerID,
			"انصراف استاد",
			name+" از فراخوان «"+call.TopicTitle+"» انصراف داد؛ پاسخ‌های دیگران همچنان فعال است.")
	}
	return nil
}

// TeacherReject dismisses an incoming call so it never reappears.
func (uc *DispatchUsecase) TeacherReject(ctx context.Context, userID, callID uint) error {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return err
	}
	return uc.dispatch.IgnoreCall(ctx, callID, teacher.ID)
}

// TeacherWaitingOffers lists offers the teacher placed that still await the
// learner's decision (used by the teacher's live status cards).
func (uc *DispatchUsecase) TeacherWaitingOffers(ctx context.Context, userID uint) ([]domain.DispatchOffer, error) {
	teacher, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return uc.dispatch.WaitingOffersOfTeacher(ctx, teacher.ID)
}

// ExpireSweep flips stale calls to expired. Runs lazily before reads and
// from the background ticker.
func (uc *DispatchUsecase) ExpireSweep(ctx context.Context) error {
	_, err := uc.dispatch.ExpireStaleCalls(ctx, time.Now())
	return err
}

// topicServiceOf finds the teacher's active service bound to an official
// catalog entry, returning id/duration/price.
func (uc *DispatchUsecase) topicServiceOf(ctx context.Context, teacherID, officialServiceID uint) (uint, int, int64, error) {
	teacher, err := uc.teachers.ByID(ctx, teacherID)
	if err != nil {
		return 0, 0, 0, err
	}
	for i := range teacher.Services {
		s := teacher.Services[i]
		// Price >= 0: free services (خدمات رایگان) are offerable too.
		if s.OfficialServiceID != nil && *s.OfficialServiceID == officialServiceID && s.Active && s.Price >= 0 && s.Duration > 0 {
			return s.ID, s.Duration, s.Price, nil
		}
	}
	return 0, 0, 0, domain.ErrValidation
}

// notify is a best-effort in-app notification helper.
func (uc *DispatchUsecase) notify(ctx context.Context, userID uint, title, body string) {
	if err := uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body}); err != nil {
		log.Printf("dispatch: notification: %v", err)
	}
}

func dispatchBookingNote(call *domain.DispatchCall) string {
	note := "ثبت‌شده از فراخوان وُدّا"
	if call.Flexible {
		note = "⚡ فراخوان فوری وُدّا — ساعت دقیق با توافق استاد و کاربر"
	} else if call.ScheduledAt != nil {
		note = "📅 فراخوان وُدّا — زمان انتخابی کاربر"
	}
	if call.Note != "" {
		note += "\nیادداشت کاربر: " + call.Note
	}
	return note
}
