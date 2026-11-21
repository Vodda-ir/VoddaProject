package usecase

import (
        "context"
        "crypto/sha1"
        "encoding/hex"
        "encoding/xml"
        "errors"
        "fmt"
        "io"
        "log"
        "net/http"
        "net/url"
        "strconv"
        "strings"
        "time"

        "vodda/backend/internal/config"
        "vodda/backend/internal/domain"
)

// BbbUsecase drives the BigBlueButton classroom integration (اشتراک
// بیگ‌بلوباتن ایران) alongside the existing P2P live engine — the two paths
// are independent; this layer never touches the WebRTC signaling hub.
//
// Everything sensitive happens server-side: the shared secret is stored in
// platform settings (admin panel, live-editable) with the env-var fallback
// and never leaves the backend; join links are signed here with the standard
// checksum algorithm checksum = SHA1(method + exactQueryString + sharedSecret)
// and handed to the caller only as a ready-to-open URL. Media flows directly
// between the participants and the provider's servers.
//
// Recording is intentionally disabled: the platform neither stores nor
// publishes classroom recordings (record=false, no recording endpoints).
type BbbUsecase struct {
        session  *SessionUsecase
        users    domain.UserRepository
        settings domain.SettingRepository
        cfg      *config.Config
        client   *http.Client
}

// NewBbbUsecase wires the classroom usecase. The session usecase provides
// LiveAccess so authorization is identical to the built-in live room.
func NewBbbUsecase(session *SessionUsecase, users domain.UserRepository, settings domain.SettingRepository, cfg *config.Config) *BbbUsecase {
        return &BbbUsecase{
                session:  session,
                users:    users,
                settings: settings,
                cfg:      cfg,
                client:   &http.Client{Timeout: 15 * time.Second},
        }
}

// bbbAPIError carries the provider's messageKey so callers can special-case
// benign failures (e.g. end on an already-finished meeting) without parsing.
type bbbAPIError struct{ MessageKey string }

func (e *bbbAPIError) Error() string { return "bigbluebutton api failed: " + e.MessageKey }

// Is surfaces every provider-side rejection as ErrBBBUnavailable in the HTTP
// layer (502 + retry guidance) instead of an opaque internal error.
func (e *bbbAPIError) Is(target error) bool { return target == domain.ErrBBBUnavailable }

// bbbXMLResponse is the minimal parse of every BBB XML answer this usecase
// consumes. attendeeCount lives inside getMeetingInfo's meetingInfo element.
type bbbXMLResponse struct {
        XMLName       xml.Name `xml:"response"`
        ReturnCode    string   `xml:"returncode"`
        MessageKey    string   `xml:"messageKey"`
        Message       string   `xml:"message"`
        Running       string   `xml:"running"`
        AttendeeCount string   `xml:"meetingInfo>attendeeCount"`
}

// credentials resolves the BBB endpoint from platform settings first (the
// admin panel values are live-editable, mirroring googleCredentials) and
// falls back to the deployment env vars.
func (uc *BbbUsecase) credentials(ctx context.Context) (apiURL, secret string) {
        apiURL = strings.TrimSpace(uc.cfg.BBB.APIURL)
        secret = strings.TrimSpace(uc.cfg.BBB.SharedSecret)
        if uc.settings == nil {
                return
        }
        stored, err := uc.settings.All(ctx)
        if err != nil {
                return
        }
        if v := strings.TrimSpace(stored["bbb_api_url"]); v != "" {
                apiURL = v
        }
        if v := strings.TrimSpace(stored["bbb_shared_secret"]); v != "" {
                secret = v
        }
        return
}

// signedURL builds a checksummed BBB request URL. The query string is built
// once (url.Values.Encode — deterministic, sorted, matching Java's
// URLEncoder conventions for the characters our parameters contain) and the
// checksum covers exactly that string — the same bytes that go on the wire —
// per the provider's documented rule that the signed string and the sent
// string must be identical, spaces and encoding included.
func signedURL(apiURL, secret, method string, params url.Values) string {
        query := params.Encode()
        sum := sha1.Sum([]byte(method + query + secret))
        return strings.TrimRight(apiURL, "/") + "/" + method + "?" + query + "&checksum=" + hex.EncodeToString(sum[:])
}

