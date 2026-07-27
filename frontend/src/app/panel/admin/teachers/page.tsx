'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { fullUrl, getToken } from '@/lib/auth';

type TeacherRow = {
  id: number;
  field?: string;
  city?: string;
  rating?: number;
  sessions?: number;
  reviews?: number;
  status?: string;
  user?: { name?: string; avatar_url?: string };
};

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const fetchTeachers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/teachers?status=${filter}&limit=100`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست استادان دریافت نشد.');
      setTeachers(body.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست استادان دریافت نشد.');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { void fetchTeachers(); }, [fetchTeachers]);

  async function review(teacher: TeacherRow, approve: boolean) {
    if (!token || busyId !== null) return;
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
      setTeachers((previous) => previous.filter((item) => item.id !== teacher.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} استاد انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>اساتید</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>بررسی وضعیت و انتشار پروفایل استادان</p>

      <div role="tablist" aria-label="وضعیت استادان" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected'] as const).map((value) => (
          <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} style={{
            padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: filter === value ? 'var(--olive-600)' : 'var(--surface)',
            color: filter === value ? '#fff' : 'var(--ink-3)',
            boxShadow: filter === value ? 'var(--sh-olive)' : 'var(--sh-sm)',
          }}>
            {value === 'pending' ? 'در انتظار تأیید' : value === 'approved' ? 'تأییدشده' : 'ردشده'}
          </button>
        ))}
      </div>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {teachers.map((teacher) => (
            <article key={teacher.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
              <Avatar size={46} imageUrl={fullUrl(teacher.user?.avatar_url)} />
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{teacher.user?.name || 'استاد'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{[teacher.field, teacher.city].filter(Boolean).join(' · ') || 'اطلاعات تکمیلی ثبت نشده'}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 7, fontSize: 12, color: 'var(--ink-2s)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="star" size={13} style={{ color: 'var(--gold)' }} /> {Number(teacher.rating) > 0 ? faDigits(Number(teacher.rating).toFixed(1)) : '—'}</span>
                  <span>{faDigits(Number(teacher.sessions) || 0)} جلسه</span>
                  <span>{faDigits(Number(teacher.reviews) || 0)} نظر</span>
                </div>
              </div>
              {filter === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busyId === teacher.id} onClick={() => review(teacher, false)} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: busyId === teacher.id ? 'wait' : 'pointer', background: 'var(--clay-bg)', color: 'var(--clay)', fontSize: 13, fontWeight: 700 }}>رد</button>
                  <button type="button" disabled={busyId === teacher.id} onClick={() => review(teacher, true)} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: busyId === teacher.id ? 'wait' : 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700 }}>{busyId === teacher.id ? 'در حال ثبت…' : 'تأیید'}</button>
                </div>
              )}
              <StatusBadge status={teacher.status || filter} />
            </article>
          ))}
          {teachers.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>موردی در این وضعیت یافت نشد.</div>}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const approved = status === 'approved';
  const rejected = status === 'rejected';
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: approved ? 'var(--olive-100)' : rejected ? 'var(--clay-bg)' : 'var(--gold-bg)', color: approved ? 'var(--olive-700)' : rejected ? 'var(--clay)' : 'var(--gold)' }}>{approved ? 'تأییدشده' : rejected ? 'ردشده' : 'در انتظار'}</span>;
}
