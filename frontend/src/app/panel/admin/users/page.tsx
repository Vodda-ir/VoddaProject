'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { confirmDialog } from '@/lib/confirm';

const LIMIT = 30;
type RoleFilter = '' | 'learner' | 'teacher' | 'admin';
type ActiveFilter = '' | 'active' | 'inactive';
type SortKey = 'newest' | 'oldest' | 'wallet-high' | 'wallet-low' | 'name';

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
  updated_at?: string;
  teacher?: {
    id?: number;
    status?: string;
    verified?: boolean;
    field?: string;
    tier?: string;
    rating?: number;
    reviews?: number;
    sessions?: number;
  } | null;
};

type DetailTx = { id: number; type: string; title: string; amount: number; created_at: string };

type DetailSession = {
  id: number;
  service?: string;
  scheduled_at: string;
  duration?: number;
  price?: number;
  status: string;
  learner?: { id?: number; name?: string; avatar_url?: string } | null;
  teacher?: { id?: number; user?: { name?: string; avatar_url?: string } | null } | null;
};

type DetailReview = {
  id: number;
  rating: number;
  text?: string;
  created_at: string;
  learner?: { id?: number; name?: string; avatar_url?: string } | null;
};

type AdminUserDetailData = {
  user: AdminUser;
  stats: { as_learner: number; learner_done: number; as_teacher: number; teacher_done: number; upcoming: number };
  sums: { charge: number; session: number; earning: number; withdrawal: number; commission: number; adjust: number };
  transactions: DetailTx[];
  sessions: DetailSession[];
  reviews: DetailReview[];
  reviews_count: number;
};

const ROLES: Array<{ value: RoleFilter; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'learner', label: 'قرآن‌آموز' },
  { value: 'teacher', label: 'استاد' },
  { value: 'admin', label: 'ادمین' },
];

const ACTIVE_TABS: Array<{ value: ActiveFilter; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
];

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'جدیدترین عضویت' },
  { value: 'oldest', label: 'قدیمی‌ترین عضویت' },
  { value: 'wallet-high', label: 'بیشترین موجودی' },
  { value: 'wallet-low', label: 'کم‌ترین موجودی' },
  { value: 'name', label: 'ترتیب نام' },
];

const ROLE_BADGE: Record<string, { label: string; tone: string }> = {
  learner: { label: 'قرآن‌آموز', tone: 'info' },
  teacher: { label: 'استاد', tone: 'gold' },
  admin: { label: 'ادمین', tone: 'olive' },
};

const TX_META: Record<string, { label: string; icon: 'coins' | 'video' | 'trending' | 'download' | 'x' | 'info'; credit: boolean }> = {
  charge: { label: 'شارژ کیف پول', icon: 'coins', credit: true },
  session: { label: 'پرداخت جلسه', icon: 'video', credit: false },
  earning: { label: 'درآمد جلسه', icon: 'trending', credit: true },
  withdrawal: { label: 'برداشت', icon: 'download', credit: false },
  commission: { label: 'کارمزد سامانه', icon: 'x', credit: false },
  adjust: { label: 'اصلاحیه حساب', icon: 'info', credit: true },
};

const SESSION_BADGE: Record<string, { label: string; status: 'active' | 'pending' | 'inactive' | 'canceled' }> = {
  pending: { label: 'در انتظار تأیید', status: 'pending' },
  confirmed: { label: 'تأییدشده', status: 'active' },
  done: { label: 'برگزارشده', status: 'inactive' },
  canceled: { label: 'لغوشده', status: 'canceled' },
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

function faDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    const day = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(new Date(iso));
    const time = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    return `${day} · ${time}`;
  } catch {
    return '—';
  }
}

function teacherStatusLabel(status?: string): string {
  if (status === 'approved') return 'تأییدشده';
  if (status === 'pending') return 'در انتظار بررسی';
  if (status === 'rejected') return 'ردشده';
  return '—';
}

type DrawerTab = 'sessions' | 'transactions' | 'reviews';

function DrawerTabs({ value, onChange, counts }: { value: DrawerTab; onChange: (value: DrawerTab) => void; counts: Record<DrawerTab, number> }) {
  const items: Array<{ value: DrawerTab; label: string }> = [
    { value: 'sessions', label: 'جلسات' },
    { value: 'transactions', label: 'تراکنش‌ها' },
    { value: 'reviews', label: 'نظرها' },
  ];
  return (
    <div className="adm-drawer-tabs" role="tablist" aria-label="سابقه کاربر">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          data-active={value === item.value ? 'true' : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          <span>{toFaDigits(counts[item.value])}</span>
        </button>
      ))}
    </div>
  );
}

