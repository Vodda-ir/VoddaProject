'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

export default function AdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/admin/services', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(j => setServices(j.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleApprove = async (id: number) => {
    await fetch(`/api/v1/admin/services/${id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handleReject = async (id: number) => {
    await fetch(`/api/v1/admin/services/${id}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  if (loading) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>خدمات مربیان</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>
        خدمات در انتظار تأیید · پس از تأیید برای قرآن‌آموزان قابل رزرو می‌شود
      </p>

      {services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)', fontSize: 14 }}>
          {loading ? 'در حال بارگذاری…' : 'همهٔ خدمات تأیید شده‌اند'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map(s => {
            const teacher = s.teacher || {};
            const user = teacher.user || {};
            return (
              <div
                key={s.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid var(--sand-150)',
                  boxShadow: 'var(--sh-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background: 'var(--olive-100)',
                      color: 'var(--olive-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="book" size={23} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                      {s.duration} دقیقه · {faDigits(s.price)} تومان
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--gold-bg)',
                      color: 'var(--gold)',
                    }}
                  >
                    در انتظار تأیید
                  </span>
                </div>

                {/* Teacher info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'var(--sand-50)',
                    borderRadius: 12,
                  }}
                >
                  <Avatar size={28} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                    {user.name || '—'}
                  </span>
                  {teacher.city && (
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      · {teacher.city}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    · {teacher.field || '—'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleReject(s.id)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 12,
                      border: '1.5px solid var(--sand-200)',
                      background: '#fff',
                      color: 'var(--ink-3)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    رد کردن
                  </button>
                  <button
                    onClick={() => handleApprove(s.id)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'var(--olive-600)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    تأیید
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
