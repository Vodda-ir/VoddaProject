import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/same-origin';
import { listTier1Flags, setTier1Flag } from '@/lib/server/overlay';
import {
  createStory,
  deleteStoryAuthorized,
  incrementStoryViews,
  listActiveStories,
  listAllStories,
} from '@/lib/server/stories';
import {
  followerCountOf,
  followTeacher,
  getFollowsOf,
  normalizeTeacherId,
  unfollowTeacher,
} from '@/lib/server/follows';
import { applyScoreEvent, scoreSnapshot, ensureScoreForTeacher } from '@/lib/server/gamification';
import { enrichTeacherPayload, sortEnvelopeTier1First } from '@/lib/server/tier1';
import { getFreeServices, getRecommendedTeachers } from '@/lib/server/discover';
import { previewMockEnabled, previewMockResponse } from '@/lib/server/preview-mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'idempotency-key', 'x-request-id'];
const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'cache-control',
  'etag',
  'last-modified',
  'x-request-id',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'retry-after',
];

type RouteContext = { params: Promise<{ path: string[] }> };

function isPublicRequest(method: string, path: string[]): boolean {
  if (method === 'GET' && path[0] === 'teachers') return true;
  if (method === 'GET' && path[0] === 'blog') return true;
  // ورود با گوگل — وضعیت فعال بودن دکمهٔ گوگل پیش از لاگین خوانده می‌شود.
  if (method === 'GET' && path[0] === 'auth' && path[1] === 'google' && path[2] === 'status') return true;
  if (method === 'GET' && path[0] === 'settings' && path.length === 1) return true;
  // فهرست رسمی خدمات (کاتالوگ موضوعات) عمومی است — صفحه فراخوان و جستجو بدون ورود هم آن را می‌بینند.
  if (method === 'GET' && path[0] === 'catalog' && path[1] === 'services' && path.length === 2) return true;
  // «خدمات رایگان» — تابلوی عمومی جلسات رایگان اساتید در صفحهٔ نخست.
  if (method === 'GET' && path[0] === 'catalog' && path[1] === 'free' && path.length === 2) return true;
  return method === 'POST' && path[0] === 'support' && path[1] === 'messages' && path.length === 2;
}

/* ── توکن فقط برای تشخیص نقش (ادمین) باز می‌شود؛ اعتبارسنجی امضا همچنان کار بک‌اند است. ── */
function tokenRole(token: string | undefined): string {
  if (!token) return '';
  try {
    const payload = token.split('.')[1];
    if (!payload) return '';
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof json?.role === 'string' ? json.role : '';
  } catch {
    return '';
  }
}

/* ═════════ مسیرهای محلی BFF — هرگز به بک‌اند اصلی نمی‌روند ═════════ */

/** ۱.الف.۵ — پرچم درجه ۱ (فقط ادمین) */
async function handleTeacherFlags(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get('vodda_token')?.value;
  if (tokenRole(token) !== 'admin') {
    return NextResponse.json({ error: 'دسترسی فقط برای ادمین مجاز است' }, { status: 403 });
  }

  if (request.method === 'GET') {
    const flags = await listTier1Flags();
    return NextResponse.json({ data: flags });
  }

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { teacherId?: unknown; isTier1?: unknown };
    const teacherId = Number(body.teacherId);
    const isTier1 = body.isTier1 === null ? null : body.isTier1 === true;
    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      return NextResponse.json({ error: 'شناسه استاد نامعتبر است' }, { status: 400 });
    }
    const flag = await setTier1Flag(teacherId, isTier1);
    return NextResponse.json({ data: flag });
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}

/** ۱.الف.۶ — امتیاز و سطح استاد */
async function handleScore(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get('vodda_token')?.value;
  // GET score/teacher/:id برای صاحب حساب و ادمین؛ POST رویداد فقط ادمین.
  if (!token && !isPublicRequest('GET', ['teachers'])) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const teacherId = Number(path[2] ?? NaN);
  if (path[1] !== 'teacher' || !Number.isInteger(teacherId) || teacherId <= 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const role = tokenRole(token);
  if (request.method === 'GET') {
    try {
      const snapshot = await scoreSnapshot(teacherId);
      return NextResponse.json({ data: snapshot });
    } catch {
      return NextResponse.json({ error: 'وضعیت امتیاز دریافت نشد' }, { status: 500 });
    }
  }

  if (request.method === 'POST' && path[3] === 'event') {
    if (role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی فقط برای ادمین مجاز است' }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as { type?: unknown };
    const type = typeof body.type === 'string' ? body.type : '';
    if (!type) return NextResponse.json({ error: 'نوع رویداد لازم است' }, { status: 400 });
    // بذر امتیاز اگر هنوز وجود ندارد، بعد رویداد ثبت می‌شود.
    await ensureScoreForTeacher({ id: teacherId });
    const result = await applyScoreEvent(teacherId, type);
    if (!result) return NextResponse.json({ error: 'نوع رویداد نامعتبر است' }, { status: 400 });
    return NextResponse.json({ data: result.state });
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}

/* ═════════ کشف صفحهٔ نخست (۱.ب.۴ + ۱.ب.۵) — مسیرهای محلی BFF ═════════ */

/** ۱.ب.۵ — GET /teachers/recommended?limit=7 — چیدمان پیشنهادی با تکرار ≤ ۲. */
async function handleRecommended(request: NextRequest): Promise<Response> {
  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '7');
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(20, Math.round(limitRaw)) : 7;
  try {
    const payload = await getRecommendedTeachers(limit);
    return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'چیدمان پیشنهادی در دسترس نیست' }, { status: 502 });
  }
}

