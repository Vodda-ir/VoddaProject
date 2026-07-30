'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { fullUrl, getToken } from '@/lib/auth';

type PendingService = {
  id: number;
  title?: string;
  duration?: number;
  price?: number;
  teacher?: {
    city?: string;
    field?: string;
    user?: { name?: string; avatar_url?: string };
  };
};

export default function AdminServices() {
  const [services, setServices] = useState<PendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/backend/admin/services', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'خدمات در انتظار دریافت نشدند.');
      setServices(body.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'خدمات در انتظار دریافت نشدند.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function moderate(service: PendingService, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد و حذف';
    if (!window.confirm(`خدمت «${service.title || 'بدون عنوان'}» ${action} شود؟`)) return;

    setBusyId(service.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/services/${service.id}/${approve ? 'approve' : 'reject'}`, { method: 'PUT' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${action} خدمت انجام نشد.`);
      setServices((previous) => previous.filter((item) => item.id !== service.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} خدمت انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>خدمات استادان</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>هر خدمت تازه یا ویرایش‌شده پیش از انتشار باید بررسی شود.</p>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div>
      ) : services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 14 }}>خدمت در انتظار بررسی وجود ندارد.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map((service) => {
            const teacher = service.teacher || {};
            const user = teacher.user || {};
            return (
              <article key={service.id} style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="book" size={23} /></div>
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{service.title || 'خدمت بدون عنوان'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{faDigits(Number(service.duration) || 0)} دقیقه · {faDigits(Number(service.price) || 0)} تومان</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--gold-bg)', color: 'var(--gold)' }}>در انتظار تأیید</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px', background: 'var(--sand-50)', borderRadius: 12, flexWrap: 'wrap' }}>
                  <Avatar size={30} imageUrl={fullUrl(user.avatar_url)} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2s)' }}>{user.name || '—'}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{[teacher.city, teacher.field].filter(Boolean).join(' · ') || 'اطلاعات استاد ثبت نشده'}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" disabled={busyId === service.id} onClick={() => moderate(service, false)} style={{ padding: '8px 18px', borderRadius: 12, border: '1.5px solid var(--sand-200)', background: '#fff', color: 'var(--clay)', fontSize: 13, fontWeight: 700, cursor: busyId === service.id ? 'wait' : 'pointer' }}>رد و حذف</button>
                  <button type="button" disabled={busyId === service.id} onClick={() => moderate(service, true)} style={{ padding: '8px 20px', borderRadius: 12, border: 'none', background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busyId === service.id ? 'wait' : 'pointer' }}>{busyId === service.id ? 'در حال ثبت…' : 'تأیید و انتشار'}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
