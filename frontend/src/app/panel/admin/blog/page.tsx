'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { PanelButton, PanelEmpty, PanelPageHeader } from '@/components/panel/PanelUI';
import {
  DataTable,
  Drawer,
  FilterTabs,
  SearchInput,
  StatCard,
  TablePagination,
  exportCsv,
} from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type AdminPostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string;
  category: string;
  status: 'draft' | 'published';
  read_minutes: number;
  views: number;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

type BlogStats = {
  total: number;
  published: number;
  drafts: number;
  views: number;
  categories: string[];
};

type PostForm = {
  id: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  category: string;
  status: 'draft' | 'published';
};

const EMPTY_FORM: PostForm = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_url: '',
  category: '',
  status: 'draft',
};

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: '', label: 'همه' },
  { value: 'published', label: 'منتشرشده' },
  { value: 'draft', label: 'پیش‌نویس' },
] as const;

function faDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<PostForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (status) params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/backend/admin/posts?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست مقالات دریافت نشد.');
      setPosts(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست مقالات دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [page, status, query]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/backend/admin/post-stats', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body?.data) setStats(body.data as BlogStats);
    } catch {
      /* stats are cosmetic; list errors surface separately */
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadStats(); }, [loadStats]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  }

  function openNew() {
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(row: AdminPostRow) {
    setForm({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: '',
      cover_url: row.cover_url,
      category: row.category,
      status: row.status,
    });
    // hydrate full content after the drawer opens
    fetch(`/api/backend/admin/posts/${row.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (body?.data) setForm((current) => (current && current.id === row.id ? { ...current, content: body.data.content || '' } : current));
      })
      .catch(() => {});
  }

  async function save() {
    if (!form || saving) return;
    if (form.title.trim().length < 3) {
      setError('عنوان مقاله باید حداقل ۳ نویسه باشد.');
      return;
    }
    if (form.status === 'published' && form.content.trim().length < 20) {
      setError('برای انتشار، متن مقاله لازم است.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim(),
        content: form.content,
        cover_url: form.cover_url.trim(),
        category: form.category.trim(),
        status: form.status,
      };
      const response = await fetch(form.id ? `/api/backend/admin/posts/${form.id}` : '/api/backend/admin/posts', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ذخیره مقاله انجام نشد.');
      setForm(null);
      flash(form.id ? 'مقاله به‌روزرسانی شد.' : 'مقاله جدید ذخیره شد.');
      await Promise.all([load(), loadStats()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیره مقاله انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatusOn(row: AdminPostRow, next: 'draft' | 'published') {
    if (busyId !== null) return;
    setBusyId(row.id);
    setError('');
    try {
      const detail = await fetch(`/api/backend/admin/posts/${row.id}`, { cache: 'no-store' }).then((r) => r.json());
      const content = String(detail?.data?.content || '');
      if (next === 'published' && content.trim().length < 20) {
        setError('برای انتشار، متن مقاله لازم است.');
        return;
      }
      const response = await fetch(`/api/backend/admin/posts/${row.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: row.title,
          slug: row.slug,
          excerpt: row.excerpt,
          content,
          cover_url: row.cover_url,
          category: row.category,
          status: next,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'تغییر وضعیت مقاله انجام نشد.');
      flash(next === 'published' ? 'مقاله منتشر شد.' : 'مقاله به پیش‌نویس بازگشت.');
      await Promise.all([load(), loadStats()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر وضعیت مقاله انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AdminPostRow) {
    if (busyId !== null) return;
    if (!window.confirm(`حذف «${row.title}» بازگشت‌پذیر نیست. ادامه می‌دهید؟`)) return;
    setBusyId(row.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/posts/${row.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'حذف مقاله انجام نشد.');
      flash('مقاله حذف شد.');
      await Promise.all([load(), loadStats()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حذف مقاله انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function uploadCover(file: File) {
    if (!form) return;
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('image', file);
      const response = await fetch('/api/backend/admin/blog-upload', { method: 'POST', body: data });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'بارگذاری تصویر انجام نشد.');
      setForm({ ...form, cover_url: String(body.data?.url || '') });
      flash('تصویر کاور بارگذاری شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'بارگذاری تصویر انجام نشد.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function suggestSlug() {
    if (!form) return;
    const slug = form.title
      .trim()
      .toLowerCase()
      .replace(/[\s_./،؟]+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setForm({ ...form, slug });
  }

  function exportPosts() {
    exportCsv(
      'vodda-blog',
      ['شناسه', 'عنوان', 'دسته', 'وضعیت', 'بازدید', 'تاریخ انتشار'],
      posts.map((row) => [row.id, row.title, row.category, row.status === 'published' ? 'منتشرشده' : 'پیش‌نویس', row.views, faDate(row.published_at || row.created_at)]),
    );
  }

  return (
    <div className="admin-blog">
      <PanelPageHeader
        eyebrow="محتوا"
        title="مدیریت وبلاگ"
        description="نوشتن، ویرایش و انتشار مقالات آموزشی که در صفحهٔ وبلاگ وُدّا نمایش داده می‌شود."
        actions={
          <>
            <PanelButton icon="download" onClick={exportPosts}>خروجی CSV</PanelButton>
            <PanelButton icon="plus" tone="primary" onClick={openNew}>مقاله جدید</PanelButton>
          </>
        }
      />

      {notice && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="checkCircle" size={16} /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: '#fbeeec', color: '#a1453d', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="info" size={16} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon="doc" label="کل مقالات" value={toFaDigits(stats?.total ?? 0)} tone="olive" />
        <StatCard icon="checkCircle" label="منتشرشده" value={toFaDigits(stats?.published ?? 0)} tone="olive" />
        <StatCard icon="edit" label="پیش‌نویس" value={toFaDigits(stats?.drafts ?? 0)} tone="gold" />
        <StatCard icon="trending" label="مجموع بازدید" value={formatFaNumber(stats?.views ?? 0)} tone="clay" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <FilterTabs items={[...STATUS_TABS]} value={status} onChange={(value) => { setStatus(value); setPage(0); }} ariaLabel="فیلتر وضعیت" />
        <div style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
          <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="جست‌وجوی عنوان…" />
        </div>
      </div>

      <DataTable
        rows={posts}
        loading={loading}
        emptyIcon="doc"
        emptyTitle={query || status ? 'مقاله‌ای با این فیلترها یافت نشد' : 'هنوز مقاله‌ای ثبت نشده است'}
        emptyDescription="با دکمهٔ «مقاله جدید» نخستین نوشتهٔ وبلاگ را منتشر کنید."
        columns={[
          {
            key: 'title',
            header: 'مقاله',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 220 }}>
                <span style={{ width: 46, height: 46, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, overflow: 'hidden', background: 'var(--sand-100)' }}>
                  {row.cover_url
                    ? <img src={fullUrl(row.cover_url) || row.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="doc" size={19} style={{ color: 'var(--ink-3)' }} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{row.title}</strong>
                  <small dir="ltr" style={{ display: 'block', color: 'var(--ink-3)', fontSize: 10.5, textAlign: 'end' }}>/{row.slug}</small>
                </span>
              </div>
            ),
          },
          {
            key: 'category',
            header: 'دسته',
            render: (row) => row.category
              ? <span className="adm-badge" data-tone="info">{row.category}</span>
              : <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>—</span>,
          },
          {
            key: 'status',
            header: 'وضعیت',
            render: (row) => (
              <span className="adm-badge" data-tone={row.status === 'published' ? 'green' : 'gold'}>
                {row.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
              </span>
            ),
          },
          {
            key: 'views',
            header: 'بازدید',
            align: 'center',
            render: (row) => <span style={{ fontSize: 12, fontWeight: 700 }}>{formatFaNumber(row.views)}</span>,
          },
          {
            key: 'date',
            header: 'تاریخ',
            render: (row) => <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{faDate(row.published_at || row.created_at)}</span>,
          },
          {
            key: 'actions',
            header: 'عملیات',
            align: 'end',
            render: (row) => (
              <div style={{ display: 'inline-flex', gap: 6 }}>
                <button
                  type="button"
                  className="ops-button"
                  disabled={busyId === row.id}
                  title={row.status === 'published' ? 'بازگشت به پیش‌نویس' : 'انتشار'}
                  aria-label={row.status === 'published' ? 'بازگشت به پیش‌نویس' : 'انتشار مقاله'}
                  onClick={() => void setStatusOn(row, row.status === 'published' ? 'draft' : 'published')}
                >
                  <Icon name={row.status === 'published' ? 'refresh' : 'checkCircle'} size={14} />
                </button>
                <button type="button" className="ops-button" aria-label={`ویرایش ${row.title}`} onClick={() => openEdit(row)}>
                  <Icon name="edit" size={14} />
                </button>
                <button
                  type="button"
                  className="ops-button"
                  disabled={busyId === row.id}
                  aria-label={`حذف ${row.title}`}
                  style={{ color: '#a1453d' }}
                  onClick={() => void remove(row)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <Drawer open={form !== null} onClose={() => setForm(null)} title={form?.id ? 'ویرایش مقاله' : 'مقاله جدید'}>
        {form && (
          <div style={{ display: 'grid', gap: 13 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              عنوان مقاله
              <input
                className="adm-input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="مثلاً: روش‌های مؤثر در حفظ قرآن"
                maxLength={180}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              نشانی کوتاه (slug) — اختیاری
              <span style={{ display: 'flex', gap: 7 }}>
                <input
                  className="adm-input"
                  dir="ltr"
                  style={{ textAlign: 'left', flex: 1 }}
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                  placeholder="quran-memorization"
                />
                <PanelButton type="button" onClick={suggestSlug}>تولید از عنوان</PanelButton>
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                دسته‌بندی
                <input
                  className="adm-input"
                  list="blog-categories"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="حفظ، تجوید، روخوانی…"
                  maxLength={60}
                />
                <datalist id="blog-categories">
                  {(stats?.categories || []).map((category) => <option key={category} value={category} />)}
                </datalist>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                وضعیت
                <select
                  className="adm-input"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as PostForm['status'] })}
                >
                  <option value="draft">پیش‌نویس</option>
                  <option value="published">منتشرشده</option>
                </select>
              </label>
            </div>

            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              کاور مقاله
              <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <input
                  className="adm-input"
                  dir="ltr"
                  style={{ textAlign: 'left', flex: 1 }}
                  value={form.cover_url}
                  onChange={(event) => setForm({ ...form, cover_url: event.target.value })}
                  placeholder="/uploads/blog/… یا نشانی کامل تصویر"
                />
                <PanelButton type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? '…' : 'بارگذاری'}
                </PanelButton>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }}
                />
              </span>
            </label>
            {form.cover_url && (
              <img
                src={fullUrl(form.cover_url) || form.cover_url}
                alt="پیش‌نمایش کاور"
                style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--sand-150)' }}
              />
            )}

            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              خلاصه (برای کارت مقاله) — خالی بماند تا از متن ساخته شود
              <textarea
                className="adm-input"
                rows={2}
                value={form.excerpt}
                onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
                maxLength={400}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              متن مقاله
              <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 10.5 }}>
                خط خالی = پاراگراف تازه · «## » تیتر می‌سازد · «- » فهرست می‌سازد
              </span>
              <textarea
                className="adm-input"
                rows={12}
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                placeholder="متن مقاله را اینجا بنویسید…"
              />
            </label>

            <div style={{ display: 'flex', gap: 9, paddingTop: 4 }}>
              <PanelButton tone="primary" disabled={saving} onClick={() => void save()} style={{ flex: 1 }}>
                {saving ? 'در حال ذخیره…' : 'ذخیره مقاله'}
              </PanelButton>
              <PanelButton onClick={() => setForm(null)}>انصراف</PanelButton>
            </div>
          </div>
        )}
      </Drawer>

      <style>{`
        .adm-input{width:100%;padding:9px 12px;border:1px solid var(--sand-150);border-radius:11px;background:#fff;font:inherit;font-size:12.5px;color:var(--ink)}
        .adm-input:focus{outline:2px solid var(--olive-300,#b8c68f);outline-offset:1px;border-color:var(--olive-400)}
        textarea.adm-input{resize:vertical;line-height:1.9}
        @media (max-width:560px){
          .admin-blog .adm-input{font-size:12px}
        }
      `}</style>
    </div>
  );
}
