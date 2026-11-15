package usecase

import (
        "context"
        "errors"
        "strings"
        "time"

        "vodda/backend/internal/domain"
)

// TeacherUsecase handles teacher discovery and self-management.
type TeacherUsecase struct {
        teachers domain.TeacherRepository
        reviews  domain.ReviewRepository
        users    domain.UserRepository
}

// NewTeacherUsecase builds a TeacherUsecase.
func NewTeacherUsecase(t domain.TeacherRepository, r domain.ReviewRepository, u domain.UserRepository) *TeacherUsecase {
        return &TeacherUsecase{teachers: t, reviews: r, users: u}
}

// Search returns approved, verified and available teachers matching the public filter.
func (uc *TeacherUsecase) Search(ctx context.Context, f domain.TeacherFilter) ([]domain.Teacher, int64, error) {
        f.Status = domain.TeacherApproved
        f.PublicOnly = true
        return uc.teachers.List(ctx, f)
}

// Get returns a public teacher profile. Pending, rejected, disabled or unavailable
// profiles are intentionally indistinguishable from missing records.
func (uc *TeacherUsecase) Get(ctx context.Context, id uint) (*domain.Teacher, []domain.Review, error) {
        t, err := uc.teachers.ByID(ctx, id)
        if err != nil {
                return nil, nil, err
        }
        if !publicTeacher(t) {
                return nil, nil, domain.ErrNotFound
        }
        activeServices := make([]domain.Service, 0, len(t.Services))
        for _, service := range t.Services {
                if service.Active {
                        activeServices = append(activeServices, service)
                }
        }
        t.Services = activeServices

        reviews, err := uc.reviews.ForTeacher(ctx, id)
        if err != nil {
                return nil, nil, err
        }
        return t, reviews, nil
}

// Mine returns the teacher profile owned by the user. It never auto-approves or
// auto-creates a profile; onboarding must go through BecomeTeacher and admin review.
func (uc *TeacherUsecase) Mine(ctx context.Context, userID uint) (*domain.Teacher, error) {
        return uc.teacherForUser(ctx, userID)
}

// MyWorkTimes returns the work times for the calling teacher.
func (uc *TeacherUsecase) MyWorkTimes(ctx context.Context, userID uint) ([]domain.WorkTime, error) {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return nil, err
        }
        return uc.teachers.WorkTimes(ctx, t.ID)
}

// UpdateMine updates editable teacher fields while preserving moderation state.
func (uc *TeacherUsecase) UpdateMine(ctx context.Context, userID uint, in BecomeTeacherInput) (*domain.Teacher, error) {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return nil, err
        }
        if err := validateTeacherProfileInput(in); err != nil {
                return nil, err
        }

        if value := strings.TrimSpace(in.Tag); value != "" {
                t.Tag = value
        }
        if value := strings.TrimSpace(in.Field); value != "" {
                t.Field = value
        }
        if value := strings.TrimSpace(in.Level); value != "" {
                t.Level = value
        }
        if value := strings.TrimSpace(in.City); value != "" {
                t.City = value
        }
        if value := strings.TrimSpace(in.Bio); value != "" {
                t.Bio = value
        }
        if len(in.Skills) > 0 {
                clean := make([]string, 0, len(in.Skills))
                for _, skill := range in.Skills {
                        if value := strings.TrimSpace(skill); value != "" {
                                clean = append(clean, value)
                        }
                }
                t.Skills = strings.Join(clean, ",")
        }
        if in.Price30 > 0 {
                t.Price30 = in.Price30
        }
        if in.Price60 > 0 {
                t.Price60 = in.Price60
        }
        if in.Available != nil {
                t.Available = *in.Available
        }
        // کلیدهای سریع داشبورد استاد — جلسهٔ فوری و جلسات رایگان. این دو فیلد
        // قبلاً از ورودی خوانده می‌شدند اما هرگز روی رکورد اعمال نمی‌شدند و
        // سوییچ‌ها پس از خروج از داشبورد به حالت قبل برمی‌گشتند.
        if in.InstantEnabled != nil {
                t.InstantEnabled = *in.InstantEnabled
        }
        if in.FreeEnabled != nil {
                t.FreeEnabled = *in.FreeEnabled
        }
        if err := uc.teachers.Update(ctx, t); err != nil {
                return nil, err
        }
        return t, nil
}

// ── official catalog ──

// ListOfficialServices returns the platform-approved service catalog that
// teachers must pick from when publishing a bookable service.
func (uc *TeacherUsecase) ListOfficialServices(ctx context.Context) ([]domain.OfficialService, error) {
        return uc.teachers.OfficialServices(ctx)
}

// ListFreeServices powers the public «خدمات رایگان» board on the homepage.
func (uc *TeacherUsecase) ListFreeServices(ctx context.Context, limit int) ([]domain.FreeServiceCard, error) {
        return uc.teachers.FreePublicServices(ctx, limit)
}

