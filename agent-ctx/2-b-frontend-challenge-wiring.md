# Task 2-b — Admin challenge cancel/restore/delete wiring + challenges entries + InstaQuran points card

Agent: 2-b (frontend wiring agent)
Scope: 5 files only (backend untouched).

## Summary of changes per file

### 1. `frontend/src/universal-app/features/admin/sections/AdminChallengesSection.tsx`
- Signature changed to `AdminChallengesSection({ config }: { config: UniversalAppConfig })`; added imports `UniversalAppConfig` (type) and `navigateAppRoute` from `../../../router`, plus `adminCancelChallenge` / `adminRestoreChallenge` from `../../challenge/api`.
- New full-width gold shortcut banner at the very top of the section (above stats tiles): Icon "sparkle" in gold circle, title `L("مشاهده و شرکت در چالش‌ها")`, caption `L("به‌عنوان کاربر وارد فهرست چالش‌ها شوید؛ ثبت‌نام، ارسال اثر و رأی همین‌جاست.")`, chevron; onClick `navigateAppRoute("challenges", config)`.
- `canDelete` is now `status === "registration" || status === "canceled"` (delete button always rendered for both; previously required zero participants).
- `remove()` confirm text: registration + participantsCount > 0 → "با حذف چالش، همهٔ شرکت‌کنندگان و رأی‌های آن هم حذف می‌شوند. ادامه می‌دهید؟"; canceled → "حذف چالش‌های لغوشده — حذف چالش بازگشت‌پذیر نیست. ادامه می‌دهید؟"; else unchanged text. Still `confirmDialog(..., { danger: true, confirmLabel: L("حذف"), cancelLabel: L("انصراف") })`.
- New `cancel(row)` handler (gold button, Icon "x", label `L("لغو چالش")`, shown for registration/active/judging): confirmDialog with "لغو چالش بازگشت‌پذیر نیست؛ امتیاز ثبت‌نام شرکت‌کنندگان بازگردانده می‌شود. ادامه می‌دهید؟" (danger, confirmLabel "لغو چالش", cancelLabel "انصراف") → `adminCancelChallenge` → toast "چالش لغو شد." → `fetchRows()` + refresh open detail (`loadDetail`). Error → `messageOf(cause, L("لغو چالش انجام نشد."))`.
- New `restore(row)` handler (green button, Icon "refresh", label `L("بازگشایی چالش")`, shown for canceled) → `adminRestoreChallenge` → toast "چالش به مرحلهٔ ثبت‌نام بازگشت." → refresh; error fallback "بازگشایی چالش انجام نشد.".
- Buttons use the file's existing inline-style pattern + `vodda-tappable` + `disabled={busy}`.

### 2. `frontend/src/universal-app/features/admin/AdminDashboardScreen.tsx`
- Renamed `{ config: _config }` → `{ config }`; renders `<AdminChallengesSection config={config} />`. Nothing else touched.

### 3. `frontend/src/universal-app/features/teacher/TeacherDashboardScreen.tsx`
- Quick-grid ("مدیریت سریع"): added first entry `["award" as const, "داوری چالش‌ها", "/challenges"]`.
- New wide judge banner card directly above the quick-grid section: `gradients.gold` background (gradients already imported), border 1px rgba(191,149,64,.45), radius 18, padding 14; gold circle Icon "award", title `L("داوری چالش‌ها")` (fontWeight 800, fontSize 13), caption `L("به‌عنوان استاد داور، رأی شما جداگانه در نتایج شمرده می‌شود.")`, muted Icon "chevronL"; onClick `navigateApp("/challenges", config)`.

### 4. `frontend/src/universal-app/features/profile/LearnerProfileScreen.tsx`
- Imports added: `fetchMyPoints, pointReasonLabel, type PointSnapshotData` from `../challenge/api`; `localizedDigits` from `../../ui/persian`; `formatAppDateTime` from `../../ui/jalali`.
- New state `points: PointSnapshotData | null`; effect keyed on `[platform, user]` (runs after successful session restore) loads `fetchMyPoints`; on failure sets null → card hidden silently.
- New InstaQuran Card (elevated, `vodda-enter vodda-enter-delay-1`, padding 16, borderRadius 24) inserted right after the teacher-mode button block: gold circle Icon "coins" + `L("امتیاز اینستاقرآن شما")` + balance `localizedDigits(points.balance, lang)` right-aligned in `colors.goldDark` fontWeight 900; caption "امتیازِ شما از رقابت‌های قرآنی وُدّا — شرکت، رتبه و پاداش"; ledger (max 5, `points.ledger.slice(0, 5)`) rows with `pointReasonLabel`, `formatAppDateTime(entry.createdAt, lang)`, amount `+N / −N` colored success/danger with `dir="ltr"`; empty ledger → "هنوز امتیازی ثبت نشده است"; info footer with Icon "info" + "چگونه امتیاز بگیرم؟" + "شرکت در هر چالش ۱۰ امتیاز و رتبهٔ اول تا پنجم تا ۱۰۰ امتیاز پاداش دارد."; CTA `Button variant="secondary" fullWidth` with Icon "sparkle" label "مشاهدهٔ چالش‌ها" → `navigateApp("/challenges", config)` (same helper the file already uses).

### 5. `frontend/src/app/panel/admin/challenges/page.tsx` (web panel parity)
- `phaseAction` action union extended to `'start' | 'judging' | 'publish' | 'cancel' | 'restore'`; cancel confirm «لغو چالش بازگشت‌پذیر نیست؛ امتیاز ثبت‌نام شرکت‌کنندگان بازگردانده می‌شود. ادامه می‌دهید؟», restore confirm «چالش به مرحلهٔ ثبت‌نام بازگشته و ظرفیت از نو باز می‌شود. ادامه می‌دهید؟»; POSTs to existing `${row.id}/${action}` endpoint pattern; flash «چالش لغو شد.» / «چالش به مرحلهٔ ثبت‌نام بازگشت.»; refreshes list + open detail.
- `remove()` confirm message includes participants warning when `row.participants_count > 0` («با حذف چالش، همهٔ شرکت‌کنندگان و رأی‌های آن هم حذف می‌شوند. ادامه می‌دهید؟»), else unchanged.
- Button row: «لغو» PanelButton (icon "x", default tone) for registration/active/judging; «بازگشایی» PanelButton (icon "refresh", tone primary) for canceled; «حذف» PanelButton (tone danger, icon trash) shown for registration OR canceled (moved out of the registration-only fragment).

## Verification
- `bun run lint` (eslint . --max-warnings=0): PASS, zero warnings/errors.
- `bunx tsc --noEmit -p tsconfig.json`: PASS, no output (clean).
- Dev server log healthy (GET / 200, no compile errors).

## Deviations
- None material. Two small notes:
  1. Points effect is keyed on `[platform, user]` so it fetches after session restore (fetch at bare mount could race the auth cookie check); failure still hides the card silently per spec.
  2. Web panel delete confirm keeps the challenge title in the message («حذف «عنوان»: با حذف چالش، …») to preserve the file's existing message style while using the exact required warning sentence.
- Pre-existing errors in untouched files: none (tsc fully clean).
