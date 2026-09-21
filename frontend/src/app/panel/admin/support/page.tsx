'use client';

import { toFaDigits } from '@/lib/persian';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

type SupportMessage = {
  id: number;
  name: string;
  contact: string;
  message: string;
  status: 'new' | 'resolved';
  created_at: string;
  resolved_at?: string;
};

export default function AdminSupportPage() {
  const [status, setStatus] = useState<'new' | 'resolved'>('new');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/support/messages?status=${status}&limit=100`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'پیام‌های پشتیبانی دریافت نشدند.');
      setMessages(body.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'پیام‌های پشتیبانی دریافت نشدند.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => { void load(); }, [load]);

  async function resolve(message: SupportMessage) {
    if (busyId !== null || message.status !== 'new') return;
    if (!window.confirm('این پیام به‌عنوان رسیدگی‌شده ثبت شود؟')) return;
    setBusyId(message.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/support/messages/${message.id}/resolve`, { method: 'PATCH' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ثبت رسیدگی انجام نشد.');
      setMessages((previous) => previous.filter((item) => item.id !== message.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت رسیدگی انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>پیام‌های پشتیبانی</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>پیام‌های ثبت‌شده از فرم تماس عمومی</p>

      <div role="tablist" aria-label="وضعیت پیام‌ها" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['new', 'resolved'] as const).map((value) => (
          <button key={value} role="tab" aria-selected={status === value} onClick={() => setStatus(value)} style={{ padding: '9px 18px', border: 0, borderRadius: 12, background: status === value ? 'var(--olive-600)' : '#fff', color: status === value ? '#fff' : 'var(--ink-3)', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--sh-sm)' }}>
            {value === 'new' ? 'جدید' : 'رسیدگی‌شده'}
          </button>
        ))}
      </div>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}
      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((item) => (
            <article key={item.id} style={{ background: '#fff', borderRadius: 18, padding: 18, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="message" size={21} /></div>
                <div style={{ flex: '1 1 220px' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{item.name}</h2>
                  <div dir="ltr" style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, textAlign: 'right' }}>{toFaDigits(item.contact)}</div>
                </div>
                <time dateTime={item.created_at} style={{ fontSize: 12, color: 'var(--ink-4)' }}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</time>
              </div>
              <p style={{ margin: '16px 0 0', padding: 14, borderRadius: 14, background: 'var(--sand-50)', color: 'var(--ink-2s)', lineHeight: 2, whiteSpace: 'pre-wrap' }}>{item.message}</p>
              {item.status === 'new' && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><button type="button" disabled={busyId === item.id} onClick={() => resolve(item)} style={{ padding: '9px 16px', border: 0, borderRadius: 12, background: 'var(--olive-600)', color: '#fff', fontWeight: 700, cursor: busyId === item.id ? 'wait' : 'pointer' }}>{busyId === item.id ? 'در حال ثبت…' : 'ثبت رسیدگی'}</button></div>}
            </article>
          ))}
          {messages.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: 'var(--ink-3)' }}>پیامی در این وضعیت وجود ندارد.</div>}
        </div>
      )}
    </main>
  );
}
