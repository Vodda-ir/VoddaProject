'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import {
  DataTable,
  Drawer,
  exportCsv,
  FilterTabs,
  KeyValueRow,
  StatCard,
  TablePagination,
} from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { formatDateTime } from '@/lib/datetime';

type WithdrawalStatus = '' | 'pending' | 'paid' | 'rejected';

type Withdrawal = {
  id: number;
  amount?: number;
  card?: string;
  sheba?: string;
  status?: Exclude<WithdrawalStatus, ''>;
  created_at?: string;
  user?: { name?: string; avatar_url?: string };
};

const PAGE_SIZE = 30;
const FILTERS: Array<{ value: WithdrawalStatus; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'paid', label: 'پرداخت‌شده' },
  { value: 'rejected', label: 'ردشده' },
];

const STATUS_BADGE: Record<string, { label: string; tone: string }> = {
  pending: { label: 'در انتظار پرداخت', tone: 'gold' },
  paid: { label: 'پرداخت‌شده', tone: 'green' },
  rejected: { label: 'ردشده', tone: 'rose' },
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDateTime(date);
}

function bankAccount(withdrawal: Withdrawal): string {
  return withdrawal.sheba || withdrawal.card || '';
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState<WithdrawalStatus>('pending');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const token = getToken();

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (status) sp.set('status', status);
      const response = await fetch(`/api/backend/admin/withdrawals?${sp.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'درخواست‌های برداشت دریافت نشدند.');
      setWithdrawals(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'درخواست‌های برداشت دریافت نشدند.');
      setWithdrawals([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function processWithdrawal(withdrawal: Withdrawal, paid: boolean) {
    if (!token || busyId !== null || withdrawal.status !== 'pending') return;
    const warning = paid
      ? 'فقط پس از انجام واقعی انتقال بانکی، وضعیت را پرداخت‌شده کنید. ادامه می‌دهید؟'
      : 'با رد درخواست، مبلغ رزروشده به کیف پول استاد بازمی‌گردد. ادامه می‌دهید؟';
    if (!window.confirm(warning)) return;

    setBusyId(withdrawal.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/withdrawals/${withdrawal.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ثبت وضعیت برداشت انجام نشد.');
      setSelected(null);
      await fetchData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت وضعیت برداشت انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const pagePendingAmount = withdrawals
    .filter((withdrawal) => (withdrawal.status || 'pending') === 'pending')
    .reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="عملیات مالی"
        title="برداشت‌ها"
        description="درخواست‌های برداشت استادان را بررسی کنید. پرداخت‌شده فقط پس از انتقال واقعی بانکی ثبت شود."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-withdrawals',
                  ['شناسه', 'استاد', 'مبلغ (تومان)', 'شبا/کارت', 'وضعیت', 'تاریخ درخواست'],
                  withdrawals.map((withdrawal) => [
                    withdrawal.id,
                    withdrawal.user?.name || '',
                    Number(withdrawal.amount || 0),
                    bankAccount(withdrawal),
                    STATUS_BADGE[withdrawal.status || 'pending']?.label ?? '',
                    formatDate(withdrawal.created_at),
                  ]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void fetchData()}>به‌روزرسانی</PanelButton>
          </>
        }
      />

      <div className="ops-inline-note" style={{ marginBottom: 14, color: '#765918', background: 'var(--gold-bg)' }}>
        <Icon name="info" size={16} />
        <span>تغییر وضعیت در وُدّا جایگزین انتقال بانکی نیست. ابتدا انتقال واقعی را انجام دهید، سپس درخواست را پرداخت‌شده کنید.</span>
      </div>

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard icon="wallet" tone="gold" label="درخواست‌های این نما" value={loading ? '—' : toFaDigits(total)} hint={status ? STATUS_BADGE[status]?.label : 'همه وضعیت‌ها'} />
        <StatCard icon="coins" tone="clay" label="مبلغ در انتظار صفحه" value={loading ? '—' : `${formatFaNumber(pagePendingAmount)} ت`} hint="جمع درخواست‌های pending همین صفحه" />
        <StatCard icon="checkCircle" tone="olive" label="راهنما" value="انتقال ← ثبت" hint="ابتدا انتقال بانکی، سپس ثبت وضعیت" />
      </div>

      <div className="adm-toolbar">
        <FilterTabs
          ariaLabel="وضعیت برداشت‌ها"
          items={FILTERS}
          value={status}
          onChange={(value) => { setStatus(value); setPage(0); }}
        />
      </div>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void fetchData()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'teacher',
            header: 'استاد',
            render: (withdrawal) => (
              <div className="adm-cell-main">
                <Avatar size={40} imageUrl={fullUrl(withdrawal.user?.avatar_url)} />
                <div style={{ minWidth: 0 }}>
                  <strong>{withdrawal.user?.name || 'استاد'}</strong>
                  <small>#{toFaDigits(withdrawal.id)}</small>
                </div>
              </div>
            ),
          },
          {
            key: 'amount',
            header: 'مبلغ',
            width: 140,
            render: (withdrawal) => <strong style={{ color: 'var(--olive-700)', fontSize: 12.5 }}>{formatFaNumber(Number(withdrawal.amount || 0))} تومان</strong>,
          },
          {
            key: 'bank',
            header: 'شبا / کارت',
            width: 200,
            render: (withdrawal) => {
              const account = bankAccount(withdrawal);
              return account
                ? <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--ink-3)' }}>{toFaDigits(account)}</span>
                : <span style={{ color: 'var(--ink-4)', fontSize: 10.5 }}>—</span>;
            },
          },
          {
            key: 'date',
            header: 'تاریخ درخواست',
            width: 160,
            render: (withdrawal) => <span style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>{formatDate(withdrawal.created_at)}</span>,
          },
          {
            key: 'status',
            header: 'وضعیت',
            width: 130,
            render: (withdrawal) => (
              <span className="adm-badge" data-tone={STATUS_BADGE[withdrawal.status || 'pending']?.tone}>
                {STATUS_BADGE[withdrawal.status || 'pending']?.label}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            width: 230,
            align: 'end',
            render: (withdrawal) => {
              const current = withdrawal.status || 'pending';
              const busy = busyId === withdrawal.id;
              if (current !== 'pending') {
                return (
                  <PanelButton icon="doc" onClick={() => setSelected(withdrawal)}>جزئیات</PanelButton>
                );
              }
              return (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void processWithdrawal(withdrawal, false)}>رد و بازگشت</PanelButton>
                  <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void processWithdrawal(withdrawal, true)}>
                    {busy ? 'در حال ثبت…' : 'ثبت پرداخت'}
                  </PanelButton>
                </div>
              );
            },
          },
        ]}
        rows={withdrawals}
        loading={loading}
        emptyIcon="wallet"
        emptyTitle="درخواستی در این وضعیت وجود ندارد"
        onRowClick={(withdrawal) => setSelected(withdrawal)}
      />

      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected?.user?.name || 'جزئیات برداشت'}>
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 14px' }}>
              <Avatar size={54} imageUrl={fullUrl(selected.user?.avatar_url)} />
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--olive-700)' }}>{formatFaNumber(Number(selected.amount || 0))} تومان</strong>
                <span className="adm-badge" data-tone={STATUS_BADGE[selected.status || 'pending']?.tone} style={{ marginTop: 5 }}>
                  {STATUS_BADGE[selected.status || 'pending']?.label}
                </span>
              </div>
            </div>
            <KeyValueRow label="شناسه درخواست">#{toFaDigits(selected.id)}</KeyValueRow>
            <KeyValueRow label="شبا"><span dir="ltr">{selected.sheba ? toFaDigits(selected.sheba) : '—'}</span></KeyValueRow>
            <KeyValueRow label="شماره کارت"><span dir="ltr">{selected.card ? toFaDigits(selected.card) : '—'}</span></KeyValueRow>
            <KeyValueRow label="تاریخ درخواست">{formatDate(selected.created_at)}</KeyValueRow>
            {selected.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <PanelButton tone="danger" icon="x" disabled={busyId === selected.id} onClick={() => void processWithdrawal(selected, false)}>رد و بازگشت وجه</PanelButton>
                <PanelButton tone="success" icon="check" disabled={busyId === selected.id} onClick={() => void processWithdrawal(selected, true)}>
                  {busyId === selected.id ? 'در حال ثبت…' : 'ثبت پرداخت'}
                </PanelButton>
              </div>
            )}
          </>
        )}
      </Drawer>

      {withdrawals.length === 0 && !loading && (
        <div style={{ marginTop: 14 }}>
          <PanelEmpty icon="wallet" title="چیزی برای نمایش نیست" description="با تغییر فیلتر وضعیت، درخواست‌های دیگر را ببینید." />
        </div>
      )}
    </main>
  );
}
