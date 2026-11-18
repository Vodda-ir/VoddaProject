package repository

import (
        "context"
        "time"

        "gorm.io/gorm"

        "vodda/backend/internal/domain"
)

// dispatchRepo is the GORM implementation of domain.DispatchRepository.
type dispatchRepo struct {
        db *gorm.DB
}

// NewDispatchRepository builds the dispatch repository.
func NewDispatchRepository(db *gorm.DB) domain.DispatchRepository {
        return &dispatchRepo{db: db}
}

func (r *dispatchRepo) CreateCall(ctx context.Context, call *domain.DispatchCall) error {
        return r.db.WithContext(ctx).Create(call).Error
}

func (r *dispatchRepo) CallByID(ctx context.Context, id uint) (*domain.DispatchCall, error) {
        var call domain.DispatchCall
        if err := r.db.WithContext(ctx).Preload("Learner").First(&call, id).Error; err != nil {
                return nil, err
        }
        return &call, nil
}

// CurrentCallForLearner returns the learner's live call — the newest row
// that is still searching or was matched within the last minutes so the
// success card keeps rendering.
func (r *dispatchRepo) CurrentCallForLearner(ctx context.Context, learnerID uint) (*domain.DispatchCall, error) {
        var call domain.DispatchCall
        err := r.db.WithContext(ctx).
                Where("learner_id = ? AND status = ?", learnerID, domain.DispatchSearching).
                Order("id desc").
                First(&call).Error
        if err == nil {
                return &call, nil
        }
        if err != gorm.ErrRecordNotFound {
                return nil, err
        }
        // Keep a freshly matched call visible for the success screen — but only
        // while the booked session is genuinely alive. If the session was already
        // canceled (payment failed, learner/teacher cancel, expired gateway
        // window), the success card would be a lie and would trap the learner on
        // an endless "جلسه شما رزرو شد" loop that blocks new فراخوان.
        err = r.db.WithContext(ctx).
                Where("learner_id = ? AND status = ? AND updated_at > ?", learnerID, domain.DispatchMatched, time.Now().Add(-2*time.Hour)).
                Order("id desc").
                First(&call).Error
        if err != nil {
                return nil, nil // no active call — a clean empty state
        }
        if call.SessionID != nil {
                var sessionStatus string
                if err := r.db.WithContext(ctx).Model(&domain.Session{}).
                        Select("status").
                        Where("id = ?", *call.SessionID).
                        Scan(&sessionStatus).Error; err == nil && domain.SessionStatus(sessionStatus) == domain.SessionCanceled {
                        return nil, nil // booked session died — release the learner
                }
        }
        return &call, nil
}

// SearchingCallForLearner returns the learner's still-searching call, used
// as the "one broadcast at a time" guard.
func (r *dispatchRepo) SearchingCallForLearner(ctx context.Context, learnerID uint) (*domain.DispatchCall, error) {
        var call domain.DispatchCall
        err := r.db.WithContext(ctx).
                Where("learner_id = ? AND status = ?", learnerID, domain.DispatchSearching).
                Order("id desc").
                First(&call).Error
        if err != nil {
                return nil, nil // no searching call
        }
        return &call, nil
}

func (r *dispatchRepo) UpdateCall(ctx context.Context, call *domain.DispatchCall) error {
        return r.db.WithContext(ctx).Save(call).Error
}

// ExpireStaleCalls flips searching calls past their deadline to expired.
// Called lazily before every read and by the background sweeper.
func (r *dispatchRepo) ExpireStaleCalls(ctx context.Context, now time.Time) (int64, error) {
        res := r.db.WithContext(ctx).Model(&domain.DispatchCall{}).
                Where("status = ? AND expires_at < ?", domain.DispatchSearching, now).
                Update("status", domain.DispatchExpired)
        return res.RowsAffected, res.Error
}

func (r *dispatchRepo) CountOffers(ctx context.Context, callID uint) (int64, error) {
        var n int64
        err := r.db.WithContext(ctx).Model(&domain.DispatchOffer{}).
                Where("call_id = ?", callID).Count(&n).Error
        return n, err
}

