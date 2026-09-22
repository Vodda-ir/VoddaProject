'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';

type AuditEntry = {
  id: number;
  actor_id: number;
  action: string;
  target_type: string;
  target_id: number;
  request_id: string;
  metadata?: string;
  created_at: string;
};

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/audit-logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'گزارش عملیات دریافت نشد.');
      setEntries(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'گزارش عملیات دریافت نشد.');
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { void load(); }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="ردیابی عملیات حساس"
        title="گزارش عملیات مدیر"
        description="ثبت تغییرات مدیریتی برای پیگیری رخداد، پاسخ‌گویی و ردیابی درخواست‌ها."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>Audit log</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(total)} رخداد ثبت‌شده`}</span>
          </div>
          {!loading && total > 0 && <span>صفحه {toFaDigits(page + 1)} از {toFaDigits(pageCount)}</span>}
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری گزارش عملیات…</div>
        ) : entries.length === 0 ? (
          <PanelEmpty icon="shield" title="هنوز عملیات مدیریتی ثبت نشده" />
        ) : (
          entries.map((entry) => (
            <article className="ops-row" key={entry.id}>
              <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', flex: '0 0 40px', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                <Icon name="shield" size={18} />
              </span>
              <div className="ops-row-main">
                <div className="ops-row-title"><strong dir="ltr">{entry.action}</strong></div>
                <div className="ops-row-sub">
                  <span>{entry.target_type || 'admin'} {entry.target_id ? `#${toFaDigits(entry.target_id)}` : ''}</span>
                  <span>· مدیر #{toFaDigits(entry.actor_id)}</span>
                </div>
                <div className="ops-row-meta">
                  <span>{formatDate(entry.created_at)}</span>
                  <code dir="ltr" style={{ maxWidth: 330, overflow: 'hidden', color: 'var(--ink-4)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.request_id || '—'}</code>
                </div>
              </div>
            </article>
          ))
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
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}
