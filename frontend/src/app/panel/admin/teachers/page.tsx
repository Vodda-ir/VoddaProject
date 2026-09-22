'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { fullUrl, getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';

type TeacherStatus = '' | 'pending' | 'approved' | 'rejected';

type TeacherRow = {
  id: number;
  field?: string;
  tag?: string;
  level?: string;
  city?: string;
  rating?: number;
  sessions?: number;
  reviews?: number;
  status?: Exclude<TeacherStatus, ''>;
  verified?: boolean;
  available?: boolean;
  user?: {
    id?: number;
    name?: string;
    mobile?: string;
    avatar_url?: string;
    active?: boolean;
  };
};

const FILTERS: Array<{ value: TeacherStatus; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'rejected', label: 'ردشده' },
];

const PAGE_SIZE = 30;

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [status, setStatus] = useState<TeacherStatus>('');
  const [queryDraft, setQueryDraft] = useState('');
  const [cityDraft, setCityDraft] = useState('');
  const [fieldDraft, setFieldDraft] = useState('');
  const [filters, setFilters] = useState({ q: '', city: '', field: '' });
  const [counts, setCounts] = useState<Record<TeacherStatus, number>>({
    '': 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const fetchCounts = useCallback(async () => {
    if (!token) return;
    const urls = FILTERS.map(({ value }) => {
      const sp = new URLSearchParams({ limit: '1', offset: '0' });
      if (value) sp.set('status', value);
      return `/api/backend/admin/teachers?${sp.toString()}`;
    });
    try {
      const responses = await Promise.all(urls.map((url) => fetch(url, { cache: 'no-store' })));
      const bodies = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
      if (responses.some((response) => !response.ok)) return;
      setCounts({
        '': Number(bodies[0]?.total || 0),
        pending: Number(bodies[1]?.total || 0),
        approved: Number(bodies[2]?.total || 0),
        rejected: Number(bodies[3]?.total || 0),
      });
    } catch {
      // Counts are supplementary; the directory itself still remains usable.
    }
  }, [token]);

  const fetchTeachers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (status) sp.set('status', status);
      if (filters.q) sp.set('q', filters.q);
      if (filters.city) sp.set('city', filters.city);
      if (filters.field) sp.set('field', filters.field);

      const response = await fetch(`/api/backend/admin/teachers?${sp.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست استادان دریافت نشد.');
      setTeachers(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست استادان دریافت نشد.');
      setTeachers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, status, filters]);

  useEffect(() => {
    void fetchTeachers();
    void fetchCounts();
  }, [fetchTeachers, fetchCounts]);

  function applyFilters() {
    setPage(0);
    setFilters({
      q: queryDraft.trim(),
      city: cityDraft.trim(),
      field: fieldDraft.trim(),
    });
  }

  function clearFilters() {
    setQueryDraft('');
    setCityDraft('');
    setFieldDraft('');
    setFilters({ q: '', city: '', field: '' });
    setStatus('');
    setPage(0);
  }

  async function review(teacher: TeacherRow, approve: boolean) {
    if (!token || busyId !== null || teacher.status !== 'pending') return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`پروفایل «${teacher.user?.name || 'استاد'}» ${action} شود؟`)) return;

    setBusyId(teacher.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/teachers/${teacher.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${action} استاد انجام نشد.`);
      await Promise.all([fetchTeachers(), fetchCounts()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} استاد انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(filters.q || filters.city || filters.field || status);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="مدیریت محتوا و دسترسی"
        title="مدیریت اساتید"
        description="فهرست کامل استادان را ببینید، بر اساس وضعیت و مشخصات جستجو کنید و درخواست‌های در انتظار را بررسی کنید."
        actions={
          <PanelButton icon="refresh" onClick={() => { void fetchTeachers(); void fetchCounts(); }}>
            به‌روزرسانی
          </PanelButton>
        }
      />

      <div className="ops-filter-tabs" role="tablist" aria-label="وضعیت استادان" style={{ marginBottom: 12 }}>
        {FILTERS.map((item) => (
          <button
            key={item.value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === item.value}
            onClick={() => { setStatus(item.value); setPage(0); }}
          >
            {item.label}
            <span>{toFaDigits(counts[item.value])}</span>
          </button>
        ))}
      </div>

      <section className="ops-toolbar" aria-label="فیلتر استادان">
        <div className="ops-toolbar-main">
          <label className="ops-search-field">
            <Icon name="search" size={17} />
            <input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
              placeholder="نام، تخصص، عنوان یا شهر..."
              aria-label="جستجوی استاد"
            />
          </label>
          <label className="ops-filter-field">
            <Icon name="pin" size={16} />
            <input
              value={cityDraft}
              onChange={(event) => setCityDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
              placeholder="شهر"
              aria-label="فیلتر شهر"
            />
          </label>
          <label className="ops-filter-field">
            <Icon name="book" size={16} />
            <input
              value={fieldDraft}
              onChange={(event) => setFieldDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
              placeholder="حوزه فعالیت"
              aria-label="فیلتر حوزه فعالیت"
            />
          </label>
          <PanelButton tone="primary" icon="search" onClick={applyFilters}>اعمال فیلتر</PanelButton>
        </div>

        {hasFilters && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PanelButton icon="x" onClick={clearFilters}>پاک‌کردن فیلترها</PanelButton>
          </div>
        )}
      </section>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void fetchTeachers()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>{status ? FILTERS.find((item) => item.value === status)?.label : 'همه استادان'}</strong>
            <span style={{ display: 'block', marginTop: 2 }}>
              {loading ? 'در حال دریافت اطلاعات…' : `${toFaDigits(total)} نتیجه`}
            </span>
          </div>
          {!loading && total > 0 && (
            <span>صفحه {toFaDigits(page + 1)} از {toFaDigits(pageCount)}</span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری فهرست استادان…</div>
        ) : teachers.length === 0 ? (
          <PanelEmpty
            icon="users"
            title="استادی با این فیلتر پیدا نشد"
            description={hasFilters ? 'فیلترها را تغییر دهید یا همه استادان را نمایش دهید.' : 'هنوز پروفایل استادی ثبت نشده است.'}
            action={hasFilters ? <PanelButton onClick={clearFilters}>نمایش همه</PanelButton> : undefined}
          />
        ) : (
          teachers.map((teacher) => {
            const normalizedStatus = teacher.status || 'pending';
            const isBusy = busyId === teacher.id;
            return (
              <article className="ops-row" key={teacher.id} style={{ opacity: isBusy ? .58 : 1 }}>
                <Avatar size={46} imageUrl={fullUrl(teacher.user?.avatar_url)} />
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{teacher.user?.name || 'استاد بدون نام'}</strong>
                    <PanelStatus status={normalizedStatus}>{statusLabel(normalizedStatus)}</PanelStatus>
                    {!teacher.user?.active && <PanelStatus status="inactive">حساب غیرفعال</PanelStatus>}
                  </div>
                  <div className="ops-row-sub">
                    <span>{teacher.tag || teacher.field || 'حوزه ثبت نشده'}</span>
                    {teacher.city && <span>· {teacher.city}</span>}
                    {teacher.level && <span>· {teacher.level}</span>}
                  </div>
                  <div className="ops-row-meta">
                    <span><Icon name="star" size={13} />{Number(teacher.reviews) > 0 ? toFaDigits(Number(teacher.rating || 0).toFixed(1)) : 'بدون امتیاز'}</span>
                    <span><Icon name="calendar" size={13} />{toFaDigits(Number(teacher.sessions) || 0)} جلسه</span>
                    <span><Icon name="message" size={13} />{toFaDigits(Number(teacher.reviews) || 0)} نظر</span>
                    {teacher.user?.mobile && <span dir="ltr">{toFaDigits(teacher.user.mobile)}</span>}
                  </div>
                </div>

                <div className="ops-row-actions">
                  {normalizedStatus === 'approved' && (
                    <Link href={`/teachers/${teacher.id}`} target="_blank" className="ops-button">
                      <Icon name="user" size={16} /> مشاهده پروفایل
                    </Link>
                  )}
                  {normalizedStatus === 'pending' && (
                    <>
                      <PanelButton
                        tone="danger"
                        icon="x"
                        disabled={isBusy}
                        onClick={() => void review(teacher, false)}
                      >
                        رد
                      </PanelButton>
                      <PanelButton
                        tone="success"
                        icon="check"
                        disabled={isBusy}
                        onClick={() => void review(teacher, true)}
                      >
                        {isBusy ? 'در حال ثبت…' : 'تأیید'}
                      </PanelButton>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="ops-pagination">
            <PanelButton disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
              صفحه قبل
            </PanelButton>
            <span>
              {toFaDigits(page * PAGE_SIZE + 1)} تا {toFaDigits(Math.min((page + 1) * PAGE_SIZE, total))} از {toFaDigits(total)}
            </span>
            <PanelButton disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>
              صفحه بعد
            </PanelButton>
          </div>
        )}
      </section>
    </main>
  );
}

function statusLabel(status: string) {
  if (status === 'approved') return 'تأییدشده';
  if (status === 'rejected') return 'ردشده';
  return 'در انتظار بررسی';
}