// call performs a BBB API request and parses the XML answer. The signed URL
// and the secret are never logged — only the method and messageKey surface.
func (uc *BbbUsecase) call(ctx context.Context, apiURL, secret, method string, params url.Values) (*bbbXMLResponse, error) {
        signed := signedURL(apiURL, secret, method, params)
        req, err := http.NewRequestWithContext(ctx, http.MethodGet, signed, nil)
        if err != nil {
                return nil, fmt.Errorf("%w: %s", domain.ErrInternal, "bbb request build failed")
        }
        resp, err := uc.client.Do(req)
        if err != nil {
                log.Printf("bbb %s unreachable: %v", method, err)
                return nil, fmt.Errorf("%w: %s", domain.ErrBBBUnavailable, "bigbluebutton request failed")
        }
        defer func() { _ = resp.Body.Close() }()
        body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
        if err != nil {
                log.Printf("bbb %s body read failed: %v", method, err)
                return nil, fmt.Errorf("%w: %s", domain.ErrBBBUnavailable, "bigbluebutton response failed")
        }
        if resp.StatusCode < 200 || resp.StatusCode >= 300 {
                log.Printf("bbb %s http %d", method, resp.StatusCode)
                return nil, fmt.Errorf("%w: %s", domain.ErrBBBUnavailable, "bigbluebutton http error")
        }
        var parsed bbbXMLResponse
        if err := xml.Unmarshal(body, &parsed); err != nil {
                log.Printf("bbb %s unparsable response", method)
                return nil, fmt.Errorf("%w: %s", domain.ErrBBBUnavailable, "bigbluebutton bad response")
        }
        if parsed.ReturnCode != "SUCCESS" {
                log.Printf("bbb %s failed: %s", method, parsed.MessageKey)
                return nil, &bbbAPIError{MessageKey: parsed.MessageKey}
        }
        return &parsed, nil
}

// bbbMeetingID is the stable provider-side room id for a Vodda session.
func bbbMeetingID(sessionID uint) string {
        return "vodda-s" + strconv.FormatUint(uint64(sessionID), 10)
}

// bbbPasswords derives deterministic room passwords from the meeting id and
// shared secret. Join requests carry the signed role parameter; passwords
// are only a safety net for direct provider-side access.
func bbbPasswords(meetingID, secret string) (moderator, attendee string) {
        sum := sha1.Sum([]byte(meetingID + "|" + secret))
        digest := hex.EncodeToString(sum[:])
        return "vm" + digest[:10], "va" + digest[10:20]
}

// ensureMeeting creates the BBB room if it is not running yet. Create on an
// existing meeting is idempotent provider-side (duplicateWarning + SUCCESS),
// so a race between two participants joining simultaneously is harmless.
func (uc *BbbUsecase) ensureMeeting(ctx context.Context, apiURL, secret string, session *domain.Session) error {
        meetingID := bbbMeetingID(session.ID)
        running, err := uc.call(ctx, apiURL, secret, "isMeetingRunning", url.Values{"meetingID": {meetingID}})
        if err != nil {
                // سرویس‌دهنده برای اتاقِ ساخته‌نشده notFound برمی‌گرداند (نه
                // running=false) — یعنی هنوز کلاسی باز نشده و باید ساخت.
                var apiErr *bbbAPIError
                if !errors.As(err, &apiErr) || apiErr.MessageKey != "notFound" {
                        return err
                }
        } else if running.Running == "true" {
                return nil
        }
        title := strings.TrimSpace(session.Title)
        if title == "" {
                title = "کلاس وُدّا #" + strconv.FormatUint(uint64(session.ID), 10)
        }
        moderatorPW, attendeePW := bbbPasswords(meetingID, secret)
        logoutURL := strings.TrimRight(uc.cfg.FrontendBaseURL, "/") + "/app/session/" + strconv.FormatUint(uint64(session.ID), 10)
        createParams := url.Values{
                "name":        {title},
                "meetingID":   {meetingID},
                "record":      {"false"}, // ضبط جلسات فعلاً غیرفعال است
                "duration":    {strconv.Itoa(session.Duration)},
                "welcome":     {"به کلاس وُدّا خوش آمدید."},
                "moderatorPW": {moderatorPW},
                "attendeePW":  {attendeePW},
                "muteOnStart": {"true"},
                "logoutURL":   {logoutURL},
        }
        _, err = uc.call(ctx, apiURL, secret, "create", createParams)
        return err
}

