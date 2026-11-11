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
import { toFaDigits } from '@/lib/persian';

type AdminReviewRow = {
  id: number;
  session_id: number;
  teacher_id: number;
  rating: number;
  text: string;
  created_at: string;
  learner_id: number;
  learner_name: string;
  learner_avatar: string;
  teacher_name: string;
  teacher_field: string;
};

const PAGE_SIZE = 30;

const RATING_FILTERS = [
  { value: '', label: 'همه' },
  { value: 'low', label: 'امتیاز پایین' },
  { value: 'high', label: 'امتیاز بالا' },
] as const;

type RatingFilter = (typeof RATING_FILTERS)[number]['value'];

function faDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#8d6d1f' }} aria-label={`امتیاز ${toFaDigits(rating)} از ۵`}>
      <Icon name="star" size={13} fill />
      <strong style={{ fontSize: 12 }}>{toFaDigits(rating)}</strong>
    </span>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminReviewRow | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/reviews?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست نظرات دریافت نشد.');
      setReviews(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست نظرات دریافت نشد.');
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { void load(); }, [load]);

  async function removeReview(review: AdminReviewRow) {
    if (!token || busyId !== null) return;
    if (!window.confirm('حذف نظر بازگشت‌پذیر نیست؛ امتیاز استاد بازمحاسبه و جلسه برای ثبت نظر تازه باز می‌شود. ادامه می‌دهید؟')) return;

    setBusyId(review.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/reviews/${review.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'حذف نظر انجام نشد.');
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حذف نظر انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = reviews.filter((review) => {
    if (ratingFilter === 'low') return review.rating <= 3;
    if (ratingFilter === 'high') return review.rating >= 4;
    return true;
  });

  const pageAvg = filtered.length
    ? filtered.reduce((sum, review) => sum + Number(review.rating || 0), 0) / filtered.length
    : 0;
  const lowCount = reviews.filter((review) => review.rating <= 3).length;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="نظارت بر کیفیت آموزش"
        title="نظرات قرآن‌آموزان"
        description="همه نظرات ثبت‌شده درباره اساتید. حذف نظر، امتیاز استاد را بازمحاسبه و جلسه را برای ثبت نظر تازه باز می‌کند."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-reviews',
                  ['شناسه', 'قرآن‌آموز', 'استاد', 'امتیاز', 'متن', 'تاریخ', 'جلسه'],
                  reviews.map((review) => [
                    review.id,
                    review.learner_name || '',
                    review.teacher_name || '',
                    review.rating,
                    review.text || '',
                    faDate(review.created_at),
                    review.session_id,
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
        <StatCard icon="star" tone="gold" label="نظرات ثبت‌شده" value={loading ? '—' : toFaDigits(total)} hint="در کل سامانه" />
        <StatCard
          icon="trending"
          tone={lowCount ? 'rose' : 'olive'}
          label="نظرهای نیازمند توجه"
          value={loading ? '—' : toFaDigits(lowCount)}
          hint="امتیاز ۳ یا کمتر در همین صفحه"
        />
        <StatCard
          icon="checkCircle"
          tone="olive"
          label="میانگین امتیاز صفحه"
          value={loading ? '—' : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(pageAvg)}
          hint="از ۵ در این صفحه"
        />
      </div>

      <div className="adm-toolbar">
        <FilterTabs
          ariaLabel="فیلتر امتیاز"
          items={RATING_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
          value={ratingFilter}
          onChange={(value) => { setRatingFilter(value); }}
        />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <DataTable
        columns={[
          {
            key: 'review',
            header: 'نظر',
            render: (review) => (
              <div className="adm-cell-main">
                <Avatar size={38} imageUrl={fullUrl(review.learner_avatar)} />
                <div style={{ minWidth: 0 }}>
                  <strong>{review.learner_name || 'کاربر'}</strong>
                  <small style={{ display: 'block', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {review.text || '—'}
                  </small>
                </div>
              </div>
            ),
          },
          {
            key: 'teacher',
            header: 'استاد',
            width: 190,
            render: (review) => (
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 11.5 }}>{review.teacher_name || '—'}</strong>
                <small style={{ display: 'block', color: 'var(--ink-3)', fontSize: 10 }}>{review.teacher_field || ''}</small>
              </div>
            ),
          },
          {
            key: 'rating',
            header: 'امتیاز',
            width: 90,
            render: (review) => <Stars rating={Number(review.rating || 0)} />,
          },
          {
            key: 'date',
            header: 'تاریخ',
            width: 120,
            render: (review) => <span style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>{faDate(review.created_at)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: 130,
            align: 'end',
            render: (review) => {
              const busy = busyId === review.id;
              return (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <PanelButton icon="doc" onClick={() => setSelected(review)}>جزئیات</PanelButton>
                  <PanelButton tone="danger" icon="trash" disabled={busy} onClick={() => void removeReview(review)}>
                    {busy ? '…' : 'حذف'}
                  </PanelButton>
                </div>
              );
            },
          },
        ]}
        rows={filtered}
        loading={loading}
        emptyIcon="star"
        emptyTitle="نظری برای نمایش نیست"
        emptyDescription={ratingFilter ? 'فیلتر امتیاز را تغییر دهید.' : 'با ثبت جلسات برگزارشده، نظرات اینجا دیده می‌شود.'}
        onRowClick={(review) => setSelected(review)}
      />

      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title="جزئیات نظر">
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 14px' }}>
              <Avatar size={54} imageUrl={fullUrl(selected.learner_avatar)} />
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>{selected.learner_name || 'کاربر'}</strong>
                <div style={{ marginTop: 5 }}><Stars rating={Number(selected.rating || 0)} /></div>
              </div>
            </div>
            <KeyValueRow label="استاد">{selected.teacher_name || '—'}{selected.teacher_field ? ` · ${selected.teacher_field}` : ''}</KeyValueRow>
            <KeyValueRow label="جلسه">#{toFaDigits(selected.session_id)}</KeyValueRow>
            <KeyValueRow label="تاریخ">{faDate(selected.created_at)}</KeyValueRow>
            <p style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 13, background: 'var(--sand-50)', color: 'var(--ink-2s)', fontSize: 12, lineHeight: 2, whiteSpace: 'pre-wrap' }}>
              {selected.text || 'متن نظر ثبت نشده است.'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <PanelButton tone="danger" icon="trash" disabled={busyId === selected.id} onClick={() => void removeReview(selected)}>
                {busyId === selected.id ? 'در حال حذف…' : 'حذف نظر'}
              </PanelButton>
            </div>
          </>
        )}
      </Drawer>

      {filtered.length === 0 && !loading && (
        <div style={{ marginTop: 14 }}>
          <PanelEmpty icon="star" title="نظری با این فیلتر نیست" description="فیلتر امتیاز را تغییر دهید یا همه نظرات را ببینید." />
        </div>
      )}
    </main>
  );
}
