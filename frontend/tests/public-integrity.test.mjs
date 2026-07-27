import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public pages do not fall back to fabricated teachers or metrics', async () => {
  const [home, sections, about] = await Promise.all([
    read('src/app/page.tsx'),
    read('src/components/web/sections.tsx'),
    read('src/app/about/page.tsx'),
  ]);

  assert.doesNotMatch(home, /mockTeachers|sampleTeachers|fallbackTeachers/);
  assert.doesNotMatch(sections, /href=["']#["']/);
  assert.doesNotMatch(sections, /۱۲۰\+|۴۰\+|منتخب هفته|اساتید دنبال‌شده/);
  assert.doesNotMatch(about, /هزار|میلیون|تماس صوتی امن/);
});

test('contact form persists through the support API', async () => {
  const [contact, api, bff] = await Promise.all([
    read('src/app/contact/page.tsx'),
    read('src/lib/api.ts'),
    read('src/app/api/backend/[...path]/route.ts'),
  ]);

  assert.match(contact, /api\.sendSupportMessage/);
  assert.match(api, /\/support\/messages/);
  assert.match(bff, /path\[0\] === 'support'/);
});

test('public search uses backend field values, pagination and abortable URL state', async () => {
  const search = await read('src/app/search/page.tsx');
  assert.match(search, /آموزش قرآن کریم/);
  assert.match(search, /مداحی اهل‌بیت/);
  assert.match(search, /window\.history\.replaceState/);
  assert.match(search, /AbortController/);
  assert.match(search, /totalPages/);
});

test('legacy panel API paths are routed through the HttpOnly BFF', async () => {
  const [config, bff] = await Promise.all([
    read('next.config.js'),
    read('src/app/api/backend/[...path]/route.ts'),
  ]);
  assert.match(config, /source:\s*['"]\/api\/v1\/:path\*['"]/);
  assert.match(config, /destination:\s*['"]\/api\/backend\/:path\*['"]/);
  assert.match(bff, /request\.cookies\.get\('vodda_token'\)/);
  assert.match(bff, /headers\.set\('authorization'/);
});

test('production wallet and session UI do not advertise inactive capabilities', async () => {
  const [wallet, dashboard, faq] = await Promise.all([
    read('src/app/panel/user/wallet/page.tsx'),
    read('src/app/panel/user/page.tsx'),
    read('src/app/faq/page.tsx'),
  ]);
  assert.doesNotMatch(wallet, /QUICK_CHARGE|\/wallet\/charge/);
  assert.doesNotMatch(dashboard, /پیوستن/);
  assert.match(faq, /تماس صوتی داخل سامانه هنوز فعال نشده/);
  assert.match(faq, /درگاه پرداخت عمومی هنوز فعال نشده/);
});

test('admin dashboard contains no fabricated time-series chart', async () => {
  const dashboard = await read('src/app/panel/admin/page.tsx');
  assert.doesNotMatch(dashboard, /MiniBars|\[3\.1,\s*3\.9/);
  assert.match(dashboard, /pending_teachers/);
  assert.match(dashboard, /نمودار تاریخی/);
});

test('web booking consumes backend-authoritative timezone-aware availability', async () => {
  const [booking, api, router, availability] = await Promise.all([
    read('src/app/panel/user/book/page.tsx'),
    read('src/lib/api.ts'),
    read('../backend/internal/delivery/http/router.go'),
    read('../backend/internal/usecase/session_availability.go'),
  ]);
  assert.match(booking, /api\.teacherAvailability/);
  assert.match(booking, /slot\.start_at/);
  assert.doesNotMatch(booking, /generateBookingSlots|teacherWorkTimes/);
  assert.match(api, /\/availability\?service_id=/);
  assert.match(router, /\/teachers\/:id\/availability/);
  assert.match(availability, /AppTimezone/);
  assert.match(availability, /SessionPending, domain\.SessionConfirmed/);
});

test('legal copy matches the cancellation policy implemented by backend', async () => {
  const [terms, cancellation] = await Promise.all([
    read('src/app/terms/page.tsx'),
    read('../backend/internal/usecase/session_cancel_policy.go'),
  ]);
  assert.doesNotMatch(terms, /دو ساعت/);
  assert.match(terms, /پیش از زمان شروع جلسه/);
  assert.match(cancellation, /time\.Now\(\)\.Before\(s\.ScheduledAt\)/);
});
