'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { fullUrl, getToken } from '@/lib/auth';

const LIMIT = 20;

type AdminUser = {
  id: number;
  name?: string;
  mobile?: string;
  role?: string;
  wallet?: number;
  active?: boolean;
  avatar_url?: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
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
      const response = await fetch(`/api/backend/admin/users?limit=${LIMIT}&offset=${page * LIMIT}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'فهرست کاربران دریافت نشد.');
      setUsers(body.data || []);
      setTotal(body.total || 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست کاربران دریافت نشد.');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function toggleActive(user: AdminUser) {
    if (!token || busyId !== null) return;
    const next = !user.active;
    const verb = next ? 'فعال' : 'غیرفعال';
    if (!window.confirm(`حساب «${user.name || (user.mobile ? faDigits(user.mobile) : 'کاربر')}» ${verb} شود؟`)) return;

    setBusyId(user.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `تغییر وضعیت حساب انجام نشد.`);
      setUsers((previous) => previous.map((item) => item.id === user.id ? { ...item, active: next } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر وضعیت حساب انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>کاربران</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>مدیریت حساب‌های کاربری · {faDigits(total)} کاربر</p>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 110px 120px 110px', padding: '12px 20px', background: 'var(--sand-50)', borderBottom: '1px solid var(--sand-100)', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
            <span>نام</span><span>موبایل</span><span>نقش</span><span>کیف پول</span><span>وضعیت</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>
          ) : users.map((user) => (
            <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 110px 120px 110px', padding: '14px 20px', borderBottom: '1px solid var(--sand-50)', fontSize: 13.5, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar size={34} imageUrl={fullUrl(user.avatar_url)} />
                <span style={{ fontWeight: 600 }}>{user.name || '—'}</span>
              </div>
              <span dir="ltr" style={{ color: 'var(--ink-2s)', textAlign: 'right' }}>{faDigits(user.mobile || '—')}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, width: 'fit-content', background: user.role === 'admin' ? 'var(--clay-bg)' : user.role === 'teacher' ? 'var(--olive-100)' : 'var(--sand-100)', color: user.role === 'admin' ? 'var(--clay)' : user.role === 'teacher' ? 'var(--olive-700)' : 'var(--ink-3)' }}>
                {user.role === 'admin' ? 'ادمین' : user.role === 'teacher' ? 'استاد' : 'قرآن‌آموز'}
              </span>
              <span>{faDigits(Number(user.wallet) || 0)} تومان</span>
              <button type="button" disabled={busyId === user.id} onClick={() => toggleActive(user)} style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, border: 'none', cursor: busyId === user.id ? 'wait' : 'pointer', background: user.active ? 'var(--olive-100)' : 'var(--clay-bg)', color: user.active ? 'var(--olive-700)' : 'var(--clay)', opacity: busyId === user.id ? .6 : 1 }}>
                {busyId === user.id ? 'در حال ثبت…' : user.active ? 'فعال' : 'غیرفعال'}
              </button>
            </div>
          ))}
          {!loading && users.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>کاربری یافت نشد.</div>}
        </div>
      </div>

      {totalPages > 1 && (
        <nav aria-label="صفحه‌بندی کاربران" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} style={paginationButton(page === 0)}>قبلی</button>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>صفحه {faDigits(page + 1)} از {faDigits(totalPages)}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={page >= totalPages - 1} style={paginationButton(page >= totalPages - 1)}>بعدی</button>
        </nav>
      )}
    </main>
  );
}

function paginationButton(disabled: boolean): React.CSSProperties {
  return { padding: '8px 18px', borderRadius: 12, border: '1px solid var(--sand-200)', background: '#fff', cursor: disabled ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: disabled ? 'var(--ink-4)' : 'var(--ink)', opacity: disabled ? .5 : 1 };
}
