'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

export default function TeacherReviewsPage() {
  const [reviews, setReviews] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/teacher/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: {} })
      .then(j => {
        setReviews((j.data?.reviews || []) as unknown[]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const list = reviews as Array<Record<string, unknown>>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>نظرات قرآنآموزان</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>بازخورد جلسات برگزارشده</p>
      {loading ? <div style={{ padding: 28 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(r => (
            <div key={r.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Avatar size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{(r.learner_name as string) || ((r.user as Record<string, string>)?.name) || 'قرآنآموز'}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name="star" size={14} fill={i < ((r.rating as number) || 0)} style={{ color: i < ((r.rating as number) || 0) ? 'var(--gold)' : 'var(--sand-200)' }} />
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{(r.created_at as string)?.slice(0, 10) || ''}</span>
              </div>
              {(r.text as string) && <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--ink-2s)', margin: 0 }}>{r.text as string}</p>}
            </div>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز نظری ثبت نشده</div>}
        </div>
      )}
    </div>
  );
}
