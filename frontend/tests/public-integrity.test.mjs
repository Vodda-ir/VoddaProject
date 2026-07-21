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

test('public search uses backend field values and URL state', async () => {
  const search = await read('src/app/search/page.tsx');
  assert.match(search, /آموزش قرآن کریم/);
  assert.match(search, /مداحی اهل‌بیت/);
  assert.match(search, /window\.history\.replaceState/);
});
