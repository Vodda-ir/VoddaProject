'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';

type SupportStatus = 'new' | 'resolved';

type SupportMessage = {
  id: number;
  name: string;
  contact: string;
  message: string;
  status: SupportStatus;
  created_at: string;
  resolved_at?: string;
};

const PAGE_SIZE = 30;

export default function AdminSupportPage() {
  const [status, setStatus] = useState<SupportStatus>('new');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        status,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      const response = await fetch(`/api/backend/admin/support/messages?${sp.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'پیام‌های پشتیبانی دریافت نشدند.');
      setMessages(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'پیام‌های پشتیبانی دریافت نشدند.');
      setMessages([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, page, token]);

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
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت رسیدگی انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="ارتباط با کاربران"
        title="پیام‌های پشتیبانی"
        description="پیام‌های فرم تماس عمومی را بررسی و پس از پیگیری واقعی به‌عنوان رسیدگی‌شده ثبت کنید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-filter-tabs" role="tablist" aria-label="وضعیت پیام‌ها" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={status === 'new'} onClick={() => { setStatus('new'); setPage(0); }}>جدید</button>
        <button type="button" role="tab" aria-selected={status === 'resolved'} onClick={() => { setStatus('resolved'); setPage(0); }}>رسیدگی‌شده</button>
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>{status === 'new' ? 'پیام‌های جدید' : 'پیام‌های رسیدگی‌شده'}</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(total)} پیام`}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری پیام‌ها…</div>
        ) : messages.length === 0 ? (
          <PanelEmpty icon="message" title="پیامی در این وضعیت وجود ندارد" />
        ) : (
          messages.map((item) => {
            const busy = busyId === item.id;
            return (
              <article className="ops-row" key={item.id} style={{ alignItems: 'flex-start', opacity: busy ? .55 : 1 }}>
                <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', flex: '0 0 42px', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                  <Icon name="message" size={19} />
                </span>
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{item.name}</strong>
                    <PanelStatus status={item.status === 'new' ? 'pending' : 'done'}>{item.status === 'new' ? 'جدید' : 'رسیدگی‌شده'}</PanelStatus>
                  </div>
                  <div className="ops-row-sub">
                    <span dir="ltr">{toFaDigits(item.contact)}</span>
                    <span>· {formatDate(item.created_at)}</span>
                  </div>
                  <p style={{ margin: '9px 0 0', padding: '10px 12px', borderRadius: 11, color: 'var(--ink-2s)', background: 'var(--sand-50)', fontSize: 11.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                </div>
                {item.status === 'new' && (
                  <div className="ops-row-actions">
                    <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void resolve(item)}>
                      {busy ? 'در حال ثبت…' : 'ثبت رسیدگی'}
                    </PanelButton>
                  </div>
                )}
              </article>
            );
          })
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="ops-pagination">
            <PanelButton disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>صفحه قبل</PanelButton>
            <span>{toFaDigits(page * PAGE_SIZE + 1)} تا {toFaDigits(Math.min((page + 1) * PAGE_SIZE, total))} از {toFaDigits(total)}</span>
            <PanelButton disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>صفحه بعد</PanelButton>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
