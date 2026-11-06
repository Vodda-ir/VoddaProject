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
