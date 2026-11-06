'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { StatCard } from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type PendingService = {
  id: number;
  title?: string;
  duration?: number;
  price?: number;
  teacher?: {
    city?: string;
    field?: string;
    tag?: string;
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
    const action = approve ? 'تأیید و انتشار' : 'رد و حذف';
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

  const pageValue = services.reduce((sum, service) => sum + Number(service.price || 0), 0);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="کنترل کیفیت خدمات"
        title="بررسی خدمات استادان"
        description="خدمت تازه یا ویرایش‌شده فقط بعد از بررسی مدیر قابل رزرو می‌شود."
        actions={<PanelButton icon="refresh" onClick={() => void fetchData()}>به‌روزرسانی</PanelButton>}
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard icon="book" tone={services.length ? 'gold' : 'olive'} label="خدمات در انتظار بررسی" value={loading ? '—' : toFaDigits(services.length)} hint={services.length ? 'نیازمند اقدام مدیریتی' : 'صف خالی است'} />
        <StatCard icon="coins" tone="clay" label="ارزش صف بررسی" value={loading ? '—' : `${formatFaNumber(pageValue)} ت`} hint="جمع قیمت خدمات همین صف" />
        <StatCard icon="shield" tone="info" label="سیاست انتشار" value="بررسی ← انتشار" hint="خدمت تأییدنشده قابل رزرو نیست" />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void fetchData()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>صف بررسی خدمات</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(services.length)} خدمت در انتظار`}</span>
          </div>
          <span className="adm-badge" data-tone={services.length ? 'gold' : 'green'}>{services.length ? 'نیازمند اقدام' : 'صف خالی'}</span>
        </div>

        {loading ? (
          <div style={{ padding: 20, display: 'grid', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="adm-skeleton" style={{ height: 56, borderRadius: 14 }} />
            ))}
          </div>
        ) : services.length === 0 ? (
          <PanelEmpty icon="checkCircle" title="خدمت در انتظار بررسی وجود ندارد" description="همه خدمات جدید تعیین تکلیف شده‌اند." />
        ) : (
          services.map((service) => {
            const teacher = service.teacher || {};
            const user = teacher.user || {};
            const busy = busyId === service.id;
            return (
              <article className="ops-row" key={service.id} style={{ opacity: busy ? .55 : 1 }}>
                <span className="adm-stat-icon" style={{ width: 44, height: 44, borderRadius: 13 }}>
                  <Icon name="book" size={20} />
                </span>
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{service.title || 'خدمت بدون عنوان'}</strong>
                    <span className="adm-badge" data-tone="gold">در انتظار تأیید</span>
                  </div>
                  <div className="ops-row-sub">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Avatar size={23} imageUrl={fullUrl(user.avatar_url)} />{user.name || 'استاد'}
                    </span>
                    {teacher.tag && <span>· {teacher.tag}</span>}
                    {teacher.city && <span>· {teacher.city}</span>}
                  </div>
                  <div className="ops-row-meta">
                    <span><Icon name="clock" size={13} />{toFaDigits(Number(service.duration) || 0)} دقیقه</span>
                    <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{formatFaNumber(Number(service.price) || 0)} تومان</span>
                    <span>#{toFaDigits(service.id)}</span>
                  </div>
                </div>
                <div className="ops-row-actions">
                  <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void moderate(service, false)}>رد و حذف</PanelButton>
                  <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void moderate(service, true)}>
                    {busy ? 'در حال ثبت…' : 'تأیید و انتشار'}
                  </PanelButton>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
