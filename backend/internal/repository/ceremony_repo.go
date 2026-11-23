package repository

import (
        "context"
        "time"

        "gorm.io/gorm"
        "gorm.io/gorm/clause"

        "vodda/backend/internal/domain"
)

// ceremonyRepo gorm implementation of domain.CeremonyRepository.
type ceremonyRepo struct{ db *gorm.DB }

// NewCeremonyRepository builds the ceremony store.
func NewCeremonyRepository(db *gorm.DB) domain.CeremonyRepository {
        return &ceremonyRepo{db: db}
}

func (r *ceremonyRepo) CreateCall(ctx context.Context, call *domain.CeremonyCall) error {
        return r.db.WithContext(ctx).Create(call).Error
}

func (r *ceremonyRepo) CallByID(ctx context.Context, id uint) (*domain.CeremonyCall, error) {
        var call domain.CeremonyCall
        err := r.db.WithContext(ctx).Preload("Organizer").First(&call, id).Error
        if err != nil {
                return nil, recordError(err)
        }
        return &call, nil
}

func (r *ceremonyRepo) UpdateCall(ctx context.Context, call *domain.CeremonyCall) error {
        return r.db.WithContext(ctx).Save(call).Error
}

func (r *ceremonyRepo) CallsForOrganizer(ctx context.Context, organizerID uint, limit int) ([]domain.CeremonyCall, error) {
        var calls []domain.CeremonyCall
        err := r.db.WithContext(ctx).
                Where("organizer_id = ?", organizerID).
                Order("created_at desc").Limit(limit).
                Find(&calls).Error
        return calls, err
}

func (r *ceremonyRepo) SearchingCallsForOrganizer(ctx context.Context, organizerID uint) ([]domain.CeremonyCall, error) {
        var calls []domain.CeremonyCall
        err := r.db.WithContext(ctx).
                Where("organizer_id = ? AND status = ?", organizerID, domain.CeremonySearching).
                Find(&calls).Error
        return calls, err
}

func (r *ceremonyRepo) ExpireStaleCalls(ctx context.Context, now time.Time) (int64, error) {
        result := r.db.WithContext(ctx).Model(&domain.CeremonyCall{}).
                Where("status = ? AND deadline < ?", domain.CeremonySearching, now).
                Update("status", domain.CeremonyExpired)
        return result.RowsAffected, result.Error
}

// OpenCalls matches every searching call whose deadline is still open and
// whose audience rule admits the teacher's gender; the teacher's own calls
// are excluded. The usecase ranks relevance against the teacher's presence
// services, so the reciter inbox never goes quiet just because a teacher has
// no registered presence service yet.
func (r *ceremonyRepo) OpenCalls(ctx context.Context, female bool, selfUserID uint, limit int) ([]domain.CeremonyCall, error) {
        q := r.db.WithContext(ctx).
                Preload("Organizer").
                Where("status = ? AND deadline > ? AND organizer_id <> ?",
                        domain.CeremonySearching, time.Now(), selfUserID)
        if female {
                q = q.Where("audience IN ?", []string{domain.CeremonyAudienceBoth, domain.CeremonyAudienceSisters})
        } else {
                q = q.Where("audience IN ?", []string{domain.CeremonyAudienceBoth, domain.CeremonyAudienceBrothers})
        }
        var calls []domain.CeremonyCall
        err := q.Order("created_at desc").Limit(limit).Find(&calls).Error
        return calls, err
}

func (r *ceremonyRepo) CountOffers(ctx context.Context, callID uint) (int64, error) {
        var n int64
        err := r.db.WithContext(ctx).Model(&domain.CeremonyOffer{}).
                Where("call_id = ? AND status IN ?", callID,
                        []domain.CeremonyOfferStatus{domain.CeremonyOfferWaiting, domain.CeremonyOfferChosen}).
                Count(&n).Error
        return n, err
}

func (r *ceremonyRepo) ChosenOfferCount(ctx context.Context, callID uint) (int64, error) {
        var n int64
        err := r.db.WithContext(ctx).Model(&domain.CeremonyOffer{}).
                Where("call_id = ? AND status = ?", callID, domain.CeremonyOfferChosen).
                Count(&n).Error
        return n, err
}

func (r *ceremonyRepo) CreateOffer(ctx context.Context, offer *domain.CeremonyOffer) error {
        return r.db.WithContext(ctx).Create(offer).Error
}

func (r *ceremonyRepo) OfferByID(ctx context.Context, id uint) (*domain.CeremonyOffer, error) {
        var offer domain.CeremonyOffer
        err := r.db.WithContext(ctx).Preload("Call").Preload("Teacher").Preload("Teacher.User").First(&offer, id).Error
        if err != nil {
                return nil, recordError(err)
        }
        return &offer, nil
}

func (r *ceremonyRepo) UpdateOffer(ctx context.Context, offer *domain.CeremonyOffer) error {
        return r.db.WithContext(ctx).Save(offer).Error
}

