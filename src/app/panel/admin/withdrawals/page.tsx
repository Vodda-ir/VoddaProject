'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

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

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState<WithdrawalStatus>('pending');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
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
      await fetchData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت وضعیت برداشت انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="عملیات مالی"
        title="برداشت‌ها"
        description="درخواست‌های برداشت استادان را بررسی کنید. پرداخت‌شده فقط پس از انتقال واقعی بانکی ثبت شود."
        actions={<PanelButton icon="refresh" onClick={() => void fetchData()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-inline-note" style={{ marginBottom: 14, color: '#765918', background: 'var(--gold-bg)' }}>
        <Icon name="info" size={16} />
        <span>تغییر وضعیت در وُدّا جایگزین انتقال بانکی نیست. ابتدا انتقال واقعی را انجام دهید، سپس درخواست را پرداخت‌شده کنید.</span>
      </div>

      <div className="ops-filter-tabs" role="tablist" aria-label="وضعیت برداشت‌ها" style={{ marginBottom: 14 }}>
        {FILTERS.map((item) => (
          <button key={item.value || 'all'} type="button" role="tab" aria-selected={status === item.value} onClick={() => { setStatus(item.value); setPage(0); }}>
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void fetchData()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>{status ? FILTERS.find((item) => item.value === status)?.label : 'همه درخواست‌ها'}</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(total)} درخواست`}</span>
          </div>
          {!loading && total > 0 && <span>صفحه {toFaDigits(page + 1)} از {toFaDigits(pageCount)}</span>}
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری درخواست‌های برداشت…</div>
        ) : withdrawals.length === 0 ? (
          <PanelEmpty icon="wallet" title="درخواستی در این وضعیت وجود ندارد" />
        ) : (
          withdrawals.map((withdrawal) => {
            const currentStatus = withdrawal.status || 'pending';
            const busy = busyId === withdrawal.id;
            return (
              <article className="ops-row" key={withdrawal.id} style={{ opacity: busy ? .55 : 1 }}>
                <Avatar size={44} imageUrl={fullUrl(withdrawal.user?.avatar_url)} />
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{withdrawal.user?.name || 'استاد'}</strong>
                    <PanelStatus status={currentStatus}>{withdrawalStatusLabel(currentStatus)}</PanelStatus>
                  </div>
                  <div className="ops-row-sub">
                    {withdrawal.sheba && <span dir="ltr">{toFaDigits(withdrawal.sheba)}</span>}
                    {!withdrawal.sheba && withdrawal.card && <span dir="ltr">{toFaDigits(withdrawal.card)}</span>}
                    {!withdrawal.sheba && !withdrawal.card && <span>اطلاعات بانکی نمایش‌پذیر نیست</span>}
                  </div>
                  <div className="ops-row-meta">
                    <span style={{ color: 'var(--olive-700)', fontWeight: 800 }}>{formatFaNumber(Number(withdrawal.amount) || 0)} تومان</span>
                    {withdrawal.created_at && <span><Icon name="clock" size={13} />{formatDate(withdrawal.created_at)}</span>}
                    <span>#{toFaDigits(withdrawal.id)}</span>
                  </div>
                </div>

                {currentStatus === 'pending' && (
                  <div className="ops-row-actions">
                    <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void processWithdrawal(withdrawal, false)}>رد و بازگشت وجه</PanelButton>
                    <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void processWithdrawal(withdrawal, true)}>
                      {busy ? 'در حال ثبت…' : 'ثبت پرداخت'}
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

function withdrawalStatusLabel(status: Exclude<WithdrawalStatus, ''>) {
  if (status === 'paid') return 'پرداخت‌شده';
  if (status === 'rejected') return 'ردشده';
  return 'در انتظار پرداخت';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
