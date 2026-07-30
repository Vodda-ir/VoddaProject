'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api, type Review } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';

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

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>نظرهای قرآن‌آموزان</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>فقط بازخوردهای ثبت‌شده پس از جلسهٔ تکمیل‌شده</p>
      {reviews.length > 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 14, background: 'var(--gold-bg)', color: '#765918', marginBottom: 18 }}><Icon name="star" size={17} fill /> میانگین {average.toFixed(1)} از {reviews.length} نظر</div>}
      {error && <div role="alert" style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)' }}>{error}<button type="button" onClick={load} style={{ display: 'block', marginTop: 10, border: 0, borderRadius: 10, padding: '7px 12px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button></div>}
      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((review) => <article key={review.id} style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: review.text ? 10 : 0 }}>
              <Avatar size={40} imageUrl={fullUrl(review.learner?.avatar_url)} />
              <div style={{ flex: 1 }}><strong style={{ fontSize: 13.5 }}>{review.learner?.name || 'قرآن‌آموز'}</strong><div aria-label={`${review.rating} از ۵`} style={{ display: 'flex', gap: 3, marginTop: 4 }}>{Array.from({ length: 5 }, (_, index) => <Icon key={index} name="star" size={14} fill={index < review.rating} style={{ color: index < review.rating ? 'var(--gold)' : 'var(--sand-200)' }} />)}</div></div>
              <time dateTime={review.created_at} style={{ fontSize: 12, color: 'var(--ink-4)' }}>{formatDate(review.created_at)}</time>
            </div>
            {review.text && <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--ink-2s)', margin: 0 }}>{review.text}</p>}
          </article>)}
          {reviews.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز نظری ثبت نشده است.</div>}
        </div>
      )}
    </main>
  );
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(date); }
