'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

export default function TeacherServicesPage() {
  const [services, setServices] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  function fetchData() {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/teacher/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: {} })
      .then(j => setServices((j.data?.services || []) as unknown[]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [token]);

  async function toggleActive(id: number, active: boolean) {
    if (!token) return;
    await fetch(`/api/v1/teacher/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !active }),
    });
    fetchData();
  }

  const list = services as Array<Record<string, unknown>>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>خدمات من</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>خدمات قابل رزرو برای قرآنآموزان · خدمت جدید پس از تأیید ادمین فعال میشود</p>
      {loading ? <div style={{ padding: 28 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(s => (
            <div key={s.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', opacity: s.active ? 1 : 0.55 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="book" size={23} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{(s.title as string) || ''}</span>
                  {!s.active && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--gold-bg)', color: 'var(--gold)' }}>در انتظار تأیید</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{s.duration as number} دقیقه · {faDigits(s.price as number)} تومان</div>
              </div>
              <button onClick={() => toggleActive(s.id as number, s.active as boolean)} style={{
                fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: s.active ? 'var(--olive-100)' : 'var(--sand-200)',
                color: s.active ? 'var(--olive-700)' : 'var(--ink-3)',
              }}>
                {s.active ? 'فعال' : 'غیرفعال'}
              </button>
            </div>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز خدمتی تعریف نشده</div>}
        </div>
      )}
    </div>
  );
}