function MiniStat({ icon, label, value, tone = 'olive' }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; value: string | number; tone?: string }) {
  return (
    <div className="adm-mini-stat" data-tone={tone}>
      <span className="adm-mini-stat-icon"><Icon name={icon} size={15} /></span>
      <div>
        <strong>{typeof value === 'number' ? toFaDigits(value) : value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<RoleFilter>('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detail, setDetail] = useState<AdminUserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DrawerTab>('sessions');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
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
      if (activeFilter) sp.set('active', activeFilter === 'active' ? 'true' : 'false');
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
  }, [token, page, role, activeFilter, query]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const sortedUsers = useMemo(() => {
    const rows = [...users];
    switch (sort) {
      case 'oldest':
        return rows.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      case 'wallet-high':
        return rows.sort((a, b) => Number(b.wallet || 0) - Number(a.wallet || 0));
      case 'wallet-low':
        return rows.sort((a, b) => Number(a.wallet || 0) - Number(b.wallet || 0));
      case 'name':
        return rows.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fa'));
      default:
        return rows;
    }
  }, [users, sort]);

  async function loadDetail(user: AdminUser) {
    if (!token) return;
    setDetail(null);
    setDetailLoading(true);
    setDetailTab('sessions');
    setNotifyTitle('');
    setNotifyBody('');
    setNotifyDone(false);
    setAdjustAmount('');
    setAdjustReason('');
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'جزئیات کاربر دریافت نشد.');
      setDetail(body.data as AdminUserDetailData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'جزئیات کاربر دریافت نشد.');
    } finally {
      setDetailLoading(false);
    }
  }

  function openUser(user: AdminUser) {
    setSelected(user);
    void loadDetail(user);
  }

  function patchSelected(patch: Partial<AdminUser>) {
    setSelected((current) => (current ? { ...current, ...patch } : current));
    if (selected) {
      const id = selected.id;
      setUsers((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    }
  }

  async function toggleActive(user: AdminUser) {
    if (!token || busyId !== null) return;
    const next = !user.active;
    const verb = next ? 'فعال' : 'غیرفعال';
    if (!(await confirmDialog(`حساب «${user.name || (user.mobile ? toFaDigits(user.mobile) : 'کاربر')}» ${verb} شود؟`))) return;

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
      patchSelected({ active: next });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر وضعیت حساب انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user: AdminUser, role: RoleFilter) {
    if (!token || busyId !== null || role === user.role) return;
    const label = ROLES.find((item) => item.value === role)?.label || role;
    if (!(await confirmDialog(`نقش «${user.name || 'کاربر'}» به ${label} تغییر کند؟`))) return;

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
      patchSelected({ role });
      if (selected?.id === user.id) void loadDetail(user);
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
    if (!(await confirmDialog(`${parsed > 0 ? 'افزودن' : 'کسر'} ${formatFaNumber(Math.abs(parsed))} تومان ${parsed > 0 ? 'به' : 'از'} کیف پول «${selected.name || 'کاربر'}» ثبت شود؟`))) return;

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
      patchSelected({ wallet: nextWallet });
      setAdjustAmount('');
      setAdjustReason('');
      void loadDetail(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت تعدیل کیف پول انجام نشد.');
    } finally {
      setAdjustBusy(false);
    }
  }

  async function submitNotify() {
    if (!token || !selected || notifyBusy) return;
    if (!notifyTitle.trim() || !notifyBody.trim()) {
      setError('عنوان و متن اعلان را وارد کنید.');
      return;
    }
    setNotifyBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/users/${selected.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifyTitle.trim(), body: notifyBody.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ارسال اعلان انجام نشد.');
      setNotifyTitle('');
      setNotifyBody('');
      setNotifyDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ارسال اعلان انجام نشد.');
    } finally {
      setNotifyBusy(false);
    }
  }

  const detailUser = detail?.user ?? selected;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="حساب‌ها و دسترسی"
        title="مدیریت کاربران"
        description="جست‌وجو، فیلتر، جزئیات کامل هر حساب، تعدیل کیف پول، ارسال اعلان و کنترل دسترسی — همه در یک نما."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  'vodda-users',
                  ['شناسه', 'نام', 'موبایل', 'نقش', 'کیف پول', 'وضعیت', 'تاریخ عضویت'],
                  sortedUsers.map((user) => [user.id, user.name || '', user.mobile || '', roleLabel(user.role), Number(user.wallet || 0), user.active ? 'فعال' : 'غیرفعال', faDate(user.created_at)]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void fetchUsers()}>به‌روزرسانی</PanelButton>
          </>
        }
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon="users" tone="olive" label="حساب‌های این نما" value={loading ? '—' : toFaDigits(total)} hint={role ? roleLabel(role) : 'همه نقش‌ها'} />
        <StatCard
          icon="checkCircle"
          tone="olive"
          label="فعال"
          value={loading ? '—' : toFaDigits(users.filter((user) => user.active).length)}
          hint="در همین صفحه"
        />
        <StatCard
          icon="x"
          tone="clay"
          label="غیرفعال"
          value={loading ? '—' : toFaDigits(users.filter((user) => !user.active).length)}
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
        <FilterTabs
          ariaLabel="وضعیت حساب"
          items={ACTIVE_TABS}
          value={activeFilter}
          onChange={(value) => { setActiveFilter(value); setPage(0); }}
        />
        <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="جست‌وجوی نام یا شماره موبایل…" />
        <label className="adm-select">
          <span>ترتیب:</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="ترتیب نمایش">
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void fetchUsers()}>تلاش دوباره</PanelButton></div>}

      {/* Desktop table */}
      <div className="adm-users-table">
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
              render: (user) => (
                <span className="adm-badge" data-tone={ROLE_BADGE[user.role ?? 'learner']?.tone}>{roleLabel(user.role)}</span>
              ),
            },
            {
              key: 'teacher',
              header: 'استادی',
              width: 120,
              render: (user) => (
                user.teacher?.id
                  ? <span className="adm-badge" data-tone={user.teacher.status === 'approved' ? 'olive' : user.teacher.status === 'pending' ? 'gold' : 'rose'}>{teacherStatusLabel(user.teacher.status)}</span>
                  : <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>—</span>
              ),
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
                    <PanelButton icon="edit" onClick={() => openUser(user)}>جزئیات</PanelButton>
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
          rows={sortedUsers}
          loading={loading}
          emptyIcon="users"
          emptyTitle="کاربری در این نما وجود ندارد"
          emptyDescription="با تغییر فیلتر نقش یا عبارت جست‌وجو دوباره تلاش کنید."
          onRowClick={(user) => openUser(user)}
        />
      </div>

      {/* Mobile cards */}
      <div className="adm-users-cards" aria-hidden={false}>
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`sk-${index}`} className="adm-skeleton" style={{ height: 92, borderRadius: 16 }} />
          ))}
        {!loading && sortedUsers.length === 0 && (
          <div className="ops-section-card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
            کاربری در این نما وجود ندارد.
          </div>
        )}
        {!loading && sortedUsers.map((user) => (
          <article key={user.id} className="adm-user-card" onClick={() => openUser(user)}>
            <div className="adm-user-card-head">
              <Avatar size={44} imageUrl={fullUrl(user.avatar_url)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{user.name || 'کاربر بدون نام'}</strong>
                <small dir="ltr">{toFaDigits(user.mobile || '—')}</small>
              </div>
              <PanelStatus status={user.active ? 'active' : 'inactive'}>{user.active ? 'فعال' : 'غیرفعال'}</PanelStatus>
            </div>
            <div className="adm-user-card-badges">
              <span className="adm-badge" data-tone={ROLE_BADGE[user.role ?? 'learner']?.tone}>{roleLabel(user.role)}</span>
              {user.teacher?.id && (
                <span className="adm-badge" data-tone={user.teacher.status === 'approved' ? 'olive' : user.teacher.status === 'pending' ? 'gold' : 'rose'}>
                  {teacherStatusLabel(user.teacher.status)}
                </span>
              )}
            </div>
            <div className="adm-user-card-foot">
              <span><Icon name="wallet" size={13} /> {formatFaNumber(Number(user.wallet || 0))} تومان</span>
              <span><Icon name="calendar" size={13} /> {faDate(user.created_at)}</span>
            </div>
            <div className="adm-user-card-actions" onClick={(event) => event.stopPropagation()}>
              <PanelButton icon="edit" onClick={() => openUser(user)}>جزئیات</PanelButton>
              <PanelButton
                tone={user.active ? 'danger' : 'success'}
                disabled={busyId === user.id}
                onClick={() => void toggleActive(user)}
              >
                {busyId === user.id ? '…' : user.active ? 'غیرفعال' : 'فعال'}
              </PanelButton>
            </div>
          </article>
        ))}
      </div>

      <TablePagination page={page} pageSize={LIMIT} total={total} onPage={setPage} />

      <Drawer
        open={selected !== null}
        onClose={() => { setSelected(null); setDetail(null); }}
        title={selected?.name || 'کاربر بدون نام'}
      >
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 14px' }}>
              <Avatar size={56} imageUrl={fullUrl(selected.avatar_url)} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 14 }}>{selected.name || 'کاربر بدون نام'}</strong>
                <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                  <span className="adm-badge" data-tone={ROLE_BADGE[selected.role ?? 'learner']?.tone}>{roleLabel(selected.role)}</span>
                  <PanelStatus status={selected.active ? 'active' : 'inactive'}>{selected.active ? 'فعال' : 'غیرفعال'}</PanelStatus>
                  {selected.teacher?.id && (
                    <span className="adm-badge" data-tone={selected.teacher.status === 'approved' ? 'olive' : 'gold'}>
                      {teacherStatusLabel(selected.teacher.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {detailLoading && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="adm-skeleton" style={{ height: 74, borderRadius: 14 }} />
                <div className="adm-skeleton" style={{ height: 120, borderRadius: 14 }} />
              </div>
            )}

            {!detailLoading && detail && detailUser && (
              <>
                <div className="adm-mini-stat-grid">
                  <MiniStat icon="video" label="جلسات خریداری‌شده" value={detail.stats.as_learner} />
                  <MiniStat icon="checkCircle" label="برگزارشده (دانش‌آموز)" value={detail.stats.learner_done} tone="olive" />
                  {Number(detail.stats.as_teacher) > 0 && (
                    <>
                      <MiniStat icon="award" label="جلسات تدریس‌شده" value={detail.stats.as_teacher} tone="gold" />
                      <MiniStat icon="checkCircle" label="برگزارشده (استاد)" value={detail.stats.teacher_done} tone="gold" />
                    </>
                  )}
                  <MiniStat icon="clock" label="در پیش‌رو" value={detail.stats.upcoming} tone="info" />
                  <MiniStat icon="star" label="نظرها" value={detail.reviews_count} tone="gold" />
                </div>

                <section className="adm-detail-card">
                  <strong className="adm-detail-card-title"><Icon name="wallet" size={14} /> مالی حساب</strong>
                  <div className="adm-sums-grid">
                    <span>شارژ<strong>{formatFaNumber(Number(detail.sums.charge || 0))}</strong></span>
                    <span>هزینه جلسات<strong>{formatFaNumber(Math.abs(Number(detail.sums.session || 0)))}</strong></span>
                    <span>درآمد جلسات<strong>{formatFaNumber(Number(detail.sums.earning || 0))}</strong></span>
                    <span>برداشت<strong>{formatFaNumber(Math.abs(Number(detail.sums.withdrawal || 0)))}</strong></span>
                    <span>کارمزد<strong>{formatFaNumber(Math.abs(Number(detail.sums.commission || 0)))}</strong></span>
                    <span>موجودی فعلی<strong className="adm-sums-total">{formatFaNumber(Number(detailUser.wallet || 0))}</strong></span>
                  </div>
                </section>

                <DrawerTabs
                  value={detailTab}
                  onChange={setDetailTab}
                  counts={{
                    sessions: detail.sessions.length,
                    transactions: detail.transactions.length,
                    reviews: detail.reviews.length,
                  }}
                />

                <div className="adm-detail-list">
                  {detailTab === 'sessions' && (
                    detail.sessions.length === 0
                      ? <p className="adm-detail-empty">جلسه‌ای ثبت نشده است.</p>
                      : detail.sessions.map((session) => {
                        const counterpart = selected.role === 'teacher'
                          ? session.learner?.name
                          : session.teacher?.user?.name;
                        const badge = SESSION_BADGE[session.status] ?? SESSION_BADGE.pending;
                        return (
                          <div key={session.id} className="adm-detail-row">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong>{session.service || 'جلسه'}</strong>
                              <small>{counterpart ? `با ${counterpart} · ` : ''}{faDateTime(session.scheduled_at)}</small>
                            </div>
                            <div style={{ textAlign: 'end' }}>
                              <PanelStatus status={badge.status}>{badge.label}</PanelStatus>
                              {Number(session.price || 0) > 0 && (
                                <small style={{ display: 'block', marginTop: 4, color: 'var(--ink-3)' }}>{formatFaNumber(Number(session.price))} تومان</small>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}

                  {detailTab === 'transactions' && (
                    detail.transactions.length === 0
                      ? <p className="adm-detail-empty">تراکنشی ثبت نشده است.</p>
                      : detail.transactions.map((tx) => {
                        const meta = TX_META[tx.type] ?? TX_META.adjust;
                        const amount = Number(tx.amount) || 0;
                        const credit = amount >= 0;
                        return (
                          <div key={tx.id} className="adm-detail-row">
                            <span className="adm-mini-stat-icon" style={{ '--tone-ink': credit ? 'var(--olive-700)' : 'var(--clay)', '--tone-bg': credit ? 'var(--olive-100)' : 'var(--clay-bg)' } as React.CSSProperties}>
                              <Icon name={meta.icon} size={14} />
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong>{tx.title || meta.label}</strong>
                              <small>{meta.label} · {faDateTime(tx.created_at)}</small>
                            </div>
                            <strong style={{ color: credit ? 'var(--olive-700)' : 'var(--clay)', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {credit ? '+' : '−'}{formatFaNumber(Math.abs(amount))}
                            </strong>
                          </div>
                        );
                      })
                  )}

                  {detailTab === 'reviews' && (
                    detail.reviews.length === 0
                      ? <p className="adm-detail-empty">نظری ثبت نشده است.</p>
                      : detail.reviews.map((review) => (
                        <div key={review.id} className="adm-detail-row">
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <strong>
                              {'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                              {review.learner?.name ? ` · ${review.learner.name}` : ''}
                            </strong>
                            {review.text && <small>{review.text}</small>}
                            <small>{faDate(review.created_at)}</small>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}

            <KeyValueRow label="شناسه">{toFaDigits(selected.id)}</KeyValueRow>
            <KeyValueRow label="موبایل"><span dir="ltr">{toFaDigits(selected.mobile || '—')}</span></KeyValueRow>
            <KeyValueRow label="شهر">{selected.city || '—'}</KeyValueRow>
            <KeyValueRow label="تاریخ عضویت">{faDate(selected.created_at)}</KeyValueRow>
            {selected.teacher?.id && (
              <KeyValueRow label="رشته استادی">{selected.teacher.field || '—'}</KeyValueRow>
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

            <section style={{ marginTop: 14, padding: 14, border: '1px solid var(--olive-100)', borderRadius: 15, background: 'var(--olive-50)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 12.5 }}>
                <Icon name="bell" size={15} style={{ color: 'var(--olive-700)' }} />
                ارسال اعلان به کاربر
              </strong>
              <p style={{ margin: '0 0 10px', color: 'var(--ink-3)', fontSize: 10.5, lineHeight: 1.9 }}>
                پیام شما بلافاصله در اعلان‌های پنل و اپ کاربر نمایش داده می‌شود.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  value={notifyTitle}
                  onChange={(event) => { setNotifyTitle(event.target.value); setNotifyDone(false); }}
                  maxLength={160}
                  placeholder="عنوان اعلان"
                  aria-label="عنوان اعلان"
                  style={{
                    minHeight: 42, padding: '9px 12px', border: '1px solid var(--sand-200)',
                    borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
                  }}
                />
                <textarea
                  value={notifyBody}
                  onChange={(event) => { setNotifyBody(event.target.value); setNotifyDone(false); }}
                  maxLength={500}
                  rows={3}
                  placeholder="متن اعلان…"
                  aria-label="متن اعلان"
                  style={{
                    padding: '9px 12px', border: '1px solid var(--sand-200)',
                    borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.9, resize: 'vertical',
                  }}
                />
                <PanelButton
                  tone="primary"
                  icon="bell"
                  disabled={notifyBusy || !notifyTitle.trim() || !notifyBody.trim()}
                  onClick={() => void submitNotify()}
                >
                  {notifyBusy ? 'در حال ارسال…' : 'ارسال اعلان'}
                </PanelButton>
                {notifyDone && <small style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--olive-700)', fontWeight: 700 }}><Icon name="checkCircle" size={13} /> اعلان با موفقیت ارسال شد.</small>}
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
