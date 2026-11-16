'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { PanelButton, PanelMetric, PanelPageHeader } from '@/components/panel/PanelUI';
import { api, type WorkTime } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toFaDigits, toLatinDigits } from '@/lib/persian';
import { confirmDialog } from '@/lib/confirm';

const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

function normalizeTimeInput(value: string) {
  const digits = toLatinDigits(value).replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function TeacherWorkTimesPage() {
  const [items, setItems] = useState<WorkTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ weekday: number; slot?: WorkTime } | null>(null);
  const token = getToken();

  const grouped = useMemo(() => {
    const value = new Map<number, WorkTime[]>();
    for (const item of items) {
      const current = value.get(item.weekday) || [];
      current.push(item);
      value.set(item.weekday, current);
    }
    for (const ranges of value.values()) ranges.sort((left, right) => left.from.localeCompare(right.from));
    return value;
  }, [items]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherWorkTimesMine(token);
      setItems(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'زمان‌های کاری دریافت نشدند.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function save(from: string, to: string) {
    if (!token || !dialog) return;
    const existing = dialog.slot;
    try {
      if (existing) await api.updateTeacherWorkTime(token, existing.id, { weekday: dialog.weekday, from, to });
      else await api.createTeacherWorkTime(token, { weekday: dialog.weekday, from, to });
      setDialog(null);
      await load();
    } catch (cause) {
      throw new Error(cause instanceof Error ? cause.message : 'ذخیرهٔ بازه انجام نشد.');
    }
  }

  async function remove(slot: WorkTime) {
    if (!token || busyId !== null) return;
    if (!(await confirmDialog(`بازهٔ ${toFaDigits(slot.from)} تا ${toFaDigits(slot.to)} حذف شود؟`))) return;
    setBusyId(slot.id);
    setError('');
    try {
      await api.deleteTeacherWorkTime(token, slot.id);
      setItems((values) => values.filter((item) => item.id !== slot.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حذف بازه انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const activeDays = grouped.size;
  const totalRanges = items.length;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="تقویم دسترس‌پذیری"
        title="زمان‌های کاری"
        description="بازه‌های رسمی قابل رزرو را مدیریت کنید؛ هم‌پوشانی و ساعت نامعتبر توسط backend رد می‌شود."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-metric-grid">
        <PanelMetric icon="calendar" label="روزهای فعال" value={toFaDigits(activeDays)} hint="روز دارای حداقل یک بازه" tone="info" />
        <PanelMetric icon="clock" label="کل بازه‌های کاری" value={toFaDigits(totalRanges)} hint="بازه ثبت‌شده" />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map((day, weekday) => {
            const ranges = grouped.get(weekday) || [];
            return (
              <section key={day} className="ops-section-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: ranges.length ? 'var(--olive-100)' : 'var(--sand-100)', color: ranges.length ? 'var(--olive-700)' : 'var(--ink-3)', display: 'grid', placeItems: 'center' }}><Icon name="clock" size={22} /></div>
                  <div style={{ flex: '1 1 160px' }}><strong style={{ fontSize: 14 }}>{day}</strong><div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 3 }}>{ranges.length ? `${toFaDigits(ranges.length)} بازه ثبت شده` : 'تعطیل'}</div></div>
                  <PanelButton icon="clock" onClick={() => setDialog({ weekday })}>افزودن بازه</PanelButton>
                </div>
                {ranges.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
                  {ranges.map((slot) => <div key={slot.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 999, background: 'var(--olive-50)', color: 'var(--olive-700)', opacity: busyId === slot.id ? .5 : 1 }}>
                    <Icon name="clock" size={14} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{toFaDigits(slot.from)} تا {toFaDigits(slot.to)}</span>
                    <button type="button" aria-label="ویرایش بازه" disabled={busyId === slot.id} onClick={() => setDialog({ weekday, slot })} style={iconButton}><Icon name="edit" size={13} /></button>
                    <button type="button" aria-label="حذف بازه" disabled={busyId === slot.id} onClick={() => remove(slot)} style={{ ...iconButton, color: 'var(--rose)' }}><Icon name="x" size={13} /></button>
                  </div>)}
                </div>}
              </section>
            );
          })}
        </div>
      )}

      {dialog && <TimeRangeDialog dayName={DAYS[dialog.weekday]} slot={dialog.slot} onSave={save} onClose={() => setDialog(null)} />}
    </main>
  );
}

function TimeRangeDialog({ dayName, slot, onSave, onClose }: { dayName: string; slot?: WorkTime; onSave: (from: string, to: string) => Promise<void>; onClose: () => void }) {
  const [from, setFrom] = useState(slot?.from || '08:00');
  const [to, setTo] = useState(slot?.to || '12:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(to)) return setError('ساعت معتبر وارد کنید.');
    if (from >= to) return setError('ساعت پایان باید بعد از شروع باشد.');
    setSaving(true);
    setError('');
    try {
      await onSave(from, to);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ بازه انجام نشد.');
      setSaving(false);
    }
  }

  return <div role="presentation" style={overlayStyle} onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="worktime-title" onClick={(event) => event.stopPropagation()} style={dialogStyle}>
    <h2 id="worktime-title" style={{ fontSize: 17, marginBottom: 5 }}>{slot ? 'ویرایش' : 'افزودن'} بازهٔ {dayName}</h2>
    <p style={{ margin: '0 0 18px', color: 'var(--ink-3)', fontSize: 12.5 }}>ساعت‌ها بر اساس timezone رسمی سامانه هستند.</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><label style={labelStyle}>از<input type="text" inputMode="numeric" value={toFaDigits(from)} onChange={(event) => setFrom(normalizeTimeInput(event.target.value))} placeholder="۰۸:۰۰" style={inputStyle} /></label><label style={labelStyle}>تا<input type="text" inputMode="numeric" value={toFaDigits(to)} onChange={(event) => setTo(normalizeTimeInput(event.target.value))} placeholder="۱۲:۰۰" style={inputStyle} /></label></div>
    {error && <div role="alert" style={{ padding: 10, borderRadius: 10, color: 'var(--rose)', background: 'var(--clay-bg)', fontSize: 13 }}>{error}</div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}><button type="button" disabled={saving} onClick={onClose} style={secondaryButton}>انصراف</button><button type="button" disabled={saving} onClick={submit} style={{ ...addButton, background: 'var(--olive-600)', color: '#fff', opacity: saving ? .6 : 1 }}>{saving ? 'در حال ذخیره…' : 'ذخیره'}</button></div>
  </section></div>;
}

const addButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: 0, background: 'var(--olive-50)', color: 'var(--olive-700)', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const iconButton: React.CSSProperties = { display: 'grid', placeItems: 'center', border: 0, padding: 2, background: 'transparent', color: 'var(--olive-700)', cursor: 'pointer' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.42)' };
const dialogStyle: React.CSSProperties = { width: 420, maxWidth: '100%', background: '#fff', borderRadius: 20, padding: 24, boxShadow: 'var(--sh-lg)' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1px solid var(--sand-200)', color: 'var(--ink)', background: '#fff' };
const secondaryButton: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, border: 0, background: 'var(--sand-100)', color: 'var(--ink-2s)', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
