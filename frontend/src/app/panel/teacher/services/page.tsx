'use client';

import { useState, useEffect, useCallback } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

interface ServiceItem {
  id: number;
  title: string;
  duration: number;
  price: number;
  icon: string;
  active: boolean;
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
}

export default function TeacherServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; service: ServiceItem } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const token = getToken();

  const fetchData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/teacher/me', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : { data: {} }))
      .then(j => setServices((j.data?.services || []) as ServiceItem[]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleActive(id: number, active: boolean) {
    if (!token) return;
    await fetch(`/api/v1/teacher/services/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ active: !active }),
    });
    fetchData();
  }

  async function handleDelete(id: number) {
    if (!token) return;
    await fetch(`/api/v1/teacher/services/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    setDeleteTarget(null);
    fetchData();
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800 }}>خدمات من</h1>
        <button
          onClick={() => setDialog({ mode: 'add' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--olive-600)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          خدمت جدید
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>
        خدمات قابل رزرو برای قرآن‌آموزان · خدمت جدید پس از تأیید ادمین فعال می‌شود
      </p>

      {loading ? (
        <div style={{ padding: 28 }}>در حال بارگذاری…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map(s => (
            <div
              key={s.id}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: '1px solid var(--sand-150)',
                boxShadow: 'var(--sh-sm)',
                opacity: s.active ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: 'var(--olive-100)',
                  color: 'var(--olive-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="book" size={23} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</span>
                  {!s.active && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'var(--gold-bg)',
                        color: 'var(--gold)',
                      }}
                    >
                      در انتظار تأیید
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                  {s.duration} دقیقه · {faDigits(s.price)} تومان
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setDialog({ mode: 'edit', service: s })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--sand-100)',
                    color: 'var(--ink-2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="edit" size={13} stroke={2} />
                  ویرایش
                </button>
                <button
                  onClick={() => toggleActive(s.id, s.active)}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: s.active ? 'var(--olive-100)' : 'var(--sand-200)',
                    color: s.active ? 'var(--olive-700)' : 'var(--ink-3)',
                  }}
                >
                  {s.active ? 'فعال' : 'غیرفعال'}
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink-3)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="حذف"
                >
                  <Icon name="trash" size={14} stroke={2} />
                </button>
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
              هنوز خدمتی تعریف نشده
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      {dialog && (
        <ServiceDialog
          service={dialog.mode === 'edit' ? dialog.service : undefined}
          onSave={async (data) => {
            if (dialog.mode === 'add') {
              await fetch('/api/v1/teacher/services', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(data),
              });
            } else {
              await fetch(`/api/v1/teacher/services/${dialog.service.id}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(data),
              });
            }
            setDialog(null);
            fetchData();
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          service={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ── Service Dialog ── */

function ServiceDialog({
  service,
  onSave,
  onClose,
}: {
  service?: ServiceItem;
  onSave: (data: { title: string; duration: number; price: number }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(service?.title ?? '');
  const [duration, setDuration] = useState(String(service?.duration ?? '30'));
  const [price, setPrice] = useState(String(service?.price ?? ''));
  const [saving, setSaving] = useState(false);
  const isEdit = !!service;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const dur = parseInt(duration, 10);
    const prc = parseInt(price, 10);
    if (isNaN(dur) || dur < 5 || dur > 240) return;
    if (isNaN(prc) || prc < 1000) return;
    setSaving(true);
    onSave({ title: title.trim(), duration: dur, price: prc });
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
          maxWidth: '90vw',
          direction: 'rtl',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>
          {isEdit ? 'ویرایش خدمت' : 'خدمت جدید'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
              عنوان خدمت
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثلاً آموزش روخوانی قرآن"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--sand-200)',
                fontSize: 14,
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Duration */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
              مدت زمان (دقیقه)
            </label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={5}
              max={240}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--sand-200)',
                fontSize: 14,
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Price */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
              قیمت (تومان)
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min={1000}
              placeholder="مثلاً ۵۰۰۰۰"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--sand-200)',
                fontSize: 14,
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
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
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--olive-600)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving || !title.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره' : 'افزودن'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirmation Dialog ── */

function DeleteConfirmDialog({
  service,
  onConfirm,
  onClose,
}: {
  service: ServiceItem;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 28,
          width: 360,
          maxWidth: '85vw',
          direction: 'rtl',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Icon name="trash" size={24} stroke={2} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>حذف خدمت</h3>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.8 }}>
          آیا از حذف خدمت <strong>{service.title}</strong> مطمئن هستید؟
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
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
            onClick={onConfirm}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            حذف کن
          </button>
        </div>
      </div>
    </div>
  );
}
