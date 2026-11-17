'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelMetric,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { api, type Review } from '@/lib/api';
import { avatarUrl, fullUrl, getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';
import { formatDate as formatDateFa } from '@/lib/datetime';

export default function TeacherReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherReviews(token);
      setReviews(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'نظرها دریافت نشدند.');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const average = useMemo(
    () => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
    [reviews],
  );
  const fiveStarCount = reviews.filter((review) => review.rating === 5).length;
  const fiveStarPercent = reviews.length ? Math.round((fiveStarCount / reviews.length) * 100) : 0;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="اعتبار و بازخورد"
        title="نظرهای قرآن‌آموزان"
        description="بازخوردهایی که فقط پس از جلسه تکمیل‌شده ثبت شده‌اند؛ برای ارزیابی کیفیت خدمات و تجربه قرآن‌آموز."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-metric-grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <PanelMetric icon="star" label="میانگین امتیاز" value={reviews.length ? toFaDigits(average.toFixed(1)) : '—'} hint="از ۵" tone="gold" />
        <PanelMetric icon="message" label="کل نظرها" value={toFaDigits(reviews.length)} hint="بازخورد ثبت‌شده" tone="info" />
        <PanelMetric icon="checkCircle" label="امتیاز پنج‌ستاره" value={reviews.length ? `${toFaDigits(fiveStarPercent)}٪` : '—'} hint={`${toFaDigits(fiveStarCount)} نظر`} />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>بازخوردهای ثبت‌شده</strong>
            <span style={{ display: 'block', marginTop: 2 }}>جدیدترین نظرها در همین فهرست نمایش داده می‌شوند.</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری نظرها…</div>
        ) : reviews.length === 0 ? (
          <PanelEmpty icon="star" title="هنوز نظری ثبت نشده" description="پس از برگزاری جلسه و ثبت امتیاز توسط قرآن‌آموز، نظرها اینجا دیده می‌شوند." />
        ) : (
          reviews.map((review) => (
            <article className="ops-row" key={review.id} style={{ alignItems: 'flex-start' }}>
              <Avatar size={43} imageUrl={avatarUrl(review.learner?.avatar_url, review.learner?.updated_at)} />
              <div className="ops-row-main">
                <div className="ops-row-title">
                  <strong>{review.learner?.name || 'قرآن‌آموز'}</strong>
                  <span aria-label={`${review.rating} از ۵`} style={{ display: 'inline-flex', gap: 2 }}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Icon key={index} name="star" size={13} fill={index < review.rating} style={{ color: index < review.rating ? 'var(--gold)' : 'var(--sand-200)' }} />
                    ))}
                  </span>
                </div>
                {review.text && <p style={{ margin: '7px 0 0', color: 'var(--ink-2s)', fontSize: 11.5, lineHeight: 1.95 }}>{review.text}</p>}
                <div className="ops-row-meta">
                  <span>{formatDate(review.created_at)}</span>
                  {review.session_id && <span>جلسه #{toFaDigits(review.session_id)}</span>}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDateFa(date);
}
