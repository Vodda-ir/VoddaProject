package usecase

import (
	"encoding/json"
	"strings"
	"testing"

	"vodda/backend/internal/domain"
)

func TestNeedsProfileUsesPersistedName(t *testing.T) {
	cases := []struct {
		name string
		user *domain.User
		want bool
	}{
		{name: "missing user", user: nil, want: true},
		{name: "blank name", user: &domain.User{Name: "   "}, want: true},
		{name: "completed profile", user: &domain.User{Name: "کاربر ودا"}, want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := NeedsProfile(tc.user); got != tc.want {
				t.Fatalf("NeedsProfile() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestCurrentUserStateKeepsMeShapeAndAddsNeedProfile(t *testing.T) {
	payload, err := json.Marshal(&CurrentUserState{
		User:        &domain.User{ID: 7, Name: "", Mobile: "09123456789", Role: domain.RoleLearner},
		NeedProfile: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	body := string(payload)
	for _, fragment := range []string{`"id":7`, `"mobile":"09123456789"`, `"need_profile":true`} {
		if !strings.Contains(body, fragment) {
			t.Fatalf("JSON payload %s does not contain %s", body, fragment)
		}
	}
	if strings.Contains(body, `"User"`) || strings.Contains(body, `"user"`) {
		t.Fatalf("embedded user must keep the existing flat /me shape: %s", body)
	}
}
