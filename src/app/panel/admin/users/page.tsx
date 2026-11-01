'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

const LIMIT = 30;
type RoleFilter = '' | 'learner' | 'teacher' | 'admin';

type AdminUser = {
  id: number;
  name?: string;
  mobile?: string;
  role?: RoleFilter;
  wallet?: number;
  active?: boolean;
  avatar_url?: string;
};

const ROLES: Array<{ value: RoleFilter; label: string }> = [
  { value: '', label: 'همه' },
  { value: 'learner', label: 'قرآن‌آموز' },
  { value: 'teacher', label: 'استاد' },
  { value: 'admin', label: 'ادمین' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<RoleFilter>('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
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
  }, [token, page, role]);

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر وضعیت حساب انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="حساب‌ها و دسترسی"
        title="کاربران"
        description="حساب‌های سامانه را بر اساس نقش مرور کنید و دسترسی حساب‌ها را بدون دستکاری داده‌های پروفایل کنترل کنید."
        actions={<PanelButton icon="refresh" onClick={() => void fetchUsers()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-filter-tabs" role="tablist" aria-label="نقش کاربران" style={{ marginBottom: 14 }}>
        {ROLES.map((item) => (
          <button key={item.value || 'all'} type="button" role="tab" aria-selected={role === item.value} onClick={() => { setRole(item.value); setPage(0); }}>
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void fetchUsers()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>{role ? ROLES.find((item) => item.value === role)?.label : 'همه کاربران'}</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(total)} حساب`}</span>
          </div>
          {!loading && total > 0 && <span>صفحه {toFaDigits(page + 1)} از {toFaDigits(totalPages)}</span>}
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری کاربران…</div>
        ) : users.length === 0 ? (
          <PanelEmpty icon="users" title="کاربری در این گروه وجود ندارد" />
        ) : (
          users.map((user) => {
            const busy = busyId === user.id;
            return (
              <article className="ops-row" key={user.id} style={{ opacity: busy ? .55 : 1 }}>
                <Avatar size={44} imageUrl={fullUrl(user.avatar_url)} />
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{user.name || 'کاربر بدون نام'}</strong>
                    <PanelStatus status={user.active ? 'active' : 'inactive'}>{user.active ? 'فعال' : 'غیرفعال'}</PanelStatus>
                    <PanelStatus status="info">{roleLabel(user.role)}</PanelStatus>
                  </div>
                  <div className="ops-row-sub">
                    <span dir="ltr">{toFaDigits(user.mobile || '—')}</span>
                    <span>· شناسه {toFaDigits(user.id)}</span>
                  </div>
                  <div className="ops-row-meta">
                    <span>کیف پول: {formatFaNumber(Number(user.wallet) || 0)} تومان</span>
                  </div>
                </div>
                <div className="ops-row-actions">
                  <PanelButton
                    tone={user.active ? 'danger' : 'success'}
                    disabled={busy}
                    onClick={() => void toggleActive(user)}
                  >
                    {busy ? 'در حال ثبت…' : user.active ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن حساب'}
                  </PanelButton>
                </div>
              </article>
            );
          })
        )}

        {!loading && total > LIMIT && (
          <div className="ops-pagination">
            <PanelButton disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>صفحه قبل</PanelButton>
            <span>{toFaDigits(page * LIMIT + 1)} تا {toFaDigits(Math.min((page + 1) * LIMIT, total))} از {toFaDigits(total)}</span>
            <PanelButton disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>صفحه بعد</PanelButton>
          </div>
        )}
      </section>
    </main>
  );
}

function roleLabel(role?: string) {
  if (role === 'admin') return 'ادمین';
  if (role === 'teacher') return 'استاد';
  return 'قرآن‌آموز';
}
