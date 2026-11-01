'use client';

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

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [status, setStatus] = useState<SessionStatusFilter>('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="نظارت بر چرخه جلسه"
        title="جلسات"
        description="وضعیت رزروها، طرفین جلسه، زمان رسمی و مبلغ ثبت‌شده را در یک نمای عملیاتی بررسی کنید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-filter-tabs" role="tablist" aria-label="وضعیت جلسات" style={{ marginBottom: 14 }}>
        {FILTERS.map((item) => (
          <button
            key={item.value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === item.value}
            onClick={() => { setStatus(item.value); setPage(0); }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>{status ? FILTERS.find((item) => item.value === status)?.label : 'همه جلسات'}</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(total)} جلسه`}</span>
          </div>
          {!loading && total > 0 && <span>صفحه {toFaDigits(page + 1)} از {toFaDigits(pageCount)}</span>}
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری جلسات…</div>
        ) : sessions.length === 0 ? (
          <PanelEmpty icon="calendar" title="جلسه‌ای در این وضعیت وجود ندارد" />
        ) : (
          sessions.map((session) => (
            <article className="ops-row" key={session.id}>
              <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', flex: '0 0 40px', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                <Icon name="calendar" size={19} />
              </span>
              <div className="ops-row-main">
                <div className="ops-row-title">
                  <strong>{session.service || 'جلسه بدون عنوان'}</strong>
                  <PanelStatus status={sessionStatusTone(session.status)}>{sessionStatusLabel(session.status)}</PanelStatus>
                </div>
                <div className="ops-row-sub">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Avatar size={24} imageUrl={fullUrl(session.learner?.avatar_url)} />{session.learner?.name || 'قرآن‌آموز'}
                  </span>
                  <span>←</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Avatar size={24} imageUrl={fullUrl(session.teacher?.user?.avatar_url)} />{session.teacher?.user?.name || 'استاد'}
                  </span>
                </div>
                <div className="ops-row-meta">
                  <span><Icon name="clock" size={13} />{session.local_date} · {toFaDigits(session.local_start)} تا {toFaDigits(session.local_end)}</span>
                  <span>{toFaDigits(session.duration)} دقیقه</span>
                  <span>{formatFaNumber(session.price)} تومان</span>
                  <span>#{toFaDigits(session.id)}</span>
                </div>
              </div>
            </article>
          ))
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="ops-pagination">
            <PanelButton disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>صفحه قبل</PanelButton>
            <span>{toFaDigits(page * PAGE_SIZE + 1)} تا {toFaDigits(Math.min((page + 1) * PAGE_SIZE, total))} از {toFaDigits(total)}</span>
            <PanelButton disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>صفحه بعد</PanelButton>
          </div>
        )}
      </section>
    </main>
  );
}

function sessionStatusLabel(status: SessionListItem['status']) {
  if (status === 'confirmed') return 'تأییدشده';
  if (status === 'done') return 'برگزارش‌شده';
  if (status === 'canceled') return 'لغوشده';
  return 'در انتظار';
}

function sessionStatusTone(status: SessionListItem['status']): 'approved' | 'pending' | 'done' | 'canceled' {
  if (status === 'confirmed') return 'approved';
  if (status === 'done') return 'done';
  if (status === 'canceled') return 'canceled';
  return 'pending';
}
