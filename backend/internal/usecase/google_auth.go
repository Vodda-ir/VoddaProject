// google_auth.go — ورود با گوگل (Google OAuth 2.0 login).
//
// کاربرانی که از خارج از کشور وارد می‌شوند معمولاً پیامک OTP را نمی‌گیرند؛
// این مسیر آنان را با حساب گوگل وارد می‌کند. جریان:
//
//	GET /api/v1/auth/google            → ۳۰۲ به صفحهٔ رضایت گوگل
//	GET /api/v1/auth/google/callback   → تبادل کد، یافتن/ساخت کاربر، صدور JWT
//
// تا وقتی GOOGLE_OAUTH_CLIENT_ID خالی باشد مسیرها غیرفعال‌اند و دکمهٔ
// «ورود با گوگل» در رابط کاربری پنهان می‌ماند.
package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"vodda/backend/internal/domain"
)

const (
	googleAuthEndpoint  = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenEndpoint = "https://oauth2.googleapis.com/token"
	googleStateTTL      = 10 * time.Minute
	googleHTTPTimeout   = 15 * time.Second
	googleClientTimeout = 20 * time.Second
)

// googleStateEntry carries the learner's intended landing path across the
// Google round-trip; states are single-use and expire quickly (CSRF).
type googleStateEntry struct {
	next      string
	expiresAt time.Time
}

// googlePendingStates is the in-memory CSRF store. The backend is a single
// process (same constraint as the live hub), so memory is the right home.
var googlePendingStates = struct {
	sync.Mutex
	m map[string]googleStateEntry
}{m: make(map[string]googleStateEntry)}

// googleClaims is the subset of the Google id_token payload we rely on.
type googleClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Exp           int64  `json:"exp"`
	Iss           string `json:"iss"`
	Aud           string `json:"aud"`
}

// googleCredentials resolves the OAuth client from platform settings (admin
// panel, editable live) with the env-var configuration as fallback.
func (uc *AuthUsecase) googleCredentials(ctx context.Context) (clientID, clientSecret, redirectURI string) {
	clientID = uc.cfg.Google.ClientID
	clientSecret = uc.cfg.Google.ClientSecret
	redirectURI = uc.cfg.Google.RedirectURI
	if uc.settings == nil {
		return
	}
	stored, err := uc.settings.All(ctx)
	if err != nil {
		return
	}
	if v := strings.TrimSpace(stored["google_client_id"]); v != "" {
		clientID = v
	}
	if v := strings.TrimSpace(stored["google_client_secret"]); v != "" {
		clientSecret = v
	}
	if v := strings.TrimSpace(stored["google_redirect_uri"]); v != "" {
		redirectURI = v
	}
	return
}

// GoogleEnabled reports whether Google login is configured.
func (uc *AuthUsecase) GoogleEnabled(ctx context.Context) bool {
	clientID, clientSecret, _ := uc.googleCredentials(ctx)
	return clientID != "" && clientSecret != ""
}

// GoogleAuthURL builds the Google consent redirect for a fresh login attempt.
func (uc *AuthUsecase) GoogleAuthURL(ctx context.Context, next string) (string, error) {
	clientID, _, redirectURI := uc.googleCredentials(ctx)
	if clientID == "" {
		return "", domain.ErrNotFound
	}

	rawState := make([]byte, 24)
	if _, err := rand.Read(rawState); err != nil {
		return "", err
	}
	state := hex.EncodeToString(rawState)

	googlePendingStates.Lock()
	// Opportunistic cleanup of expired states keeps the map tiny.
	now := time.Now()
	for k, v := range googlePendingStates.m {
		if now.After(v.expiresAt) {
			delete(googlePendingStates.m, k)
		}
	}
	googlePendingStates.m[state] = googleStateEntry{next: next, expiresAt: now.Add(googleStateTTL)}
	googlePendingStates.Unlock()

	q := url.Values{}
	q.Set("client_id", clientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", "code")
	q.Set("scope", "openid email profile")
	q.Set("state", state)
	q.Set("prompt", "select_account")
	return googleAuthEndpoint + "?" + q.Encode(), nil
}

// ConsumeGoogleState validates and burns a one-time state, returning the
// stored landing path. Unknown/expired/replayed states are rejected.
func (uc *AuthUsecase) ConsumeGoogleState(state string) (string, bool) {
	googlePendingStates.Lock()
	defer googlePendingStates.Unlock()
	entry, ok := googlePendingStates.m[state]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(googlePendingStates.m, state)
		return "", false
	}
	delete(googlePendingStates.m, state)
	return entry.next, true
}

// GoogleExchange finishes the OAuth flow: code → id_token → user → JWT.
func (uc *AuthUsecase) GoogleExchange(ctx context.Context, code string) (*AuthResult, error) {
	clientID, clientSecret, redirectURI := uc.googleCredentials(ctx)
	if clientID == "" || clientSecret == "" {
		return nil, domain.ErrNotFound
	}

	idToken, err := uc.googleExchangeCode(ctx, code, clientID, clientSecret, redirectURI)
	if err != nil {
		log.Printf("google: code exchange failed: %v", err)
		return nil, domain.ErrOTPInvalid
	}

	claims, err := parseGoogleIDToken(idToken)
	if err != nil {
		log.Printf("google: id_token rejected: %v", err)
		return nil, domain.ErrOTPInvalid
	}
	if claims.Aud != clientID {
		return nil, domain.ErrOTPInvalid
	}
	if claims.Exp != 0 && time.Now().After(time.Unix(claims.Exp, 0)) {
		return nil, domain.ErrOTPInvalid
	}
	if claims.Sub == "" || claims.Email == "" || !claims.EmailVerified {
		return nil, domain.ErrOTPInvalid
	}

	user, err := uc.upsertGoogleUser(ctx, claims)
	if err != nil {
		return nil, err
	}
	if !user.Active {
		return nil, domain.ErrForbidden
	}

	tkn, err := uc.tokens.Generate(user.ID, user.Role)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: tkn, User: user, NeedProfile: NeedsProfile(user)}, nil
}

