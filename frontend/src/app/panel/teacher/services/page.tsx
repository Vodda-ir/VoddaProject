'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { api, type TeacherService } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function TeacherServicesPage() {
  const [services, setServices] = useState<TeacherService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; service: TeacherService } | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherServices(token);
      setServices(response.data.services || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'خدمات استاد دریافت نشدند.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function deactivate(service: TeacherService) {
    if (!token || busyId !== null || !service.active) return;
    if (!window.confirm(`خدمت «${service.title}» غیرفعال شود؟ فعال‌سازی مجدد نیازمند بررسی ادمین است.`)) return;
    setBusyId(service.id);
    setError('');
    try {
      await api.deactivateTeacherService(token, service.id);
      setServices((items) => items.map((item) => item.id === service.id ? { ...item, active: false } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'غیرفعال‌سازی خدمت انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(service: TeacherService) {
    if (!token || busyId !== null) return;
    if (!window.confirm(`خدمت «${service.title}» حذف شود؟`)) return;
    setBusyId(service.id);
    setError('');
    try {
      await api.deleteTeacherService(token, service.id);
      setServices((items) => items.filter((item) => item.id !== service.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حذف خدمت انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function save(data: { title: string; duration: number; price: number }) {
    if (!token || !dialog) return;
    setError('');
    if (dialog.mode === 'add') {
      await api.createTeacherService(token, data);
    } else {
      await api.updateTeacherService(token, dialog.service.id, data);
    }
    setDialog(null);
    await load();
  }

  return (
    <main style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800 }}>خدمات من</h1>
        <button type="button" onClick={() => setDialog({ mode: 'add' })} style={primaryButton}><span style={{ fontSize: 17 }}>+</span> خدمت جدید</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>خدمت جدید یا ویرایش‌شده تا تأیید مدیر قابل رزرو نیست.</p>

      {error && <div role="alert" style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)' }}>{error}<button type="button" onClick={load} style={{ display: 'block', marginTop: 10, border: 0, borderRadius: 10, padding: '7px 12px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button></div>}
      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map((service) => (
            <article key={service.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap', opacity: busyId === service.id ? .58 : 1 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'grid', placeItems: 'center' }}><Icon name="book" size={23} /></div>
              <div style={{ flex: '1 1 230px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><strong style={{ fontSize: 14 }}>{service.title}</strong><span style={statusPill(Boolean(service.active))}>{service.active ? 'فعال و قابل رزرو' : 'غیرفعال / در انتظار تأیید'}</span></div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{faDigits(service.duration)} دقیقه · {faDigits(service.price)} تومان</div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button type="button" disabled={busyId === service.id} onClick={() => setDialog({ mode: 'edit', service })} style={secondaryButton}><Icon name="edit" size={14} /> ویرایش</button>
                {service.active && <button type="button" disabled={busyId === service.id} onClick={() => deactivate(service)} style={secondaryButton}>غیرفعال‌کردن</button>}
                <button type="button" aria-label="حذف خدمت" disabled={busyId === service.id} onClick={() => remove(service)} style={{ ...secondaryButton, color: 'var(--rose)', background: 'var(--clay-bg)' }}><Icon name="trash" size={14} /></button>
              </div>
            </article>
          ))}
          {services.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز خدمتی تعریف نشده است.</div>}
        </div>
      )}

      {dialog && <ServiceDialog service={dialog.mode === 'edit' ? dialog.service : undefined} onSave={save} onClose={() => setDialog(null)} />}
    </main>
  );
}

function ServiceDialog({ service, onSave, onClose }: { service?: TeacherService; onSave: (data: { title: string; duration: number; price: number }) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(service?.title || '');
  const [duration, setDuration] = useState(String(service?.duration || 30));
  const [price, setPrice] = useState(String(service?.price || ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const parsedDuration = Number.parseInt(duration, 10);
    const parsedPrice = Number.parseInt(price, 10);
    if (!title.trim()) return setError('عنوان خدمت را وارد کنید.');
    if (!Number.isInteger(parsedDuration) || parsedDuration < 10 || parsedDuration > 240) return setError('مدت خدمت باید بین ۱۰ تا ۲۴۰ دقیقه باشد.');
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) return setError('قیمت معتبر وارد کنید.');
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), duration: parsedDuration, price: parsedPrice });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ خدمت انجام نشد.');
      setSaving(false);
    }
  }

  return (
    <div role="presentation" style={overlayStyle} onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" onClick={(event) => event.stopPropagation()} style={dialogStyle}>
        <h2 id="service-dialog-title" style={{ fontSize: 17, marginBottom: 18 }}>{service ? 'ویرایش خدمت' : 'خدمت جدید'}</h2>
        <label style={labelStyle}>عنوان<input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>مدت (دقیقه)<input type="number" min={10} max={240} value={duration} onChange={(event) => setDuration(event.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>قیمت (تومان)<input type="number" min={1} value={price} onChange={(event) => setPrice(event.target.value)} style={inputStyle} /></label>
        {error && <div role="alert" style={{ color: 'var(--rose)', background: 'var(--clay-bg)', padding: 10, borderRadius: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}><button type="button" disabled={saving} onClick={onClose} style={secondaryButton}>انصراف</button><button type="button" disabled={saving} onClick={submit} style={{ ...primaryButton, opacity: saving ? .6 : 1 }}>{saving ? 'در حال ذخیره…' : 'ذخیره'}</button></div>
      </section>
    </div>
  );
}

const primaryButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: 0, background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999, border: 0, background: 'var(--sand-100)', color: 'var(--ink-2s)', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const statusPill = (active: boolean): React.CSSProperties => ({ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: active ? 'var(--olive-100)' : 'var(--gold-bg)', color: active ? 'var(--olive-700)' : 'var(--gold)' });
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.42)' };
const dialogStyle: React.CSSProperties = { width: 420, maxWidth: '100%', background: '#fff', borderRadius: 20, padding: 24, boxShadow: 'var(--sh-lg)' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1px solid var(--sand-200)', color: 'var(--ink)', background: '#fff' };
