'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سهشنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

interface WorkSlot {
  id?: number;
  weekday: number;
  from: string;
  to: string;
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
}

export default function TeacherWorkTimesPage() {
  const [workTimes, setWorkTimes] = useState<Record<number, WorkSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<{
    weekday: number;
    slot?: WorkSlot; // undefined = adding, defined = editing
  } | null>(null);
  const token = getToken();

  const fetchData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/teacher/work-times', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(j => {
        const grouped: Record<number, WorkSlot[]> = {};
        ((j.data ?? []) as any[]).forEach((w: any) => {
          const d = w.weekday as number;
          if (!grouped[d]) grouped[d] = [];
          grouped[d].push({ id: w.id, weekday: d, from: w.from, to: w.to });
        });
        setWorkTimes(grouped);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (weekday: number, from: string, to: string) => {
    const key = `add-${weekday}`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const res = await fetch('/api/v1/teacher/work-times', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ weekday, from, to }),
      });
      if (res.ok) {
        setDialog(null);
        fetchData();
      }
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  const handleUpdate = async (slot: WorkSlot, from: string, to: string) => {
    const key = `upd-${slot.id}`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const res = await fetch(`/api/v1/teacher/work-times/${slot.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ weekday: slot.weekday, from, to }),
      });
      if (res.ok) {
        setDialog(null);
        fetchData();
      }
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  const handleDelete = async (slot: WorkSlot) => {
    const key = `del-${slot.id}`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await fetch(`/api/v1/teacher/work-times/${slot.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      fetchData();
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>زمان‌های کاری</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>
        روزها و ساعت‌هایی که برای برگزاری جلسه در دسترس هستید
      </p>

      {loading ? (
        <div style={{ padding: 28 }}>در حال بارگذاری…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map((day, i) => {
            const ranges = workTimes[i] || [];
            const active = ranges.length > 0;
            return (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid var(--sand-150)',
                  boxShadow: 'var(--sh-sm)',
                }}
              >
                {/* Day header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: active ? 12 : 0,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: active ? 'var(--olive-100)' : 'var(--sand-100)',
                      color: active ? 'var(--olive-700)' : 'var(--ink-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="clock" size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: active ? 'var(--ink)' : 'var(--ink-3)',
                      }}
                    >
                      {day}
                    </div>
                    {!active && (
                      <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 3 }}>
                        تعطیل
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDialog({ weekday: i })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 999,
                      border: 'none',
                      background: 'var(--olive-50)',
                      color: 'var(--olive-700)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                    افزودن بازه
                  </button>
                </div>

                {/* Slots */}
                {active && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ranges.map((slot, si) => {
                      const busy = saving[`del-${slot.id}`] || saving[`upd-${slot.id}`];
                      return (
                        <div
                          key={slot.id ?? si}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 999,
                            background: 'var(--olive-50)',
                            color: 'var(--olive-700)',
                            fontSize: 12,
                            fontWeight: 600,
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          <Icon name="clock" size={14} stroke={2} style={{ flexShrink: 0 }} />
                          <span>{slot.from} تا {slot.to}</span>
                          <button
                            onClick={() => setDialog({ weekday: i, slot })}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 2,
                              cursor: 'pointer',
                              color: 'var(--olive-600)',
                              display: 'flex',
                            }}
                            title="ویرایش"
                          >
                            <Icon name="edit" size={13} stroke={2} />
                          </button>
                          <button
                            onClick={() => handleDelete(slot)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 2,
                              cursor: 'pointer',
                              color: 'var(--ink-3)',
                              display: 'flex',
                            }}
                            title="حذف"
                          >
                            <Icon name="x" size={13} stroke={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      {dialog && (
        <TimeRangeDialog
          weekday={dialog.weekday}
          dayName={DAYS[dialog.weekday]}
          slot={dialog.slot}
          saving={dialog.slot ? saving[`upd-${dialog.slot.id}`] : saving[`add-${dialog.weekday}`]}
          onSave={(from, to) => {
            if (dialog.slot) {
              handleUpdate(dialog.slot, from, to);
            } else {
              handleAdd(dialog.weekday, from, to);
            }
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

/* ── Dialog Component ── */

function TimeRangeDialog({
  weekday,
  dayName,
  slot,
  saving,
  onSave,
  onClose,
}: {
  weekday: number;
  dayName: string;
  slot?: WorkSlot;
  saving?: boolean;
  onSave: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(slot?.from ?? '08:00');
  const [to, setTo] = useState(slot?.to ?? '20:00');
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!slot;

  const validate = (f: string, t: string): string | null => {
    const [fh, fm] = f.split(':').map(Number);
    const [th, tm] = t.split(':').map(Number);
    if (isNaN(fh) || isNaN(fm) || isNaN(th) || isNaN(tm)) return 'ساعت نامعتبر';
    if (fh < 0 || fh > 23 || fm < 0 || fm > 59 || th < 0 || th > 23 || tm < 0 || tm > 59)
      return 'ساعت باید بین ۰۰:۰۰ تا ۲۳:۵۹ باشد';
    if (fh * 60 + fm >= th * 60 + tm) return 'ساعت پایان باید بعد از شروع باشد';
    return null;
  };

  const handleSave = () => {
    const err = validate(from, to);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSave(from, to);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 28,
          width: 400,
          maxWidth: '92vw',
          direction: 'rtl',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
          {isEdit ? 'ویرایش' : 'افزودن'} بازه - {dayName}
        </h3>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
          <TimeField label="از" value={from} onChange={v => { setFrom(v); setError(null); }} />
          <span
            style={{
              alignSelf: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink-3)',
              marginTop: 20,
            }}
          >
            تا
          </span>
          <TimeField label="تا" value={to} onChange={v => { setTo(v); setError(null); }} />
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#fef2f2',
              borderRadius: 10,
              color: '#dc2626',
              fontSize: 12.5,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            background: 'var(--olive-50)',
            borderRadius: 12,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--olive-700)',
          }}
        >
          {from} تا {to}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--sand-100)',
              color: 'var(--ink-3)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            انصراف
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--olive-600)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره' : 'افزودن'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const handleChange = (raw: string) => {
    // فقط اعداد و دونقطه قبول کن
    const cleaned = raw.replace(/[^0-9:]/g, '');
    // خودکار دو نقطه بذار بین ساعت و دقیقه
    if (/^\d{2}$/.test(cleaned) && !cleaned.includes(':') && value.length < cleaned.length) {
      onChange(cleaned + ':');
      return;
    }
    onChange(cleaned);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--ink-3)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder="۰۰:۰۰"
        maxLength={5}
        style={{
          padding: '10px 8px',
          borderRadius: 12,
          border: '1.5px solid var(--olive-200)',
          background: 'var(--olive-50)',
          color: 'var(--olive-700)',
          fontSize: 16,
          fontWeight: 700,
          outline: 'none',
          textAlign: 'center',
          width: 100,
          boxSizing: 'border-box',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 2,
        }}
      />
    </div>
  );
}
