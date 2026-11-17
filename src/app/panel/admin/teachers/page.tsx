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
import {
  DataTable,
  Drawer,
  exportCsv,
  FilterTabs,
  KeyValueRow,
  SearchInput,
  TablePagination,
} from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type TeacherStatus = '' | 'pending' | 'approved' | 'rejected';
type TeacherTier = '' | 'international' | 'grade2' | 'grade3';

type TeacherRow = {
  id: number;
  field?: string;
  tag?: string;
  level?: string;
  city?: string;
  rating?: number;
  sessions?: number;
  reviews?: number;
  price30?: number;
  price60?: number;
  tier?: TeacherTier;
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

const TIER_BADGE: Record<string, { label: string; tone: string }> = {
  international: { label: 'بین‌المللی (درجه ۱)', tone: 'info' },
  grade2: { label: 'استاد درجه ۲', tone: 'green' },
  grade3: { label: 'استاد درجه ۳', tone: 'clay' },
};

const TIER_OPTIONS: Array<{ value: TeacherTier; label: string }> = [
  { value: '', label: 'بدون نشان' },
  { value: 'international', label: 'بین‌المللی (درجه ۱)' },
  { value: 'grade2', label: 'استاد درجه ۲' },
  { value: 'grade3', label: 'استاد درجه ۳' },
];

const STATUS_BADGE: Record<string, { label: string; tone: string }> = {
  pending: { label: 'در انتظار بررسی', tone: 'gold' },
  approved: { label: 'تأییدشده', tone: 'green' },
  rejected: { label: 'ردشده', tone: 'rose' },
};

const PAGE_SIZE = 30;

function faRating(value?: number): string {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(Number(value || 0));
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [status, setStatus] = useState<TeacherStatus>('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [field, setField] = useState('');
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
  const [selected, setSelected] = useState<TeacherRow | null>(null);
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
      if (query.trim()) sp.set('q', query.trim());
      if (city.trim()) sp.set('city', city.trim());
      if (field.trim()) sp.set('field', field.trim());

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
  }, [token, page, status, query, city, field]);

  useEffect(() => {
    void fetchTeachers();
    void fetchCounts();
  }, [fetchTeachers, fetchCounts]);

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

  /** Verified badge + quality tier — the public trust markers learners see. */
  async function patchSettings(teacher: TeacherRow, payload: { verified?: boolean; tier?: TeacherTier }) {
    if (!token || busyId !== null) return;
    setBusyId(teacher.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/teachers/${teacher.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ثبت تغییرات انجام نشد.');
      const updated = body.data as TeacherRow;
      setTeachers((previous) => previous.map((item) => (item.id === teacher.id ? { ...item, verified: updated.verified, tier: updated.tier } : item)));
      setSelected((current) => (current && current.id === teacher.id ? { ...current, verified: updated.verified, tier: updated.tier } : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت تغییرات انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Boolean(query.trim() || city.trim() || field.trim() || status);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="مدیریت محتوا و اعتماد"
        title="مدیریت اساتید"
        description="بررسی درخواست استادی، کنترل نشان درجه و تأیید حساب — مهر رنگی درجه مستقیماً روی آواتار پروفایل عمومی استاد دیده می‌شود."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-teachers',
                  ['شناسه', 'نام', 'موبایل', 'حوزه', 'شهر', 'وضعیت', 'درجه', 'امتیاز', 'جلسات', 'نظرها'],
                  teachers.map((teacher) => [
                    teacher.id,
                    teacher.user?.name || '',
                    teacher.user?.mobile || '',
                    teacher.field || '',
                    teacher.city || '',
                    STATUS_BADGE[teacher.status || 'pending']?.label ?? '',
                    TIER_BADGE[teacher.tier ?? '']?.label ?? 'بدون نشان',
                    Number(teacher.rating || 0),
                    Number(teacher.sessions || 0),
                    Number(teacher.reviews || 0),
                  ]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => { void fetchTeachers(); void fetchCounts(); }}>
              به‌روزرسانی
            </PanelButton>
          </>
        }
      />

      <div className="adm-toolbar">
        <FilterTabs
          ariaLabel="وضعیت استادان"
          items={FILTERS}
          value={status}
          counts={counts}
          onChange={(value) => { setStatus(value); setPage(0); }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="adm-search" style={{ maxWidth: 150 }}>
            <Icon name="pin" size={15} />
            <input className="input-base" value={city} onChange={(event) => { setCity(event.target.value); setPage(0); }} placeholder="شهر" aria-label="فیلتر شهر" />
          </label>
          <label className="adm-search" style={{ maxWidth: 150 }}>
            <Icon name="book" size={15} />
            <input className="input-base" value={field} onChange={(event) => { setField(event.target.value); setPage(0); }} placeholder="حوزه" aria-label="فیلتر حوزه" />
          </label>
          <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="جست‌وجوی استاد…" />
          {hasFilters && <PanelButton icon="x" onClick={() => { setQuery(''); setCity(''); setField(''); setStatus(''); setPage(0); }}>پاک‌کردن</PanelButton>}
        </div>
      </div>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void fetchTeachers()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'teacher',
            header: 'استاد',
            render: (teacher) => (
              <div className="adm-cell-main">
                <Avatar size={40} imageUrl={fullUrl(teacher.user?.avatar_url)} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {teacher.user?.name || 'استاد بدون نام'}
                    {teacher.verified && <Icon name="checkCircle" size={14} style={{ color: 'var(--olive-600)' }} />}
                  </strong>
                  <small>{teacher.tag || teacher.field || 'حوزه ثبت نشده'}{teacher.city ? ` · ${teacher.city}` : ''}</small>
                </div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'وضعیت',
            width: 120,
            render: (teacher) => {
              const normalized = teacher.status || 'pending';
              return <span className="adm-badge" data-tone={STATUS_BADGE[normalized]?.tone}>{STATUS_BADGE[normalized]?.label}</span>;
            },
          },
          {
            key: 'tier',
            header: 'درجه',
            width: 130,
            render: (teacher) =>
              teacher.tier ? (
                <span className="adm-badge" data-tone={TIER_BADGE[teacher.tier]?.tone}>{TIER_BADGE[teacher.tier]?.label}</span>
              ) : (
                <span style={{ color: 'var(--ink-4)', fontSize: 10.5 }}>—</span>
              ),
          },
          {
            key: 'score',
            header: 'عملکرد',
            width: 170,
            render: (teacher) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--ink-3)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#8d6d1f', fontWeight: 700 }}>
                  <Icon name="star" size={12} fill />{Number(teacher.reviews) > 0 ? faRating(teacher.rating) : '—'}
                </span>
                <span>{toFaDigits(Number(teacher.sessions) || 0)} جلسه</span>
                <span>{toFaDigits(Number(teacher.reviews) || 0)} نظر</span>
              </div>
            ),
          },
          {
            key: 'actions',
            header: '',
            width: 210,
            align: 'end',
            render: (teacher) => {
              const normalized = teacher.status || 'pending';
              const busy = busyId === teacher.id;
              return (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {normalized === 'approved' && (
                    <>
                      <PanelButton icon="settings" onClick={() => setSelected(teacher)}>مدیریت نشان</PanelButton>
                      <Link href={`/teachers/${teacher.id}`} target="_blank" className="ops-button" aria-label="مشاهده پروفایل">
                        <Icon name="user" size={15} />
                      </Link>
                    </>
                  )}
                  {normalized === 'pending' && (
                    <>
                      <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void review(teacher, false)}>رد</PanelButton>
                      <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void review(teacher, true)}>
                        {busy ? '…' : 'تأیید'}
                      </PanelButton>
                    </>
                  )}
                  {normalized === 'rejected' && <PanelButton icon="doc" onClick={() => setSelected(teacher)}>مشخصات</PanelButton>}
                </div>
              );
            },
          },
        ]}
        rows={teachers}
        loading={loading}
        emptyIcon="users"
        emptyTitle="استادی با این فیلتر پیدا نشد"
        emptyDescription={hasFilters ? 'فیلترها را تغییر دهید یا همه استادان را نمایش دهید.' : 'هنوز پروفایل استادی ثبت نشده است.'}
        onRowClick={(teacher) => setSelected(teacher)}
      />

      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.user?.name || 'استاد'}
      >
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 14px' }}>
              <Avatar size={56} imageUrl={fullUrl(selected.user?.avatar_url)} />
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>{selected.user?.name || 'استاد بدون نام'}</strong>
                <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                  <span className="adm-badge" data-tone={STATUS_BADGE[selected.status || 'pending']?.tone}>{STATUS_BADGE[selected.status || 'pending']?.label}</span>
                  {selected.tier && <span className="adm-badge" data-tone={TIER_BADGE[selected.tier]?.tone}>{TIER_BADGE[selected.tier]?.label}</span>}
                  {!selected.user?.active && <PanelStatus status="inactive">حساب غیرفعال</PanelStatus>}
                </div>
              </div>
            </div>

            <KeyValueRow label="حوزه / تخصص">{selected.field || '—'}{selected.tag ? ` · ${selected.tag}` : ''}</KeyValueRow>
            <KeyValueRow label="شهر">{selected.city || '—'}</KeyValueRow>
            <KeyValueRow label="مدرک">{selected.level || '—'}</KeyValueRow>
            <KeyValueRow label="موبایل"><span dir="ltr">{toFaDigits(selected.user?.mobile || '—')}</span></KeyValueRow>
            <KeyValueRow label="امتیاز">{Number(selected.reviews) > 0 ? `${faRating(selected.rating)} از ۵ (${toFaDigits(Number(selected.reviews) || 0)} نظر)` : 'بدون امتیاز'}</KeyValueRow>
            <KeyValueRow label="جلسات برگزارشده">{toFaDigits(Number(selected.sessions) || 0)}</KeyValueRow>
            <KeyValueRow label="تعرفه ۳۰ دقیقه">{formatFaNumber(Number(selected.price30 || 0))} تومان</KeyValueRow>
            <KeyValueRow label="تعرفه ۶۰ دقیقه">{formatFaNumber(Number(selected.price60 || 0))} تومان</KeyValueRow>

            {(selected.status === 'approved' || selected.status === 'rejected') && (
              <section style={{ marginTop: 16, padding: 14, border: '1px solid var(--sand-150)', borderRadius: 15, background: 'var(--surface-warm)' }}>
                <strong style={{ display: 'block', marginBottom: 3, fontSize: 12.5 }}>نشان‌های عمومی</strong>
                <p style={{ margin: '0 0 12px', color: 'var(--ink-3)', fontSize: 10.5, lineHeight: 1.9 }}>
                  مهر رنگی درجه استاد روی آواتار پروفایل عمومی و نتایج جست‌وجو نمایش داده می‌شود؛ اساتید بدون درجه هیچ مهر و تیکی ندارند.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                    <Icon name="checkCircle" size={16} style={{ color: selected.verified ? 'var(--olive-600)' : 'var(--ink-4)' }} />
                    استاد تأییدشده (تأیید حساب استاد)
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(selected.verified)}
                    disabled={busyId === selected.id}
                    onClick={() => void patchSettings(selected, { verified: !selected.verified })}
                    style={{
                      width: 42,
                      height: 24,
                      borderRadius: 999,
                      border: 0,
                      cursor: 'pointer',
                      background: selected.verified ? 'var(--olive-600)' : 'var(--sand-200)',
                      position: 'relative',
                      transition: 'background .18s ease',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      insetInlineStart: selected.verified ? 21 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                      transition: 'inset-inline-start .18s ease',
                    }} />
                  </button>
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                  درجه استاد
                  <select
                    value={selected.tier ?? ''}
                    disabled={busyId === selected.id}
                    onChange={(event) => void patchSettings(selected, { tier: event.target.value as TeacherTier })}
                    style={{
                      minHeight: 40,
                      padding: '8px 11px',
                      border: '1px solid var(--sand-200)',
                      borderRadius: 11,
                      background: '#fff',
                      color: 'var(--ink)',
                      fontFamily: 'inherit',
                      fontSize: 12,
                    }}
                  >
                    {TIER_OPTIONS.map((option) => (
                      <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {busyId === selected.id && <small style={{ display: 'block', marginTop: 8, color: 'var(--olive-700)' }}>در حال ثبت تغییر…</small>}
              </section>
            )}

            {selected.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <PanelButton tone="danger" icon="x" disabled={busyId === selected.id} onClick={() => void review(selected, false)}>رد پروفایل</PanelButton>
                <PanelButton tone="success" icon="check" disabled={busyId === selected.id} onClick={() => void review(selected, true)}>
                  {busyId === selected.id ? 'در حال ثبت…' : 'تأیید پروفایل'}
                </PanelButton>
              </div>
            )}

            {selected.status === 'approved' && (
              <Link href={`/teachers/${selected.id}`} target="_blank" className="ops-button" style={{ marginTop: 14, justifyContent: 'center' }}>
                <Icon name="user" size={15} /> مشاهده پروفایل عمومی
              </Link>
            )}
          </>
        )}
      </Drawer>
    </main>
  );
}
