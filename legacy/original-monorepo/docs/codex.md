# codex.md

## Baseline Snapshot (2026-02-24)

- Repo shape: `backend/` (Go + Gin + MySQL), `main/` (Next.js), `app/` (Flutter).
- Baseline before implementation:
  - `backend`: only `POST /auth/request-otp`, `POST /auth/verify-otp`, `GET /me`.
  - `main`: OTP login UI existed; most domain pages were placeholders.
  - `app`: login screen placeholder only.
- Current implementation in this run:
  - Backend now includes Teacher, Booking, Session token/end, Wallet, Withdraw, Rating, Notification, Admin APIs.
  - Web pages `/teachers`, `/app/bookings`, `/app/wallet`, `/app/profile`, `/teacher/sessions`, `/teacher/income`, `/admin/teachers/pending`, `/admin/withdraw-requests` connected to API.
  - Flutter now has OTP login flow, authenticated state with `me`, role switch, teachers list/detail pages.

## Comparison Matrix

| Scope | `cursor_ins.md` | `vodda.md` | Current Code Status |
|---|---|---|---|
| Architecture | 3-app monorepo (`backend/main/app`) with MySQL | product-level MVP narrative | DONE |
| Auth OTP | Required | Required | DONE |
| Active Role | `active_role` switching required | single app for learner/teacher concept | DONE (backend + web + flutter state) |
| Teacher Profile + Approve | Required endpoints | Required flow | DONE (API + web admin + teacher profile form) |
| Teacher Search/List | Required (`/teachers`) | Required flow | DONE (backend + web + flutter list/detail) |
| Booking Flow | Required (`/bookings`, accept/reject) | Required flow | DONE (backend + web learner/teacher) |
| Session Token | Required (`/sessions/:id/token`) | Required flow | DONE (stub token) |
| Wallet/Withdraw | Required | Required flow | DONE (API + web wallet + teacher/admin withdraw UI) |
| Rating | Required (`/ratings`) | Required | DONE (API + web + flutter submission) |
| Notifications | Required table + flows | Required flow | DONE (API + web + flutter list) |
| Docker Port/Env consistency | Must be runnable via compose | N/A | DONE (backend port mapping + API URL override) |
| SMS fallback security | avoid hardcoded sensitive values | N/A | DONE |

## Execution Checklist

### P0 - Root Report
- [x] DONE: create `codex.md` in project root.
- [x] DONE: include `Baseline Snapshot`, `Comparison Matrix`, `Execution Checklist`, `Decision Log`, `Daily Progress Log`.

### P1 - Technical Stabilization
- [x] DONE: `docker-compose.yml` backend port mapping fixed to use `${BACKEND_PORT}` on both host/container.
- [x] DONE: `NEXT_PUBLIC_API_URL` in compose made env-overridable.
- [x] DONE: sensitive SMS defaults removed from backend config.
- [x] DONE: `users.active_role` added to model.
- [x] DONE: `user_roles` composite unique (`user_id`, `role`) applied.
- [x] DONE: manual SQL migration logic added for index correction + role normalization.

### P2 - Auth/Profile/Role E2E
- [x] DONE: `PATCH /me/profile`.
- [x] DONE: `POST /me/active-role` with new token issuance.
- [x] DONE: web profile page connected to API.
- [x] DONE: web role switch in header + profile page.
- [x] DONE: flutter OTP login implemented with `get /me` hydration.

### P3 - Teacher Lifecycle + Search + Admin Approval
- [x] DONE: `POST /teacher/profile`.
- [x] DONE: `GET /teachers`, `GET /teachers/:id`.
- [x] DONE: `GET /admin/teachers/pending`, approve/reject endpoints.
- [x] DONE: web teachers list connected.
- [x] DONE: web admin pending teachers connected (approve/reject actions).
- [x] DONE: flutter teachers list/detail connected.

### P4 - Booking + Session Token
- [x] DONE: `POST /bookings`, accept/reject.
- [x] DONE: learner and teacher booking list endpoints added.
- [x] DONE: slot conflict check implemented.
- [x] DONE: `POST /sessions/:id/token` implemented (stub provider token).
- [x] DONE: web booking create + teacher accept/reject pages connected.
- [x] DONE: flutter booking list/create UI connected.

### P5 - Wallet + Withdraw + Commission
- [x] DONE: `POST /wallet/topup/initiate`, `POST /wallet/topup/verify` (idempotent per reference).
- [x] DONE: `GET /wallet/transactions`.
- [x] DONE: `POST /wallet/withdraw-requests`.
- [x] DONE: `GET /admin/withdraw-requests`, process endpoint.
- [x] DONE: settlement with commission in session end (`POST /sessions/:id/end`).
- [x] DONE: web wallet + teacher withdraw + admin withdraw pages connected.
- [x] DONE: flutter wallet topup/transactions/withdraw request UI connected.

### P6 - Rating + Notification + Finalization
- [x] DONE: `POST /ratings` with `booking.status == completed` guard.
- [x] DONE: `GET /notifications`, `POST /notifications/:id/read`.
- [x] DONE: notification generation wired into core actions (booking, approval, reject, withdraw process, session end).
- [x] DONE: web rating submission on completed bookings implemented.
- [x] DONE: flutter notifications + rating submission flows added.
- [x] DONE: README updated with implemented MVP API surface.
- [~] PARTIAL: regression checks for web/flutter blocked by missing local `npm`/`flutter` binaries.

## Decision Log

1. Source of truth locked as: technical constraints from `cursor_ins.md`, product flow priorities from `vodda.md`.
2. Database stays MySQL (no switch to PostgreSQL/Redis/MinIO in this pass).
3. Session token and payment remain MVP stub-friendly; real providers can be swapped in later without route changes.
4. Commission modeled as ledger transactions on teacher wallet (`payout` + `commission`) and learner charge.
5. `POST /sessions/:id/end` added to make financial completion flow executable for MVP.

## Daily Progress Log

### 2026-02-24
- Implemented P0 and P1 completely.
- Implemented backend APIs for P2..P6 and registered routes.
- Implemented web integration for core MVP flows (auth/profile/teacher/booking/wallet/admin).
- Added web rating submission flow on completed bookings.
- Implemented flutter auth OTP flow + role-aware state + teacher discovery + booking + wallet + notifications + rating actions.
- Validation executed:
  - `go test ./...` in `backend`: PASS
  - `npm`/`flutter` commands unavailable in this environment; web/flutter runtime checks deferred.