func (r *ceremonyRepo) OffersOfCall(ctx context.Context, callID uint) ([]domain.CeremonyOffer, error) {
        var offers []domain.CeremonyOffer
        err := r.db.WithContext(ctx).
                Preload("Teacher").Preload("Teacher.User").
                Where("call_id = ?", callID).
                Order("responded_at asc").Find(&offers).Error
        return offers, err
}

func (r *ceremonyRepo) MyOfferOfCall(ctx context.Context, callID, teacherID uint) (*domain.CeremonyOffer, error) {
        var offer domain.CeremonyOffer
        err := r.db.WithContext(ctx).
                Where("call_id = ? AND teacher_id = ?", callID, teacherID).
                First(&offer).Error
        if err != nil {
                if err == gorm.ErrRecordNotFound {
                        return nil, nil
                }
                return nil, err
        }
        return &offer, nil
}

func (r *ceremonyRepo) OffersOfTeacher(ctx context.Context, teacherID uint, limit int) ([]domain.CeremonyOffer, error) {
        var offers []domain.CeremonyOffer
        err := r.db.WithContext(ctx).
                Preload("Call").Preload("Teacher").Preload("Teacher.User").
                Where("teacher_id = ?", teacherID).
                Order("created_at desc").Limit(limit).
                Find(&offers).Error
        return offers, err
}

func (r *ceremonyRepo) CreateBooking(ctx context.Context, b *domain.CeremonyBooking) error {
        return r.db.WithContext(ctx).Create(b).Error
}

func (r *ceremonyRepo) BookingByID(ctx context.Context, id uint) (*domain.CeremonyBooking, error) {
        var b domain.CeremonyBooking
        err := r.db.WithContext(ctx).
                Preload("Provider").Preload("Provider.User").Preload("Organizer").
                First(&b, id).Error
        if err != nil {
                return nil, recordError(err)
        }
        return &b, nil
}

func (r *ceremonyRepo) UpdateBooking(ctx context.Context, b *domain.CeremonyBooking) error {
        return r.db.WithContext(ctx).Save(b).Error
}

func (r *ceremonyRepo) BookingsForUser(ctx context.Context, userID uint, limit int) ([]domain.CeremonyBooking, error) {
        var bookings []domain.CeremonyBooking
        err := r.db.WithContext(ctx).
                Preload("Provider").Preload("Provider.User").Preload("Organizer").
                Where("organizer_id = ? OR provider_user_id = ?", userID, userID).
                Order("created_at desc").Limit(limit).
                Find(&bookings).Error
        return bookings, err
}

func (r *ceremonyRepo) CreatePresenceService(ctx context.Context, s *domain.PresenceService) error {
        return r.db.WithContext(ctx).Create(s).Error
}

func (r *ceremonyRepo) PresenceServiceByID(ctx context.Context, id uint) (*domain.PresenceService, error) {
        var s domain.PresenceService
        err := r.db.WithContext(ctx).Preload("Teacher").First(&s, id).Error
        if err != nil {
                return nil, recordError(err)
        }
        return &s, nil
}

func (r *ceremonyRepo) UpdatePresenceService(ctx context.Context, s *domain.PresenceService) error {
        return r.db.WithContext(ctx).Save(s).Error
}

func (r *ceremonyRepo) DeletePresenceService(ctx context.Context, teacherID, id uint) error {
        result := r.db.WithContext(ctx).
                Where("id = ? AND teacher_id = ?", id, teacherID).
                Delete(&domain.PresenceService{})
        if result.Error != nil {
                return result.Error
        }
        if result.RowsAffected == 0 {
                return domain.ErrNotFound
        }
        return nil
}

func (r *ceremonyRepo) PresenceServicesOfTeacher(ctx context.Context, teacherID uint) ([]domain.PresenceService, error) {
        var services []domain.PresenceService
        err := r.db.WithContext(ctx).
                Preload("OfficialService").
                Where("teacher_id = ?", teacherID).
                Order("created_at asc").Find(&services).Error
        return services, err
}

// PresenceServiceTeacherIDs lists teachers that publish at least one active
// presence service — the public presence catalog candidate set.
func (r *ceremonyRepo) PresenceServiceTeacherIDs(ctx context.Context, limit int) ([]uint, error) {
        var ids []uint
        err := r.db.WithContext(ctx).Model(&domain.PresenceService{}).
                Where("active = ?", true).
                Distinct("teacher_id").
                Limit(limit).
                Pluck("teacher_id", &ids).Error
        return ids, err
}

func (r *ceremonyRepo) CountPresenceServicesOfTeacher(ctx context.Context, teacherID uint) (int64, error) {
        var n int64
        err := r.db.WithContext(ctx).Model(&domain.PresenceService{}).
                Where("teacher_id = ?", teacherID).
                Count(&n).Error
        return n, err
}

// lockBooking helper used by the financial layer.
func lockCeremonyBooking(tx *gorm.DB, id uint) (*domain.CeremonyBooking, error) {
        var b domain.CeremonyBooking
        if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&b, id).Error; err != nil {
                return nil, recordError(err)
        }
        return &b, nil
}