// CreateOffer inserts a teacher's answer. The unique (call_id, teacher_id)
// index makes the first-to-accept race deterministic under concurrency.
func (r *dispatchRepo) CreateOffer(ctx context.Context, offer *domain.DispatchOffer) error {
        return r.db.WithContext(ctx).Create(offer).Error
}

func (r *dispatchRepo) OfferByID(ctx context.Context, id uint) (*domain.DispatchOffer, error) {
        var offer domain.DispatchOffer
        if err := r.db.WithContext(ctx).First(&offer, id).Error; err != nil {
                return nil, err
        }
        return &offer, nil
}

func (r *dispatchRepo) OfferForCall(ctx context.Context, callID, teacherID uint) (*domain.DispatchOffer, error) {
        var offer domain.DispatchOffer
        if err := r.db.WithContext(ctx).
                Where("call_id = ? AND teacher_id = ?", callID, teacherID).
                First(&offer).Error; err != nil {
                return nil, err
        }
        return &offer, nil
}

func (r *dispatchRepo) UpdateOffer(ctx context.Context, offer *domain.DispatchOffer) error {
        return r.db.WithContext(ctx).Save(offer).Error
}

// OffersOfCall lists every offer of a call in acceptance order, with the
// teacher profile preloaded for the candidate cards.
func (r *dispatchRepo) OffersOfCall(ctx context.Context, callID uint) ([]domain.DispatchOffer, error) {
        var offers []domain.DispatchOffer
        err := r.db.WithContext(ctx).
                Preload("Teacher").Preload("Teacher.User").
                Where("call_id = ?", callID).
                Order("responded_at asc, id asc").
                Find(&offers).Error
        return offers, err
}

func (r *dispatchRepo) MyOfferOfCall(ctx context.Context, callID, teacherID uint) (*domain.DispatchOffer, error) {
        return r.OfferForCall(ctx, callID, teacherID)
}

func (r *dispatchRepo) WaitingOffersOfTeacher(ctx context.Context, teacherID uint) ([]domain.DispatchOffer, error) {
        var offers []domain.DispatchOffer
        err := r.db.WithContext(ctx).
                Preload("Call", func(db *gorm.DB) *gorm.DB {
                        return db.Where("status IN ?", []domain.DispatchCallStatus{domain.DispatchSearching, domain.DispatchMatched})
                }).
                Where("teacher_id = ? AND status IN ?", teacherID,
                        []domain.DispatchOfferStatus{domain.DispatchOfferWaiting, domain.DispatchOfferChosen}).
                Order("id desc").
                Find(&offers).Error
        return offers, err
}

func (r *dispatchRepo) IgnoreCall(ctx context.Context, callID, teacherID uint) error {
        // Idempotent: re-ignoring an already ignored call is a no-op.
        return r.db.WithContext(ctx).
                Where("call_id = ? AND teacher_id = ?", callID, teacherID).
                FirstOrCreate(&domain.DispatchIgnore{CallID: callID, TeacherID: teacherID}).Error
}

// OpenCallsMatchingTeacher returns live searching calls whose topic matches
// one of the teacher's active official services, excluding calls this
// teacher already answered or ignored. Freshness first.
func (r *dispatchRepo) OpenCallsMatchingTeacher(ctx context.Context, teacherID uint, limit int) ([]domain.DispatchCall, error) {
        var calls []domain.DispatchCall
        err := r.db.WithContext(ctx).
                Where("status = ? AND expires_at > ? AND official_service_id IN (?)",
                        domain.DispatchSearching, time.Now(),
                        r.db.Model(&domain.Service{}).
                                Select("official_service_id").
                                Where("teacher_id = ? AND active = ? AND official_service_id IS NOT NULL", teacherID, true),
                ).
                Where("id NOT IN (?)",
                        r.db.Model(&domain.DispatchOffer{}).
                                Select("call_id").
                                Where("teacher_id = ?", teacherID),
                ).
                Where("id NOT IN (?)",
                        r.db.Model(&domain.DispatchIgnore{}).
                                Select("call_id").
                                Where("teacher_id = ?", teacherID),
                ).
                Order("created_at desc").
                Limit(limit).
                Find(&calls).Error
        return calls, err
}
