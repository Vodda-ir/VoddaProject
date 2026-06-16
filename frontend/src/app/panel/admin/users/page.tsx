'use client';

import { useState, useEffect, useCallback } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { getToken, fullUrl } from '@/lib/auth';

const LIMIT = 20;

export default function AdminUsers() {
  const [users, setUsers] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  const fetchUsers = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/v1/admin/users?limit=${LIMIT}&offset=${page * LIMIT}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { data: [], total: 0 })
      .then(j => { setUsers(j.data || []); setTotal(j.total || 0); })
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleActive(id: number, active: boolean) {
    if (!token) return;
    await fetch(`/api/v1/admin/users/${id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !active }),
    });
    fetchUsers();
  }

  const totalPages = Math.ceil(total / LIMIT);
  const list = users as Array<Record<string, unknown>>;

  if (loading && users.length === 0) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>کاربران</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>مدیریت حسابهای کاربری · {faDigits(total)} کاربر</p>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 80px', padding: '12px 20px', background: 'var(--sand-50)', borderBottom: '1px solid var(--sand-100)', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
          <span>نام</span><span>موبایل</span><span>نقش</span><span>کیف پول</span><span>وضعیت</span>
        </div>
        {list.map(u => (
          <div key={u.id as number} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 80px', padding: '14px 20px', borderBottom: '1px solid var(--sand-50)', fontSize: 13.5, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={34} imageUrl={fullUrl(u.avatar_url as string)} />
              <span style={{ fontWeight: 600 }}>{(u.name as string) || '—'}</span>
            </div>
            <span dir="ltr" style={{ color: 'var(--ink-2s)' }}>{u.mobile as string}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, width: 'fit-content', background: u.role === 'admin' ? 'var(--clay-bg)' : u.role === 'teacher' ? 'var(--olive-100)' : 'var(--sand-100)', color: u.role === 'admin' ? 'var(--clay)' : u.role === 'teacher' ? 'var(--olive-700)' : 'var(--ink-3)' }}>
              {u.role === 'admin' ? 'ادمین' : u.role === 'teacher' ? 'مربی' : 'کاربر'}
            </span>
            <span>{faDigits((u.wallet as number) || 0)} ت</span>
            <button onClick={() => toggleActive(u.id as number, (u.active as boolean) || false)}
              style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: u.active ? 'var(--olive-100)' : 'var(--clay-bg)', color: u.active ? 'var(--olive-700)' : 'var(--clay)' }}>
              {u.active ? 'فعال' : 'غیرفعال'}
            </button>
          </div>
        ))}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>کاربری یافت نشد</div>}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '8px 18px', borderRadius: 12, border: '1px solid var(--sand-200)', background: '#fff', cursor: page === 0 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: page === 0 ? 'var(--ink-4)' : 'var(--ink)', opacity: page === 0 ? 0.5 : 1 }}>قبلی</button>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>صفحه {faDigits(page + 1)} از {faDigits(totalPages)}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ padding: '8px 18px', borderRadius: 12, border: '1px solid var(--sand-200)', background: '#fff', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: page >= totalPages - 1 ? 'var(--ink-4)' : 'var(--ink)', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>بعدی</button>
        </div>
      )}
    </div>
  );
}
