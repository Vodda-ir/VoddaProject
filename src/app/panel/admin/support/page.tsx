'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { FilterTabs, StatCard, TablePagination } from '@/components/admin/AdminUI';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';
import { formatDateTime } from '@/lib/datetime';

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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDateTime(date);
}

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

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="ارتباط با کاربران"
        title="پیام‌های پشتیبانی"
        description="پیام‌های فرم تماس عمومی را بررسی و پس از پیگیری واقعی به‌عنوان رسیدگی‌شده ثبت کنید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard
          icon="message"
          tone={status === 'new' ? 'gold' : 'olive'}
          label={status === 'new' ? 'پیام‌های جدید' : 'پیام‌های رسیدگی‌شده'}
          value={loading ? '—' : toFaDigits(total)}
          hint={status === 'new' ? 'منتظر پیگیری شما' : 'بایگانی پیگیری‌ها'}
        />
        <StatCard icon="clock" tone="info" label="اولویت" value="جدید ← قدیم" hint="پیام‌های تازه در بالای فهرست" />
        <StatCard icon="shield" tone="rose" label="حریم خصوصی" value="محرمانه" hint="اطلاعات تماس فقط برای پیگیری" />
      </div>

      <div className="adm-toolbar">
        <FilterTabs
          ariaLabel="وضعیت پیام‌ها"
          items={[
            { value: 'new' as SupportStatus, label: 'جدید' },
            { value: 'resolved' as SupportStatus, label: 'رسیدگی‌شده' },
          ]}
          value={status}
          onChange={(value) => { setStatus(value); setPage(0); }}
        />
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
          <div style={{ padding: 20, display: 'grid', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="adm-skeleton" style={{ height: 74, borderRadius: 14 }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <PanelEmpty icon="message" title="پیامی در این وضعیت وجود ندارد" />
        ) : (
          messages.map((item) => {
            const busy = busyId === item.id;
            return (
              <article className="ops-row" key={item.id} style={{ alignItems: 'flex-start', opacity: busy ? .55 : 1 }}>
                <span className="adm-stat-icon" style={{ width: 42, height: 42, borderRadius: 12 }}>
                  <Icon name="message" size={19} />
                </span>
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{item.name}</strong>
                    <span className="adm-badge" data-tone={item.status === 'new' ? 'gold' : 'green'}>{item.status === 'new' ? 'جدید' : 'رسیدگی‌شده'}</span>
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
          <div style={{ padding: '4px 14px 16px' }}>
            <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
          </div>
        )}
      </section>
    </main>
  );
}
