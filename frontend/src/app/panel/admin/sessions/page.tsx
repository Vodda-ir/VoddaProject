'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import {
  DataTable,
  Drawer,
  exportCsv,
  FilterTabs,
  KeyValueRow,
  StatCard,
  TablePagination,
} from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import type { SessionListItem } from '@/lib/api';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type SessionStatusFilter = '' | 'pending' | 'confirmed' | 'done' | 'canceled';
const PAGE_SIZE = 30;
const FILTERS: Array<{ value: SessionStatusFilter; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'confirmed', label: 'تأییدشده' },
  { value: 'done', label: 'برگزارش‌شده' },
  { value: 'canceled', label: 'لغوشده' },
];

const STATUS_BADGE: Record<string, { label: string; tone: string }> = {
  pending: { label: 'در انتظار', tone: 'gold' },
  confirmed: { label: 'تأییدشده', tone: 'info' },
  done: { label: 'برگزارش‌شده', tone: 'green' },
  canceled: { label: 'لغوشده', tone: 'rose' },
};

function faDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [status, setStatus] = useState<SessionStatusFilter>('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SessionListItem | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (status) sp.set('status', status);
      const response = await fetch(`/api/backend/admin/sessions?${sp.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست جلسات دریافت نشد.');
      setSessions(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست جلسات دریافت نشد.');
      setSessions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => { void load(); }, [load]);

  const pageRevenue = sessions.reduce((sum, session) => (session.status === 'done' ? sum + Number(session.price || 0) : sum), 0);
  const pageMinutes = sessions.reduce((sum, session) => (session.status === 'done' ? sum + Number(session.duration || 0) : sum), 0);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="نظارت بر چرخه جلسه"
        title="جلسات"
        description="وضعیت رزروها، طرفین جلسه، زمان رسمی و مبلغ ثبت‌شده را در یک نمای عملیاتی بررسی کنید."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-sessions',
                  ['شناسه', 'خدمت', 'قرآن‌آموز', 'استاد', 'وضعیت', 'زمان', 'مدت (دقیقه)', 'مبلغ (تومان)'],
                  sessions.map((session) => [
                    session.id,
                    session.service || '',
                    session.learner?.name || '',
                    session.teacher?.user?.name || '',
                    STATUS_BADGE[session.status]?.label ?? session.status,
                    `${session.local_date} ${session.local_start}`,
                    Number(session.duration || 0),
                    Number(session.price || 0),
                  ]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
          </>
        }
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard icon="calendar" tone="info" label="جلسات این نما" value={loading ? '—' : toFaDigits(total)} hint={status ? STATUS_BADGE[status]?.label : 'همه وضعیت‌ها'} />
        <StatCard icon="coins" tone="gold" label="ارزش برگزارشده صفحه" value={loading ? '—' : `${formatFaNumber(pageRevenue)} ت`} hint="فقط جلسات برگزارشده همین صفحه" />
        <StatCard icon="clock" tone="olive" label="زمان تدریس صفحه" value={loading ? '—' : `${toFaDigits(Math.round(pageMinutes / 60))} ساعت`} hint={`${toFaDigits(pageMinutes)} دقیقه`} />
      </div>

      <div className="adm-toolbar">
        <FilterTabs
          ariaLabel="وضعیت جلسات"
          items={FILTERS}
          value={status}
          onChange={(value) => { setStatus(value); setPage(0); }}
        />
      </div>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'session',
            header: 'جلسه',
            render: (session) => (
              <div className="adm-cell-main">
                <span className="adm-stat-icon" style={{ width: 38, height: 38, borderRadius: 12, '--tone-ink': 'var(--olive-700)', '--tone-bg': 'var(--olive-100)' } as React.CSSProperties}>
                  <Icon name="calendar" size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <strong>{session.service || 'جلسه بدون عنوان'}</strong>
                  <small>#{toFaDigits(session.id)}</small>
                </div>
              </div>
            ),
          },
          {
            key: 'parties',
            header: 'طرفین',
            width: 240,
            render: (session) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, whiteSpace: 'nowrap' }}>
                <Avatar size={26} imageUrl={fullUrl(session.learner?.avatar_url)} />
                <span>{session.learner?.name || 'قرآن‌آموز'}</span>
                <Icon name="arrowL" size={12} style={{ color: 'var(--ink-4)' }} />
                <Avatar size={26} imageUrl={fullUrl(session.teacher?.user?.avatar_url)} />
                <span>{session.teacher?.user?.name || 'استاد'}</span>
              </div>
            ),
          },
          {
            key: 'time',
            header: 'زمان',
            width: 170,
            render: (session) => (
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="clock" size={12} />
                  {faDateTime(session.scheduled_at)}
                </div>
                <small style={{ display: 'block', marginTop: 2 }}>
                  {toFaDigits(session.local_start)} تا {toFaDigits(session.local_end)} · {toFaDigits(session.duration)} دقیقه
                </small>
              </div>
            ),
          },
          {
            key: 'price',
            header: 'مبلغ',
            width: 110,
            render: (session) => <strong style={{ fontSize: 12 }}>{formatFaNumber(Number(session.price || 0))}</strong>,
          },
          {
            key: 'status',
            header: 'وضعیت',
            width: 110,
            render: (session) => (
              <span className="adm-badge" data-tone={STATUS_BADGE[session.status]?.tone ?? 'muted'}>
                {STATUS_BADGE[session.status]?.label ?? session.status}
              </span>
            ),
          },
        ]}
        rows={sessions}
        loading={loading}
        emptyIcon="calendar"
        emptyTitle="جلسه‌ای در این وضعیت وجود ندارد"
        onRowClick={(session) => setSelected(session)}
      />

      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected?.service || 'جزئیات جلسه'}>
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '4px 2px 12px' }}>
              <span className="adm-badge" data-tone={STATUS_BADGE[selected.status]?.tone ?? 'muted'}>
                {STATUS_BADGE[selected.status]?.label ?? selected.status}
              </span>
              <span className="adm-badge" data-tone="muted">#{toFaDigits(selected.id)}</span>
            </div>
            <KeyValueRow label="قرآن‌آموز">{selected.learner?.name || '—'}</KeyValueRow>
            <KeyValueRow label="استاد">{selected.teacher?.user?.name || '—'}</KeyValueRow>
            <KeyValueRow label="زمان رسمی">{faDateTime(selected.scheduled_at)}</KeyValueRow>
            <KeyValueRow label="بازه محلی">{toFaDigits(selected.local_date)} · {toFaDigits(selected.local_start)} تا {toFaDigits(selected.local_end)}</KeyValueRow>
            <KeyValueRow label="مدت">{toFaDigits(Number(selected.duration || 0))} دقیقه</KeyValueRow>
            <KeyValueRow label="مبلغ">{formatFaNumber(Number(selected.price || 0))} تومان</KeyValueRow>
            <KeyValueRow label="نظرسنجی">{selected.rated ? 'ثبت شده' : 'ثبت نشده'}</KeyValueRow>
            {selected.note && <KeyValueRow label="یادداشت">{selected.note}</KeyValueRow>}
          </>
        )}
      </Drawer>

      {sessions.length === 0 && !loading && (
        <div style={{ marginTop: 14 }}>
          <PanelEmpty icon="calendar" title="داده‌ای برای نمایش نیست" description="با تغییر فیلتر وضعیت جلسات را ببینید." />
        </div>
      )}
    </main>
  );
}
