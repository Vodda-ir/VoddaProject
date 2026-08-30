# Universal App web deployment

This document defines the web deployment contract for the Universal App without changing the public site, `/panel`, or the native Capacitor runtime.

## Invariants

- Universal source stays in `frontend/src/universal-app/` and must not import `next/*`.
- Web authentication stays HttpOnly-cookie + BFF. The browser never receives or stores the native bearer token.
- Native authentication stays secure-token + `Authorization: Bearer` and is not affected by these web settings.
- The Next catch-all remains `frontend/src/app/app/[[...path]]/page.tsx`; subdomain-root deployment is a deployment rewrite, not a second Universal App source tree.

## Runtime/build variables

The Next host reads these public deployment variables:

- `NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH` — browser-visible Universal App base path. Defaults to `/app`. Set to an empty string for a root-mounted subdomain.
- `NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL` — BFF origin/base used by normal API calls. Defaults to `/api/backend`.
- `NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL` — BFF auth origin/base used by OTP/login/logout. Defaults to `/api/auth`.

Because these are `NEXT_PUBLIC_*` variables, treat them as build/deployment configuration and never place secrets in them.

The web platform runtime uses `credentials: include` for BFF and auth requests. This preserves the current same-origin HttpOnly flow and also permits an explicitly configured same-site sibling origin when cookie Domain/SameSite/CORS policy is intentionally configured for it. Prefer same-origin BFF endpoints unless there is a concrete reason to split origins.

## Mode A — `vodda.ir/app/...`

Recommended values:

```env
NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH=/app
NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL=/api/backend
NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL=/api/auth
```

No deployment rewrite is required beyond the existing Next route. Public pages and `/panel/...` remain untouched.

## Mode B — `app.vodda.ir/...`

Recommended values:

```env
NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH=
NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL=/api/backend
NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL=/api/auth
```

The reverse proxy for `app.vodda.ir` should internally map browser routes to the existing Next `/app` catch-all while preserving the browser URL. Do not redirect users to `vodda.ir/app` and do not duplicate the Universal App source.

Conceptually:

```text
/                  -> internal Next request /app
/search            -> internal Next request /app/search
/teacher/123       -> internal Next request /app/teacher/123
/t/services        -> internal Next request /app/t/services
```

Keep framework/static and API namespaces outside that rewrite, especially `/_next/...` and `/api/...`. The exact Nginx/CDN rule belongs to deployment infrastructure and should preserve query strings.

If BFF/auth stay on the same `app.vodda.ir` origin, no cross-origin cookie policy is needed. If they are intentionally hosted on another same-site origin, configure cookie `Domain`, `Secure`, `SameSite` and server CORS/credentials together; the frontend already sends credentials but does not weaken the HttpOnly model.

## Native wrapper

These web variables do not configure Capacitor. Native continues to use `VITE_NATIVE_API_BASE_URL`, secure storage and bearer authentication from `frontend/native/`.

## Remaining migration checks

Before declaring the whole subdomain-readiness phase complete, audit Universal App asset references and business components for any absolute `/app` asset dependency or hardcoded hostname. Those checks are deliberately separate from this deployment-config package.
