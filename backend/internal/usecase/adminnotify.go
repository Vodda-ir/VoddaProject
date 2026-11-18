package usecase

import (
	"context"

	"vodda/backend/internal/domain"
)

// NotifyAdmins fans one operational event out to every active admin account.
// Used for live admin notifications (ثبت‌نام، تراکنش‌ها، رزروها، …) so the
// platform owner sees what happens in the admin panel from inside the app,
// regardless of the learner/teacher mode they are currently in. Titles are
// prefixed with «مدیریت:» so the mobile client can classify them (see
// CallAlertBar) and route taps to the admin panel.
func NotifyAdmins(ctx context.Context, notifs domain.NotificationRepository, users domain.UserRepository, title, body string) {
	if notifs == nil || users == nil {
		return
	}
	ids, err := users.AdminIDs(ctx)
	if err != nil {
		return
	}
	for _, id := range ids {
		_ = notifs.Create(ctx, &domain.Notification{UserID: id, Title: title, Body: body})
	}
}