/** ۱.ب.۴ — GET /services?is_free=true&limit=6&sort_by=teacher_rank — کارت‌های رایگان. */
async function handleFreeServices(request: NextRequest): Promise<Response> {
  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const params = request.nextUrl.searchParams;
  const limitRaw = Number(params.get('limit') ?? '6');
  const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? Math.min(100, Math.round(limitRaw)) : 6;
  try {
    const payload = await getFreeServices(limit);
    return NextResponse.json(
      { ...payload, sort_by: 'teacher_rank', is_free: true },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'خدمات رایگان در دسترس نیست' }, { status: 502 });
  }
}

/* ═════════ استوری‌های مدیر‌محور + دنبال‌کردن اساتید (E2) — مسیرهای محلی BFF ═════════
 * انتشار: ادمین (برند) و استادها (فقط تصویر، ۲۴ ساعت) — با هویت تأییدشده نزد بک‌اند (/me).
 * دید استوری استاد: فقط دنبال‌کننده‌های او (و خودش)؛ استوری برند برای همه.
 * تشخیص هویت = نقش داخل توکن + تأیید امضا نزد بک‌اند اصلی؛ کش تأیید ۶۰ ثانیه‌ای.
 * در پیش‌نمایش dev (بدون بک‌اند) نقش توکن کافی است — همان مدل preview-mock. */

type VerifiedSession = {
  uid: string;
  /** برای استاد = شناسهٔ پروفایل استاد؛ برای بقیه = uid */
  authorId: string;
  name: string;
  role: string;
  avatar: string;
};

const verifiedSessions = new Map<string, { session: VerifiedSession | null; until: number }>();

function tokenFingerprint(token: string): string {
  return Buffer.from(token).toString('base64').slice(0, 64);
}

function tokenPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function sessionFromPayload(payload: Record<string, unknown> | null): VerifiedSession | null {
  const role = typeof payload?.role === 'string' ? payload.role : '';
  if (process.env.VODDA_PREVIEW_ADMIN === '1') {
    const uid = String(typeof payload?.uid === 'number' ? payload.uid : 95);
    return { uid, authorId: uid, name: 'مدیر سامانه وُدّا', role: 'admin', avatar: '' };
  }
  if (role !== 'admin' && role !== 'teacher' && role !== 'learner') return null;
  const uid = String(typeof payload?.uid === 'number' && payload.uid > 0 ? payload.uid : 1);
  const name = role === 'admin' ? 'مدیر سامانه وُدّا' : role === 'teacher' ? 'استاد نمونه وُدّا' : 'قرآن‌آموز وُدّا';
  return { uid, authorId: uid, name, role, avatar: '' };
}