// ── services ──

// AddService creates a bookable service for the teacher. New services remain
// service (OfficialServiceID). The official title/icon are copied from the
// catalog entry, so teachers cannot publish custom service titles. Because
// the catalog itself is platform-approved, the service becomes bookable
// immediately; admins may still deactivate any service.
func (uc *TeacherUsecase) AddService(ctx context.Context, userID uint, s *domain.Service) (*domain.Service, error) {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return nil, err
        }
        if t.Status == domain.TeacherRejected {
                return nil, domain.ErrForbidden
        }
        if s.OfficialServiceID == nil {
                return nil, domain.ErrValidation
        }
        official, err := uc.teachers.OfficialServiceByID(ctx, *s.OfficialServiceID)
        if err != nil {
                return nil, domain.ErrValidation
        }
        s.ID = 0
        s.TeacherID = t.ID
        s.Title = official.Title
        s.Icon = official.Icon
        s.Active = true
        if err := validateService(s); err != nil {
                return nil, err
        }
        if err := uc.teachers.AddService(ctx, s); err != nil {
                return nil, err
        }
        return s, nil
}

// UpdateService edits a service owned by the teacher. Content changes return it
// to pending moderation. Teachers may deactivate but cannot self-approve.
func (uc *TeacherUsecase) UpdateService(ctx context.Context, userID uint, s *domain.Service) error {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        existing, err := uc.teachers.ServiceByID(ctx, s.ID)
        if err != nil {
                return err
        }
        if existing.TeacherID != t.ID {
                return domain.ErrForbidden
        }

        // Switching the official service is allowed; the title/icon always come
        // from the catalog, so teacher input can never alter the service title.
        if s.OfficialServiceID != nil && *s.OfficialServiceID != 0 {
                official, err := uc.teachers.OfficialServiceByID(ctx, *s.OfficialServiceID)
                if err != nil {
                        return domain.ErrValidation
                }
                existing.OfficialServiceID = s.OfficialServiceID
                existing.Title = official.Title
                existing.Icon = official.Icon
        }
        if s.Duration > 0 {
                existing.Duration = s.Duration
        }
        // Price 0 is meaningful — it marks the service as free (خدمات رایگان).
        if s.Price >= 0 {
                existing.Price = s.Price
        }
        // Official content is pre-approved: catalog-based services stay active.
        existing.Active = s.Active
        if err := validateService(existing); err != nil {
                return err
        }
        return uc.teachers.UpdateService(ctx, existing)
}

// ToggleServiceActive is retained for compatibility but activation is an admin-only action.
func (uc *TeacherUsecase) ToggleServiceActive(ctx context.Context, userID uint, serviceID uint, active bool) error {
        if active {
                return domain.ErrForbidden
        }
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        s, err := uc.teachers.ServiceByID(ctx, serviceID)
        if err != nil {
                return err
        }
        if s.TeacherID != t.ID {
                return domain.ErrForbidden
        }
        s.Active = false
        return uc.teachers.UpdateService(ctx, s)
}

// DeleteService removes a service owned by the teacher.
func (uc *TeacherUsecase) DeleteService(ctx context.Context, userID, serviceID uint) error {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        s, err := uc.teachers.ServiceByID(ctx, serviceID)
        if err != nil {
                return err
        }
        if s.TeacherID != t.ID {
                return domain.ErrForbidden
        }
        return uc.teachers.DeleteService(ctx, t.ID, serviceID)
}

// ── work times ──

// SetWorkTimes replaces the teacher's availability slots after validating the
// complete schedule and rejecting overlapping ranges.
func (uc *TeacherUsecase) SetWorkTimes(ctx context.Context, userID uint, wt []domain.WorkTime) error {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        if err := validateWorkTimeSet(wt, 0); err != nil {
                return err
        }
        for i := range wt {
                wt[i].Active = true
        }
        return uc.teachers.SetWorkTimes(ctx, t.ID, wt)
}

// WorkTimes returns availability only for a public teacher profile.
func (uc *TeacherUsecase) WorkTimes(ctx context.Context, teacherID uint) ([]domain.WorkTime, error) {
        t, err := uc.teachers.ByID(ctx, teacherID)
        if err != nil {
                return nil, err
        }
        if !publicTeacher(t) {
                return nil, domain.ErrNotFound
        }
        return uc.teachers.WorkTimes(ctx, teacherID)
}

// AddWorkTime creates a single availability slot.
func (uc *TeacherUsecase) AddWorkTime(ctx context.Context, userID uint, wt *domain.WorkTime) error {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        wt.ID = 0
        wt.TeacherID = t.ID
        wt.Active = true
        existing, err := uc.teachers.WorkTimes(ctx, t.ID)
        if err != nil {
                return err
        }
        if err := validateWorkTimeSet(append(existing, *wt), 0); err != nil {
                return err
        }
        return uc.teachers.AddWorkTime(ctx, wt)
}