// googleExchangeCode swaps the authorization code for tokens at Google's
// token endpoint (plain TLS POST — no extra dependency) and returns id_token.
func (uc *AuthUsecase) googleExchangeCode(ctx context.Context, code, clientID, clientSecret, redirectURI string) (string, error) {
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("redirect_uri", redirectURI)
	form.Set("grant_type", "authorization_code")

	exctx, cancel := context.WithTimeout(ctx, googleHTTPTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(exctx, http.MethodPost, googleTokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: googleClientTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("google token endpoint status %d", resp.StatusCode)
	}
	var parsed struct {
		IDToken string `json:"id_token"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", err
	}
	if parsed.IDToken == "" {
		return "", errors.New("google: token response lacks id_token")
	}
	return parsed.IDToken, nil
}

// upsertGoogleUser finds the account behind a verified Google identity:
// by google_id, then by verified e-mail (linking both ways), otherwise a new
// learner account is created. Mobile stays empty-ish: Google users log in
// through Google, so they carry a deterministic placeholder mobile to satisfy
// the unique index without ever receiving OTP.
func (uc *AuthUsecase) upsertGoogleUser(ctx context.Context, claims *googleClaims) (*domain.User, error) {
	email := strings.ToLower(strings.TrimSpace(claims.Email))

	if user, err := uc.users.ByGoogleID(ctx, claims.Sub); err == nil {
		uc.linkGoogleIdentity(ctx, user, claims, email)
		return user, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	if user, err := uc.users.ByEmail(ctx, email); err == nil {
		user.GoogleID = &claims.Sub
		user.AuthProvider = "google"
		uc.linkGoogleIdentity(ctx, user, claims, email)
		return user, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	name := strings.TrimSpace(claims.Name)
	if name == "" {
		name = strings.TrimSpace(claims.GivenName + " " + claims.FamilyName)
	}
	if name == "" {
		name = strings.Split(email, "@")[0]
	}
	if len(name) > 120 {
		name = name[:120]
	}

	gid := claims.Sub
	user := &domain.User{
		Name:         name,
		Mobile:       googlePlaceholderMobile(claims.Sub),
		Email:        &email,
		GoogleID:     &gid,
		AuthProvider: "google",
		Role:         domain.RoleLearner,
		Active:       true,
	}
	if claims.Picture != "" && len(claims.Picture) <= 255 {
		user.AvatarURL = claims.Picture
	}
	if err := uc.users.Create(ctx, user); err != nil {
		// Two concurrent first-logins can race on the unique e-mail; re-read.
		if existing, byErr := uc.users.ByEmail(ctx, email); byErr == nil {
			existing.GoogleID = &claims.Sub
			existing.AuthProvider = "google"
			uc.linkGoogleIdentity(ctx, existing, claims, email)
			return existing, nil
		}
		return nil, err
	}
	log.Printf("google: created user=%d for %s", user.ID, maskEmail(email))
	NotifyAdmins(ctx, uc.notifs, uc.users, "مدیریت: ثبت‌نام کاربر جدید",
		"کاربر تازه‌ای با نام "+name+" از طریق گوگل وارد وُدّا شد.")
	return user, nil
}

// linkGoogleIdentity backfills the picture/identity columns on repeat logins.
func (uc *AuthUsecase) linkGoogleIdentity(ctx context.Context, user *domain.User, claims *googleClaims, email string) {
	changed := false
	if user.GoogleID == nil || *user.GoogleID != claims.Sub {
		gid := claims.Sub
		user.GoogleID = &gid
		changed = true
	}
	if user.Email == nil || *user.Email != email {
		user.Email = &email
		changed = true
	}
	if user.AuthProvider != "google" {
		user.AuthProvider = "google"
		changed = true
	}
	if user.AvatarURL == "" && claims.Picture != "" && len(claims.Picture) <= 255 {
		user.AvatarURL = claims.Picture
		changed = true
	}
	if changed {
		if err := uc.users.Update(ctx, user); err != nil {
			log.Printf("google: identity link update user=%d: %v", user.ID, err)
		}
	}
}

// googlePlaceholderMobile derives a stable 15-char unique mobile from the
// Google subject so the NOT NULL UNIQUE column is satisfied without OTP.
func googlePlaceholderMobile(sub string) string {
	sum := sha256.Sum256([]byte("google:" + sub))
	return "g" + hex.EncodeToString(sum[:])[:14]
}

// parseGoogleIDToken decodes the id_token payload. The token was received
// directly from Google's token endpoint over TLS, so signature verification
// against JWKS is unnecessary on this path; audience and expiry are still
// enforced by the caller.
func parseGoogleIDToken(idToken string) (*googleClaims, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return nil, errors.New("google: malformed id_token")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("google: id_token payload: %w", err)
	}
	var claims googleClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("google: id_token json: %w", err)
	}
	if claims.Iss != "accounts.google.com" && claims.Iss != "https://accounts.google.com" {
		return nil, errors.New("google: unexpected issuer")
	}
	return &claims, nil
}

func maskEmail(email string) string {
	at := strings.Index(email, "@")
	if at <= 1 {
		return "***"
	}
	return email[:2] + "***" + email[at:]
}
