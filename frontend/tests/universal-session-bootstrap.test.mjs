import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('session bootstrap distinguishes restore failures from logged-out sessions', async () => {
  const source = await read('src/universal-app/features/auth/AuthExperience.tsx');

  assert.match(source, /type BootstrapStatus = "loading" \| "ready" \| "error"/);
  assert.match(source, /catch \(restoreError\)/);
  assert.match(source, /setStatus\("error"\)/);
  assert.match(source, /onRetry=\{\(\) => setRetryKey/);
  assert.match(source, /if \(!sessionUser\) \{/);
  assert.doesNotMatch(source, /finally \{[\s\S]*setReady\(true\)/);
});

test('restored sessions enforce authoritative profile completion before route access', async () => {
  const [bootstrap, web, native, authAdapter] = await Promise.all([
    read('src/universal-app/features/auth/AuthExperience.tsx'),
    read('src/universal-app/platform/web.ts'),
    read('src/universal-app/platform/native.ts'),
    read('src/universal-app/platform/auth.ts'),
  ]);

  assert.match(bootstrap, /sessionUser\.needProfile && routeName !== "profile-edit"/);
  assert.match(bootstrap, /navigateApp\("\/profile\/edit"/);
  assert.match(web, /request<\{ data: AuthUserPayload \}>\("\/me"\)/);
  assert.match(native, /request<\{ data: AuthUserPayload \}>\("\/me"\)/);
  assert.match(web, /normalizeAuthUser\(response\.data\)/);
  assert.match(native, /normalizeAuthUser\(response\.data\)/);
  assert.match(authAdapter, /payload\.need_profile === true/);
});
