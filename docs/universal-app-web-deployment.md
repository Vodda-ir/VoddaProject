# Universal App web deployment

This document defines the web deployment contract for the Universal App without changing the public site, `/panel`, or the native Capacitor runtime.

## Invariants

- Universal source stays in `frontend/src/universal-app/` and must not import `next/*`.
- Web authentication stays HttpOnly-cookie + BFF. The browser never receives or stores the native bearer token.
- Native authentication stays secure-token + `Authorization: Bearer` and is not affected by these web settings.
- The Next catch-all remains `frontend/src/app/app/[[...path]]/page.tsx`; subdomain-root deployment is a deployment rewrite, not a second Universal App source tree.

## Runtime/build variables

The Next host uses these deployment values:

- `UNIVERSAL_APP_ROOT_HOST` — runtime hostname that mounts the Universal App at `/`. Other hosts keep the `/app` base path. This lets one frontend image serve both `vodda.ir/app/...` and `app.vodda.ir/...`.
- `NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL` — BFF origin/base used by normal API calls. Defaults to `/api/backend`.
- `NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL` — BFF auth origin/base used by OTP/login/logout. Defaults to `/api/auth`.

The two `NEXT_PUBLIC_*` values are build configuration and contain no secrets. `UNIVERSAL_APP_ROOT_HOST` is supplied to the running Next server.

The web platform runtime uses `credentials: include` for BFF and auth requests. BFF requests stay on the current browser hostname, so cookies remain host-only, Secure, SameSite=Lax, and HttpOnly.

## `vodda.ir/app/...` and `app.vodda.ir/...`

Production values:

```env
UNIVERSAL_APP_ROOT_HOST=app.vodda.ir
NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL=/api/backend
NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL=/api/auth
```

The Next host selects `/app` for `vodda.ir` and an empty base path for `app.vodda.ir` from the incoming host. Public pages and `/panel/...` stay on `vodda.ir`; users on the app subdomain keep root-based URLs.

The reverse proxy for `app.vodda.ir` internally maps browser routes to the existing Next `/app` catch-all while preserving the browser URL. It passes `/_next/...`, `/api/...`, uploads, and static assets without that rewrite. Do not redirect users to `vodda.ir/app` or duplicate the Universal App source.

Conceptually:

```text
/                  -> internal Next request /app
/search            -> internal Next request /app/search
/teacher/123       -> internal Next request /app/teacher/123
/t/services        -> internal Next request /app/t/services
```

The checked-in Nginx template keeps framework/static and API namespaces outside that rewrite, especially `/_next/...` and `/api/...`, and preserves query strings.

## Native wrapper

Native uses `VITE_NATIVE_API_BASE_URL=https://api.vodda.ir/api/v1`, secure storage, and bearer authentication from `frontend/native/`. The backend CORS allow-list includes Capacitor's `capacitor://localhost` and Android's default `https://localhost` origins. Web API requests continue through same-origin BFF routes and never use the public API hostname.

## Production verification

After deployment, verify the app subdomain root and at least one deep link, then verify same-origin OTP/login and API calls on both web hosts. DNS/Arvan routing and browser/device behavior are runtime checks; source configuration alone does not prove them.
