'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import {
  DataTable,
  Drawer,
  exportCsv,
  FilterTabs,
  KeyValueRow,
  SearchInput,
  StatCard,
  TablePagination,
} from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

const LIMIT = 30;
type RoleFilter = '' | 'learner' | 'teacher' | 'admin';

type AdminUser = {
  id: number;
  name?: string;
  mobile?: string;
  role?: RoleFilter;
  city?: string;
  bio?: string;
  wallet?: number;
  active?: boolean;
  avatar_url?: string;
  created_at?: string;
  teacher?: { id?: number; status?: string; verified?: boolean } | null;
};

const ROLES: Array<{ value: RoleFilter; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'learner', label: 'قرآن‌آموز' },
  { value: 'teacher', label: 'استاد' },
  { value: 'admin', label: 'ادمین' },
];

const ROLE_BADGE: Record<string, { label: string; tone: string }> = {
  learner: { label: 'قرآن‌آموز', tone: 'info' },
  teacher: { label: 'استاد', tone: 'gold' },
  admin: { label: 'ادمین', tone: 'olive' },
};

function roleLabel(role?: string) {
  return ROLE_BADGE[role ?? 'learner']?.label ?? 'قرآن‌آموز';
}

function faDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<RoleFilter>('');
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);
  const token = getToken();

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(page * LIMIT),
      });
      if (role) sp.set('role', role);
      if (query.trim()) sp.set('q', query.trim());
      const response = await fetch(`/api/backend/admin/users?${sp.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست کاربران دریافت نشد.');
      setUsers(body.data || []);
      setTotal(Number(body.total || 0));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست کاربران دریافت نشد.');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, role, query]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function toggleActive(user: AdminUser) {
    if (!token || busyId !== null) return;
    const next = !user.active;
    const verb = next ? 'فعال' : 'غیرفعال';
    if (!window.confirm(`حساب «${user.name || (user.mobile ? toFaDigits(user.mobile) : 'کاربر')}» ${verb} شود؟`)) return;

    setBusyId(user.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'تغییر وضعیت حساب انجام نشد.');
      setUsers((previous) => previous.map((item) => item.id === user.id ? { ...item, active: next } : item));
      if (selected?.id === user.id) setSelected((current) => (current ? { ...current, active: next } : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر وضعیت حساب انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user: AdminUser, role: RoleFilter) {
    if (!token || busyId !== null || role === user.role) return;
    const label = ROLES.find((item) => item.value === role)?.label || role;
    if (!window.confirm(`نقش «${user.name || 'کاربر'}» به ${label} تغییر کند؟`)) return;

    setBusyId(user.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'تغییر نقش انجام نشد.');
      setUsers((previous) => previous.map((item) => (item.id === user.id ? { ...item, role } : item)));
      if (selected?.id === user.id) setSelected((current) => (current ? { ...current, role } : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر نقش انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function submitAdjust() {
    if (!token || !selected || adjustBusy) return;
    const parsed = Number(adjustAmount.replace(/[^0-9\-]/g, ''));
    if (!Number.isFinite(parsed) || parsed === 0) {
      setError('مبلغ تعدیل را وارد کنید؛ عدد مثبت افزودن و عدد منفی کسر است.');
      return;
    }
    if (!window.confirm(`${parsed > 0 ? 'افزودن' : 'کسر'} ${formatFaNumber(Math.abs(parsed))} تومان ${parsed > 0 ? 'به' : 'از'} کیف پول «${selected.name || 'کاربر'}» ثبت شود؟`)) return;

    setAdjustBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/users/${selected.id}/wallet-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed, reason: adjustReason.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ثبت تعدیل کیف پول انجام نشد.');
      const nextWallet = Number(selected.wallet || 0) + parsed;
      setUsers((previous) => previous.map((item) => (item.id === selected.id ? { ...item, wallet: nextWallet } : item)));
      setSelected((current) => (current && current.id === selected.id ? { ...current, wallet: nextWallet } : current));
      setAdjustAmount('');
      setAdjustReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت تعدیل کیف پول انجام نشد.');
    } finally {
      setAdjustBusy(false);
    }
  }

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="حساب‌ها و دسترسی"
        title="کاربران"
        description="جست‌وجو در حساب‌ها، پایش کیف پول و کنترل دسترسی — بدون دستکاری داده‌های پروفایل."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-users',
                  ['شناسه', 'نام', 'موبایل', 'نقش', 'کیف پول', 'وضعیت', 'تاریخ عضویت'],
                  users.map((user) => [user.id, user.name || '', user.mobile || '', roleLabel(user.role), Number(user.wallet || 0), user.active ? 'فعال' : 'غیرفعال', faDate(user.created_at)]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void fetchUsers()}>به‌روزرسانی</PanelButton>
          </>
        }
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard icon="users" tone="olive" label="حساب‌های این نما" value={loading ? '—' : toFaDigits(total)} hint={role ? roleLabel(role) : 'همه نقش‌ها'} />
        <StatCard
          icon="checkCircle"
          tone="olive"
          label="فعال"
          value={loading ? '—' : toFaDigits(users.filter((user) => user.active).length)}
          hint="در همین صفحه"
        />
        <StatCard
          icon="wallet"
          tone="gold"
          label="مجموع کیف پول صفحه"
          value={loading ? '—' : `${formatFaNumber(users.reduce((sum, user) => sum + Number(user.wallet || 0), 0))} ت`}
          hint="بر اساس داده همین صفحه"
        />
      </div>

      <div className="adm-toolbar">
        <FilterTabs
          ariaLabel="نقش کاربران"
          items={ROLES}
          value={role}
          onChange={(value) => { setRole(value); setPage(0); }}
        />
        <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="جست‌وجوی نام یا شماره موبایل…" />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void fetchUsers()}>تلاش دوباره</PanelButton></div>}

      <DataTable
        columns={[
          {
            key: 'user',
            header: 'کاربر',
            render: (user) => (
              <div className="adm-cell-main">
                <Avatar size={38} imageUrl={fullUrl(user.avatar_url)} />
                <div style={{ minWidth: 0 }}>
                  <strong>{user.name || 'کاربر بدون نام'}</strong>
                  <small dir="ltr">{toFaDigits(user.mobile || '—')}</small>
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'نقش',
            width: 110,
            render: (user) => <span className="adm-badge" data-tone={ROLE_BADGE[user.role ?? 'learner']?.tone}>{roleLabel(user.role)}</span>,
          },
          {
            key: 'wallet',
            header: 'کیف پول',
            width: 120,
            render: (user) => <strong style={{ fontSize: 12 }}>{formatFaNumber(Number(user.wallet || 0))}</strong>,
          },
          {
            key: 'created',
            header: 'عضویت',
            width: 110,
            render: (user) => <span style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>{faDate(user.created_at)}</span>,
          },
          {
            key: 'status',
            header: 'وضعیت',
            width: 100,
            render: (user) => <PanelStatus status={user.active ? 'active' : 'inactive'}>{user.active ? 'فعال' : 'غیرفعال'}</PanelStatus>,
          },
          {
            key: 'actions',
            header: '',
            width: 150,
            align: 'end',
            render: (user) => {
              const busy = busyId === user.id;
              return (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <PanelButton icon="edit" onClick={() => setSelected(user)}>جزئیات</PanelButton>
                  <PanelButton
                    tone={user.active ? 'danger' : 'success'}
                    disabled={busy}
                    onClick={() => void toggleActive(user)}
                  >
                    {busy ? '…' : user.active ? 'غیرفعال' : 'فعال'}
                  </PanelButton>
                </div>
              );
            },
          },
        ]}
        rows={users}
        loading={loading}
        emptyIcon="users"
        emptyTitle="کاربری در این نما وجود ندارد"
        emptyDescription="با تغییر فیلتر نقش یا عبارت جست‌وجو دوباره تلاش کنید."
        onRowClick={(user) => setSelected(user)}
      />

      <TablePagination page={page} pageSize={LIMIT} total={total} onPage={setPage} />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name || 'کاربر بدون نام'}
      >
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 14px' }}>
              <Avatar size={56} imageUrl={fullUrl(selected.avatar_url)} />
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>{selected.name || 'کاربر بدون نام'}</strong>
                <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                  <span className="adm-badge" data-tone={ROLE_BADGE[selected.role ?? 'learner']?.tone}>{roleLabel(selected.role)}</span>
                  <PanelStatus status={selected.active ? 'active' : 'inactive'}>{selected.active ? 'فعال' : 'غیرفعال'}</PanelStatus>
                </div>
              </div>
            </div>
            <KeyValueRow label="شناسه">{toFaDigits(selected.id)}</KeyValueRow>
            <KeyValueRow label="موبایل"><span dir="ltr">{toFaDigits(selected.mobile || '—')}</span></KeyValueRow>
            <KeyValueRow label="شهر">{selected.city || '—'}</KeyValueRow>
            <KeyValueRow label="کیف پول">{formatFaNumber(Number(selected.wallet || 0))} تومان</KeyValueRow>
            <KeyValueRow label="تاریخ عضویت">{faDate(selected.created_at)}</KeyValueRow>
            {selected.teacher?.id && (
              <KeyValueRow label="پروفایل استاد">
                {selected.teacher.status === 'approved' ? 'تأییدشده' : selected.teacher.status === 'pending' ? 'در انتظار بررسی' : 'ردشده'}
              </KeyValueRow>
            )}
            {selected.bio && <KeyValueRow label="بیو">{selected.bio}</KeyValueRow>}

            <section style={{ marginTop: 16, padding: 14, border: '1px solid var(--sand-150)', borderRadius: 15, background: 'var(--surface-warm)' }}>
              <strong style={{ display: 'block', marginBottom: 3, fontSize: 12.5 }}>نقش حساب</strong>
              <p style={{ margin: '0 0 10px', color: 'var(--ink-3)', fontSize: 10.5, lineHeight: 1.9 }}>
                نقش، پنل و دسترسی‌های حساب را تعیین می‌کند. نقش حساب خودتان قابل تغییر نیست.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLES.filter((item) => item.value).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    disabled={busyId === selected.id || selected.role === item.value}
                    onClick={() => void changeRole(selected, item.value)}
                    style={{
                      minHeight: 36, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selected.role === item.value ? 'var(--olive-600)' : 'var(--sand-200)',
                      background: selected.role === item.value ? 'var(--olive-100)' : '#fff',
                      color: selected.role === item.value ? 'var(--olive-700)' : 'var(--ink-2s)',
                      fontFamily: 'inherit', fontSize: 11.5, fontWeight: selected.role === item.value ? 800 : 500,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {busyId === selected.id && <small style={{ display: 'block', marginTop: 8, color: 'var(--olive-700)' }}>در حال ثبت تغییر…</small>}
            </section>

            <section style={{ marginTop: 14, padding: 14, border: '1px solid #ecd5c8', borderRadius: 15, background: 'var(--clay-bg)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 12.5 }}>
                <Icon name="wallet" size={15} style={{ color: 'var(--clay)' }} />
                تعدیل دستی کیف پول
              </strong>
              <p style={{ margin: '0 0 10px', color: 'var(--ink-3)', fontSize: 10.5, lineHeight: 1.9 }}>
                مبلغ مثبت شارژ و مبلغ منفی کسر می‌کند. تراکنش در دفتر مالی کاربر با عنوان «تعدیل دستی» ثبت و در گزارش عملیات لاگ می‌شود.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  value={adjustAmount}
                  onChange={(event) => setAdjustAmount(event.target.value)}
                  placeholder="مثلاً 500000 یا -250000"
                  aria-label="مبلغ تعدیل (تومان)"
                  style={{
                    minHeight: 42, padding: '9px 12px', border: '1px solid var(--sand-200)',
                    borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5, textAlign: 'left',
                  }}
                />
                <input
                  value={adjustReason}
                  onChange={(event) => setAdjustReason(event.target.value)}
                  maxLength={120}
                  placeholder="دلیل تعدیل (اختیاری)"
                  aria-label="دلیل تعدیل"
                  style={{
                    minHeight: 42, padding: '9px 12px', border: '1px solid var(--sand-200)',
                    borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
                  }}
                />
                <PanelButton
                  tone={adjustAmount.trim().startsWith('-') ? 'danger' : 'success'}
                  icon="coins"
                  disabled={adjustBusy || !adjustAmount.trim()}
                  onClick={() => void submitAdjust()}
                >
                  {adjustBusy ? 'در حال ثبت…' : 'ثبت تعدیل'}
                </PanelButton>
              </div>
            </section>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <PanelButton
                tone={selected.active ? 'danger' : 'success'}
                icon={selected.active ? 'x' : 'check'}
                disabled={busyId === selected.id}
                onClick={() => void toggleActive(selected)}
              >
                {busyId === selected.id ? 'در حال ثبت…' : selected.active ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن حساب'}
              </PanelButton>
            </div>
          </>
        )}
      </Drawer>
    </main>
  );
}
