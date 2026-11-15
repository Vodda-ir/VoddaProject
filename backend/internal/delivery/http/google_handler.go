// google_handler.go — HTTP layer of Google login (ورود با گوگل).
//
// Google redirects the learner's browser straight here, so the session
// cookies are set by the backend itself (the BFF normally mints them) and
// the browser lands back on the universal app already logged in.
package http

import (
        "net"
        "net/http"
        "net/url"
        "strings"
        "time"

        "github.com/gin-gonic/gin"

        "vodda/backend/internal/domain"
)

// googleCookieTTL mirrors the BFF session lifetime (30 days).
const googleCookieTTL = 30 * 24 * time.Hour

// GoogleAuthStatus tells the login screen whether the Google button should
// render at all (feature flag driven by GOOGLE_OAUTH_CLIENT_ID).
func (h *Handler) GoogleAuthStatus(c *gin.Context) {
        ok(c, gin.H{"enabled": h.Auth.GoogleEnabled()})
}

// GoogleAuthStart redirects to the Google consent screen.
func (h *Handler) GoogleAuthStart(c *gin.Context) {
        next := sanitizeGoogleNext(c.Query("next"))
        authURL, err := h.Auth.GoogleAuthURL(next)
        if err != nil {
                fail(c, domain.ErrNotFound)
                return
        }
        c.Redirect(http.StatusFound, authURL)
}

// GoogleAuthCallback completes the flow: state check → exchange → JWT →
// cookies → redirect into the app.
func (h *Handler) GoogleAuthCallback(c *gin.Context) {
        frontendBase := strings.TrimRight(h.frontendBaseURL(), "/")
        code := c.Query("code")
        state := c.Query("state")

        landWith := func(kind string) {
                c.Redirect(http.StatusFound, frontendBase+"/app/login?google="+url.QueryEscape(kind))
        }

        if code == "" || state == "" {
                landWith("missing")
                return
        }
        next, valid := h.Auth.ConsumeGoogleState(state)
        if !valid {
                landWith("state")
                return
        }

        result, err := h.Auth.GoogleExchange(c.Request.Context(), code)
        if err != nil {
                landWith("failed")
                return
        }

        secure := h.cookieSecure()
        cookieDomain := h.cookieDomain()
        setAuthCookie(c, "vodda_token", result.Token, secure, cookieDomain)
        setAuthCookie(c, "vodda_session", "1", secure, cookieDomain)

        c.Redirect(http.StatusFound, frontendBase+sanitizeGoogleNext(next))
}

// sanitizeGoogleNext allows only in-app landing paths so the redirect can
// never bounce the learner to an external origin. The universal app lives
// under /app (internal route "" = home), so the default is /app/.
func sanitizeGoogleNext(next string) string {
        next = strings.TrimSpace(next)
        if next == "" || !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") {
                return "/app/"
        }
        if !strings.HasPrefix(next, "/app") {
                return "/app/"
        }
        if next == "/app" {
                return "/app/"
        }
        return next
}

// frontendBaseURL resolves where the browser should land after login.
func (h *Handler) frontendBaseURL() string {
        if h.FrontendBase != "" {
                return h.FrontendBase
        }
        return "https://vodda.ir"
}

// cookieSecure reports whether cookies must be Secure (HTTPS frontend).
func (h *Handler) cookieSecure() bool {
        u, err := url.Parse(h.frontendBaseURL())
        return err == nil && u.Scheme == "https"
}

// cookieDomain derives the parent domain from the frontend base URL so the
// session is shared between vodda.ir and app.vodda.ir (same trick as the
// BFF's SESSION_COOKIE_DOMAIN). Localhost / bare IPs keep no domain attribute.
func (h *Handler) cookieDomain() string {
        u, err := url.Parse(h.frontendBaseURL())
        if err != nil {
                return ""
        }
        host := u.Hostname()
        if host == "" || host == "localhost" || net.ParseIP(host) != nil {
                return ""
        }
        parts := strings.Split(host, ".")
        if len(parts) >= 2 {
                return strings.Join(parts[len(parts)-2:], ".")
        }
        return host
}

// setAuthCookie sets one session cookie on the parent domain.
func setAuthCookie(c *gin.Context, name, value string, secure bool, domain string) {
        cookie := &http.Cookie{
                Name:     name,
                Value:    value,
                Path:     "/",
                Domain:   domain,
                MaxAge:   int(googleCookieTTL.Seconds()),
                HttpOnly: name == "vodda_token", // vodda_session is the JS-visible marker
                Secure:   secure,
                SameSite: http.SameSiteLaxMode,
        }
        http.SetCookie(c.Writer, cookie)
}
