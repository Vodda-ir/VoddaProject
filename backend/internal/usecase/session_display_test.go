package usecase

import (
	"testing"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
)

func TestDisplaySessionsUsesBusinessTimezone(t *testing.T) {
	uc := &SessionUsecase{cfg: &config.Config{AppTimezone: "Asia/Tehran"}}
	scheduled := time.Date(2026, time.July, 30, 5, 30, 0, 0, time.UTC)

	items, err := uc.displaySessions([]domain.Session{{
		ID:          1,
		ScheduledAt: scheduled,
		Duration:    30,
	}})
	if err != nil {
		t.Fatalf("displaySessions returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one item, got %d", len(items))
	}
	if items[0].LocalDate != "2026-07-30" || items[0].LocalStart != "09:00" || items[0].LocalEnd != "09:30" {
		t.Fatalf("unexpected local display: %#v", items[0])
	}
}

func TestDisplaySessionsRejectsMissingTimezoneConfig(t *testing.T) {
	uc := &SessionUsecase{}
	if _, err := uc.displaySessions(nil); err == nil {
		t.Fatal("expected missing timezone config to fail")
	}
}
