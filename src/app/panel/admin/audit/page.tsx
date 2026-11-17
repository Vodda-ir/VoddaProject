'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { DataTable, exportCsv, StatCard, TablePagination } from '@/components/admin/AdminUI';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';
import { formatDateTime } from '@/lib/datetime';

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

const ACTION_BADGE: Record<string, { label: string; tone: string }> = {
  'POST:/api/v1/admin/teachers/:id/review': { label: 'بررسی استاد', tone: 'gold' },
  'PATCH:/api/v1/admin/users/:id/active': { label: 'تغییر دسترسی حساب', tone: 'clay' },
  'PUT:/api/v1/admin/services/:id/approve': { label: 'تأیید خدمت', tone: 'green' },
  'PUT:/api/v1/admin/services/:id/reject': { label: 'رد خدمت', tone: 'rose' },
  'POST:/api/v1/admin/withdrawals/:id/process': { label: 'ثبت وضعیت برداشت', tone: 'info' },
  'PATCH:/api/v1/admin/support/messages/:id/resolve': { label: 'رسیدگی پشتیبانی', tone: 'olive' },
};

function actionMeta(action: string) {
  if (ACTION_BADGE[action]) return ACTION_BADGE[action];
  if (action.includes('teacher')) return { label: 'عملیات استاد', tone: 'gold' };
  if (action.includes('user')) return { label: 'عملیات کاربر', tone: 'clay' };
  if (action.includes('withdrawal')) return { label: 'عملیات مالی', tone: 'info' };
  return { label: 'عملیات مدیریتی', tone: 'muted' };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDateTime(date);
}

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

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="ردیابی عملیات حساس"
        title="گزارش عملیات مدیر"
        description="ثبت تغییرات مدیریتی برای پیگیری رخداد، پاسخ‌گویی و ردیابی درخواست‌ها."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-audit-log',
                  ['شناسه', 'عملیات', 'هدف', 'مدیر', 'زمان', 'شناسه درخواست'],
                  entries.map((entry) => [
                    entry.id,
                    entry.action,
                    `${entry.target_type || 'admin'}#${entry.target_id || 0}`,
                    entry.actor_id,
                    formatDate(entry.created_at),
                    entry.request_id || '',
                  ]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
          </>
        }
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard icon="shield" tone="olive" label="رخدادهای ثبت‌شده" value={loading ? '—' : toFaDigits(total)} hint="تمام تغییرات حساس مدیریتی" />
        <StatCard icon="clock" tone="info" label="ترتیب" value="جدید ← قدیم" hint="۵۰ رخداد در هر صفحه" />
        <StatCard icon="doc" tone="gold" label="شناسه درخواست" value="قابل ردیابی" hint="برای پیگیری در لاگ سرور" />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <DataTable
        columns={[
          {
            key: 'action',
            header: 'عملیات',
            render: (entry) => (
              <div className="adm-cell-main">
                <span className="adm-stat-icon" style={{ width: 36, height: 36, borderRadius: 11 }}>
                  <Icon name="shield" size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 11.5 }} dir="ltr">{entry.action}</strong>
                  <small>{actionMeta(entry.action).label}</small>
                </div>
              </div>
            ),
          },
          {
            key: 'target',
            header: 'هدف',
            width: 150,
            render: (entry) => <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{entry.target_type || 'admin'} {entry.target_id ? `#${toFaDigits(entry.target_id)}` : ''}</span>,
          },
          {
            key: 'actor',
            header: 'مدیر',
            width: 90,
            render: (entry) => <span className="adm-badge" data-tone="olive">#{toFaDigits(entry.actor_id)}</span>,
          },
          {
            key: 'date',
            header: 'زمان',
            width: 170,
            render: (entry) => <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{formatDate(entry.created_at)}</span>,
          },
          {
            key: 'request',
            header: 'شناسه درخواست',
            width: 150,
            render: (entry) => (
              <code dir="ltr" style={{ display: 'block', maxWidth: 150, overflow: 'hidden', color: 'var(--ink-4)', fontSize: 9.5, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.request_id || '—'}
              </code>
            ),
          },
        ]}
        rows={entries}
        loading={loading}
        emptyIcon="shield"
        emptyTitle="هنوز عملیات مدیریتی ثبت نشده"
        emptyDescription="تغییرات حساس (تأیید استاد، برداشت‌ها و…) به‌طور خودکار اینجا ثبت می‌شوند."
      />

      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </main>
  );
}