async function verifiedSession(token: string | undefined): Promise<VerifiedSession | null> {
  if (!token) return null;
  const key = tokenFingerprint(token);
  const cached = verifiedSessions.get(key);
  if (cached && Date.now() < cached.until) return cached.session;
  let session: VerifiedSession | null = null;
  if (previewMockEnabled()) {
    // فقط سرور dev پیش‌نمایش — هرگز در تولید فعال نیست
    session = sessionFromPayload(tokenPayload(token));
  } else {
    try {
      const upstream = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (upstream.ok) {
        const payload = (await upstream.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
        const me = payload?.data && typeof payload.data === 'object' ? payload.data : null;
        const id = typeof me?.id === 'number' && me.id > 0 ? me.id : 0;
        const role = typeof me?.role === 'string' ? me.role : '';
        if (me && id > 0 && (role === 'admin' || role === 'teacher' || role === 'learner')) {
          const teacherRecord = me.teacher && typeof me.teacher === 'object' ? (me.teacher as { id?: unknown }) : null;
          const teacherId = typeof teacherRecord?.id === 'number' && teacherRecord.id > 0 ? teacherRecord.id : id;
          session = {
            uid: String(id),
            authorId: String(role === 'teacher' ? teacherId : id),
            name: typeof me.name === 'string' ? me.name.slice(0, 60) : '',
            role,
            avatar: typeof me.avatar_url === 'string' ? me.avatar_url.slice(0, 300) : '',
          };
        }
      }
    } catch {
      session = null; // fail-closed — بدون تأیید بک‌اند، هویت باز نمی‌شود
    }
  }
  verifiedSessions.set(key, { session, until: Date.now() + 60_000 });
  if (verifiedSessions.size > 400) {
    const now = Date.now();
    for (const [cachedKey, value] of verifiedSessions) {
      if (value.until < now) verifiedSessions.delete(cachedKey);
    }
  }
  return session;
}

async function handleStories(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get('vodda_token')?.value;

  /* GET /stories — برند برای همه؛ استادی‌ها فقط برای دنبال‌کننده‌ها و صاحب استوری */
  if (request.method === 'GET' && path.length === 1) {
    const active = await listActiveStories();
    const session = await verifiedSession(token);
    const follows = session ? await getFollowsOf(session.uid) : [];
    const visible = active.filter((story) => {
      if (story.author.role === 'admin') return true;
      if (!session) return false;
      if (session.role === 'admin') return true; // مدیر همه را برای نظارت می‌بیند
      if (story.author.id === session.authorId) return true; // استوری خود استاد
      return follows.includes(story.author.id); // دنبال‌کننده
    });
    return NextResponse.json(
      {
        data: visible,
        // هویت جلسه برای گروه‌بندی «استوری‌های خودم» در ریل
        me: session ? { author_id: session.authorId, role: session.role } : null,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  /* GET /stories/all — فهرست کامل مدیر (شامل منقضی‌ها) */
  if (request.method === 'GET' && path[1] === 'all' && path.length === 2) {
    const session = await verifiedSession(token);
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی فقط برای ادمین مجاز است' }, { status: 403 });
    }
    const stories = await listAllStories();
    return NextResponse.json({ data: stories }, { headers: { 'cache-control': 'no-store' } });
  }

  /* POST /stories — انتشار استوری (ادمین برند یا استاد — فقط تصویر) */
  if (request.method === 'POST' && path.length === 1) {
    const session = await verifiedSession(token);
    if (!session) {
      return NextResponse.json({ error: 'برای انتشار استوری ابتدا وارد شوید' }, { status: 401 });
    }
    if (session.role !== 'admin' && session.role !== 'teacher') {
      return NextResponse.json({ error: 'انتشار استوری فقط برای مدیر سامانه و اساتید مجاز است' }, { status: 403 });
    }
    const length = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(length) && length > 2_600_000) {
      return NextResponse.json({ error: 'حجم استوری بیش از حد مجاز است' }, { status: 413 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      media_url?: unknown;
      caption?: unknown;
      link?: unknown;
      ttl_hours?: unknown;
    };
    const author = session.role === 'admin'
      ? { id: session.uid, name: 'وُدّا', role: 'admin' as const, avatar: '' }
      : { id: session.authorId, name: session.name || 'استاد وُدّا', role: 'teacher' as const, avatar: session.avatar };
    try {
      const story = await createStory({
        mediaUrl: typeof body.media_url === 'string' ? body.media_url : '',
        caption: typeof body.caption === 'string' ? body.caption : '',
        link: session.role === 'admin' && typeof body.link === 'string' ? body.link : undefined,
        ttlHours: session.role === 'admin' && typeof body.ttl_hours === 'number' ? body.ttl_hours : 24,
        author,
      });
      return NextResponse.json({ data: story }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'انتشار استوری ناموفق بود' },
        { status: 400 },
      );
    }
  }

  /* POST /stories/:id/view — شمارش بازدید (عمومی، best-effort) */
  if (request.method === 'POST' && path.length === 3 && path[2] === 'view') {
    const views = await incrementStoryViews(path[1]);
    return NextResponse.json({ data: { views } });
  }

  /* DELETE /stories/:id — ادمین هر استوری؛ استاد فقط استوری خودش */
  if (request.method === 'DELETE' && path.length === 2) {
    const session = await verifiedSession(token);
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: 'دسترسی حذف استوری مجاز نیست' }, { status: 403 });
    }
    const result = await deleteStoryAuthorized(path[1], { role: session.role, authorId: session.authorId });
    if (result === 'forbidden') {
      return NextResponse.json({ error: 'حذف استوری دیگران مجاز نیست' }, { status: 403 });
    }
    return NextResponse.json({ data: { removed: result === 'removed' } });
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}

/* ═════════ دنبال‌کردن اساتید (E2) — مسیرهای محلی BFF ═════════ */

async function handleFollows(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get('vodda_token')?.value;

  /* GET /follows/count/:teacherId — عمومی (نمایش روی پروفایل) */
  if (request.method === 'GET' && path[1] === 'count' && path.length === 3) {
    const teacherId = normalizeTeacherId(path[2]);
    if (!teacherId) return NextResponse.json({ error: 'شناسه استاد نامعتبر است' }, { status: 400 });
    const count = await followerCountOf(teacherId);
    return NextResponse.json({ data: { count } }, { headers: { 'cache-control': 'no-store' } });
  }

  const session = await verifiedSession(token);
  if (!session) {
    return NextResponse.json({ error: 'برای دنبال‌کردن استاد ابتدا وارد شوید' }, { status: 401 });
  }

  /* GET /follows — فهرست استادهای دنبال‌شدهٔ من */
  if (request.method === 'GET' && path.length === 1) {
    const teacherIds = await getFollowsOf(session.uid);
    return NextResponse.json({ data: { teacher_ids: teacherIds } }, { headers: { 'cache-control': 'no-store' } });
  }

  /* PUT /follows/:teacherId — دنبال‌کردن | DELETE — لغو */
  if ((request.method === 'PUT' || request.method === 'DELETE') && path.length === 2) {
    const teacherId = normalizeTeacherId(path[1]);
    if (!teacherId) return NextResponse.json({ error: 'شناسه استاد نامعتبر است' }, { status: 400 });
    if (request.method === 'PUT') {
      await followTeacher(session.uid, teacherId);
    } else {
      await unfollowTeacher(session.uid, teacherId);
    }
    const count = await followerCountOf(teacherId);
    return NextResponse.json({ data: { following: request.method === 'PUT', count } });
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}

/* ── غنی‌سازی پاسخ استادها با overlay محلی (۱.الف.۵) ── */

function shouldEnrich(method: string, path: string[]): boolean {
  if (method !== 'GET') return false;
  if (path[0] === 'teachers') return true;
  return path[0] === 'admin' && path[1] === 'teachers';
}

/** مرتب‌سازی درجه ۱ نخست — فقط برای فهرست‌های اصلی استادها. */
function shouldSortTier1(path: string[]): boolean {
  return (path[0] === 'teachers' && path.length === 1) || (path[0] === 'admin' && path[1] === 'teachers' && path.length === 2);
}

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  if (!path.length) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'درخواست بین‌دامنه‌ای مجاز نیست' }, { status: 403 });
  }

  /* پیش‌نمایش محلی (فقط dev) — پاسخ نمونه بدون تماس با بک‌اند */
  if (previewMockEnabled()) {
    const mocked = previewMockResponse(request, path);
    if (mocked) return mocked;
  }

  /* مسیرهای محلی overlay/score/کشف — بدون تماس با بک‌اند */
  if (path[0] === 'teacher-flags') return handleTeacherFlags(request, path);
  if (path[0] === 'score') return handleScore(request, path);
  /* E1/E2 — استوری‌ها و دنبال‌کردن — مسیر محلی؛ در اپ نیتیو مسیر وجود ندارد و caller جایگزین می‌کند */
  if (path[0] === 'stories') return handleStories(request, path);
  if (path[0] === 'follows') return handleFollows(request, path);
  /* ۱.ب.۵ — GET /teachers/recommended در بک‌اند وجود ندارد؛ محلی */
  if (path[0] === 'teachers' && path[1] === 'recommended') return handleRecommended(request);
  /* ۱.ب.۴ — GET /services?is_free=true … در بک‌اند وجود ندارد؛ محلی */
  if (path[0] === 'services' && request.method === 'GET' && request.nextUrl.searchParams.get('is_free') === 'true') {
    return handleFreeServices(request);
  }

  const token = request.cookies.get('vodda_token')?.value;
  if (!token && !isPublicRequest(request.method, path)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const target = new URL(`${API_BASE}/${path.map(encodeURIComponent).join('/')}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (token) headers.set('authorization', `Bearer ${token}`);

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });

    const contentType = upstream.headers.get('content-type') ?? '';

    /* ۱.الف.۵ — پاسخ JSON استادها با پرچم درجه ۱ غنی‌سازی می‌شود */
    if (shouldEnrich(request.method, path) && upstream.ok && contentType.includes('application/json')) {
      try {
        const payload = (await upstream.json()) as unknown;
        let enriched = await enrichTeacherPayload(payload);
        if (shouldSortTier1(path)) {
          enriched = sortEnvelopeTier1First(enriched);
        }
        const responseHeaders = new Headers();
        for (const name of FORWARDED_RESPONSE_HEADERS) {
          const value = upstream.headers.get(name);
          if (value) responseHeaders.set(name, value);
        }
        return new Response(JSON.stringify(enriched), {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
        });
      } catch {
        // غنی‌سازی هرگز پاسخ اصلی را نمی‌شکند — جریان پایین ادامه می‌یابد.
      }
    }

    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ error: 'ارتباط با سرویس اصلی برقرار نشد' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