// UpdateWorkTime updates a single availability slot.
func (uc *TeacherUsecase) UpdateWorkTime(ctx context.Context, userID uint, wt *domain.WorkTime) error {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        wt.TeacherID = t.ID
        wt.Active = true
        existing, err := uc.teachers.WorkTimes(ctx, t.ID)
        if err != nil {
                return err
        }
        found := false
        candidate := make([]domain.WorkTime, 0, len(existing))
        for _, slot := range existing {
                if slot.ID == wt.ID {
                        found = true
                        candidate = append(candidate, *wt)
                } else {
                        candidate = append(candidate, slot)
                }
        }
        if !found {
                return domain.ErrNotFound
        }
        if err := validateWorkTimeSet(candidate, 0); err != nil {
                return err
        }
        return uc.teachers.UpdateWorkTime(ctx, wt)
}

// DeleteWorkTime deletes a single availability slot.
func (uc *TeacherUsecase) DeleteWorkTime(ctx context.Context, userID uint, workTimeID uint) error {
        t, err := uc.teacherForUser(ctx, userID)
        if err != nil {
                return err
        }
        return uc.teachers.DeleteWorkTime(ctx, t.ID, workTimeID)
}

func (uc *TeacherUsecase) teacherForUser(ctx context.Context, userID uint) (*domain.Teacher, error) {
        t, err := uc.teachers.ByUserID(ctx, userID)
        if errors.Is(err, domain.ErrNotFound) {
                return nil, domain.ErrTeacherProfileRequired
        }
        return t, err
}

// publicTeacher decides whether a profile is publicly viewable. Offline
// (available=false) teachers remain viewable — the UI marks them with a
// blinking red light — while booking and فراخوان guard availability separately.
func publicTeacher(t *domain.Teacher) bool {
        return t != nil && t.Status == domain.TeacherApproved && t.Verified && t.User != nil && t.User.Active
}

func validateTeacherProfileInput(in BecomeTeacherInput) error {
        if len([]rune(strings.TrimSpace(in.Field))) > 60 ||
                len([]rune(strings.TrimSpace(in.Tag))) > 60 ||
                len([]rune(strings.TrimSpace(in.Level))) > 30 ||
                len([]rune(strings.TrimSpace(in.City))) > 80 ||
                len([]rune(strings.TrimSpace(in.Bio))) > 1000 ||
                in.Price30 < 0 || in.Price60 < 0 || in.Price30 > 1_000_000_000 || in.Price60 > 1_000_000_000 ||
                len(in.Skills) > 20 {
                return domain.ErrValidation
        }
        for _, skill := range in.Skills {
                if len([]rune(strings.TrimSpace(skill))) > 50 {
                        return domain.ErrValidation
                }
        }
        return nil
}

func validateService(s *domain.Service) error {
        if s == nil {
                return domain.ErrValidation
        }
        s.Title = strings.TrimSpace(s.Title)
        s.Icon = strings.TrimSpace(s.Icon)
        // Price 0 is allowed and marks a free service (جلسات رایگان اساتید);
        // negative prices stay invalid.
        if s.Title == "" || len([]rune(s.Title)) > 160 || s.Duration < 10 || s.Duration > 240 ||
                s.Price < 0 || s.Price > 1_000_000_000 || len([]rune(s.Icon)) > 30 {
                return domain.ErrValidation
        }
        return nil
}

func validateWorkTimeSet(slots []domain.WorkTime, ignoredID uint) error {
        for i := range slots {
                if slots[i].ID == ignoredID {
                        continue
                }
                from, to, err := workTimeMinutes(slots[i])
                if err != nil {
                        return err
                }
                for j := i + 1; j < len(slots); j++ {
                        if slots[j].ID == ignoredID || slots[i].Weekday != slots[j].Weekday {
                                continue
                        }
                        otherFrom, otherTo, err := workTimeMinutes(slots[j])
                        if err != nil {
                                return err
                        }
                        if from < otherTo && to > otherFrom {
                                return domain.ErrConflict
                        }
                }
        }
        return nil
}

func workTimeMinutes(slot domain.WorkTime) (int, int, error) {
        if slot.Weekday < 0 || slot.Weekday > 6 {
                return 0, 0, domain.ErrValidation
        }
        fromTime, err := time.Parse("15:04", slot.FromTime)
        if err != nil {
                return 0, 0, domain.ErrValidation
        }
        toTime, err := time.Parse("15:04", slot.ToTime)
        if err != nil {
                return 0, 0, domain.ErrValidation
        }
        from := fromTime.Hour()*60 + fromTime.Minute()
        to := toTime.Hour()*60 + toTime.Minute()
        if from >= to {
                return 0, 0, domain.ErrValidation
        }
        return from, to, nil
}