// Join resolves classroom access, guarantees the BBB room exists and returns
// the signed join URL for the caller. Teacher/admin join as MODERATOR, the
// learner as VIEWER (promotable in-room by the moderator).
func (uc *BbbUsecase) Join(ctx context.Context, callerID uint, callerRole domain.Role, sessionID uint) (map[string]any, error) {
        session, roomRole, err := uc.session.LiveAccess(ctx, callerID, callerRole, sessionID)
        if err != nil {
                return nil, err
        }
        apiURL, secret := uc.credentials(ctx)
        if apiURL == "" || secret == "" {
                return nil, domain.ErrBBBNotConfigured
        }
        user, err := uc.users.ByID(ctx, callerID)
        if err != nil || user == nil {
                return nil, domain.ErrUnauthorized
        }
        if err := uc.ensureMeeting(ctx, apiURL, secret, session); err != nil {
                return nil, err
        }
        role := "VIEWER"
        moderatorPW, attendeePW := bbbPasswords(bbbMeetingID(sessionID), secret)
        if roomRole == domain.RoleTeacher || domain.RoleAdmin == roomRole {
                role = "MODERATOR"
        }
        roomPassword := attendeePW
        if role == "MODERATOR" {
                roomPassword = moderatorPW
        }
        fullName := strings.TrimSpace(user.Name)
        if fullName == "" {
                fullName = "کاربر وُدّا"
        }
        // سرویس‌دهندهٔ اشتراک، join را فقط با password می‌پذیرد (درخواستِ role-only
        // با خطای داخلی لاراول پاسخ می‌دهد)؛ رمز اتاقِ متناسب با نقش امضا می‌شود:
        // استاد/مدیر MODERATOR و قرآن‌آموز VIEWER (قابل ارتقا درون اتاق).
        joinParams := url.Values{
                "meetingID":    {bbbMeetingID(sessionID)},
                "fullName":     {fullName},
                "userID":       {fmt.Sprintf("u%d", callerID)},
                "password":     {roomPassword},
                "joinViaHtml5": {"true"},
                "redirect":     {"true"},
        }
        return map[string]any{
                "join_url":   signedURL(apiURL, secret, "join", joinParams),
                "meeting_id": bbbMeetingID(sessionID),
                "role":       strings.ToLower(role),
        }, nil
}

// Status reports whether the provider-side room is running and how many
// participants are inside right now (same access rules as joining).
func (uc *BbbUsecase) Status(ctx context.Context, callerID uint, callerRole domain.Role, sessionID uint) (map[string]any, error) {
        if _, _, err := uc.session.LiveAccess(ctx, callerID, callerRole, sessionID); err != nil {
                return nil, err
        }
        apiURL, secret := uc.credentials(ctx)
        if apiURL == "" || secret == "" {
                return nil, domain.ErrBBBNotConfigured
        }
        meetingID := bbbMeetingID(sessionID)
        runningResp, err := uc.call(ctx, apiURL, secret, "isMeetingRunning", url.Values{"meetingID": {meetingID}})
        if err != nil {
                var apiErr *bbbAPIError
                if !errors.As(err, &apiErr) || apiErr.MessageKey != "notFound" {
                        return nil, err
                }
                // notFound — اتاق هنوز ساخته یا اجرا نشده است؛ پاسخ آرام ادامه بده.
                return map[string]any{"running": false, "participants": 0}, nil
        }
        running := runningResp.Running == "true"
        participants := 0
        if running {
                if info, infoErr := uc.call(ctx, apiURL, secret, "getMeetingInfo", url.Values{"meetingID": {meetingID}}); infoErr == nil {
                        participants, _ = strconv.Atoi(strings.TrimSpace(info.AttendeeCount))
                }
        }
        return map[string]any{
                "running":      running,
                "participants": participants,
        }, nil
}

// End finishes the provider-side meeting. Only the session's teacher and
// admins may end it; ending an already-finished room counts as success.
func (uc *BbbUsecase) End(ctx context.Context, callerID uint, callerRole domain.Role, sessionID uint) (map[string]any, error) {
        _, roomRole, err := uc.session.LiveAccess(ctx, callerID, callerRole, sessionID)
        if err != nil {
                return nil, err
        }
        if roomRole == domain.RoleLearner {
                return nil, domain.ErrForbidden
        }
        apiURL, secret := uc.credentials(ctx)
        if apiURL == "" || secret == "" {
                return nil, domain.ErrBBBNotConfigured
        }
        meetingID := bbbMeetingID(sessionID)
        moderatorPW, _ := bbbPasswords(meetingID, secret)
        if _, err := uc.call(ctx, apiURL, secret, "end", url.Values{
                "meetingID": {meetingID},
                "password":  {moderatorPW},
        }); err != nil {
                var apiErr *bbbAPIError
                if !errors.As(err, &apiErr) || apiErr.MessageKey != "notFound" {
                        return nil, err
                }
        }
        return map[string]any{"ended": true}, nil
}
