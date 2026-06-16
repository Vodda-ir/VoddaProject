'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سهشنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function timeDisplay(weekday: number, ranges: Array<{ from: string; to: string }>) {
  if (!ranges || ranges.length === 0) return 'تعطیل';
  return ranges.map(r => `${r.from} تا ${r.to}`).join('، ');
}

export default function TeacherWorkTimesPage() {
  const [workTimes, setWorkTimes] = useState<Record<number, Array<{ from: string; to: string }>>>({});
  const [loading, setLoading] = useState(true);
  const token = getToken();

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/teacher/work-times', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => {
        const grouped: Record<number, Array<{ from: string; to: string }>> = {};
        (j.data as Array<Record<string, unknown>> || []).forEach(w => {
          const d = w.weekday as number;
          if (!grouped[d]) grouped[d] = [];
          grouped[d].push({ from: w.from as string, to: w.to as string });
        });
        setWorkTimes(grouped);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>زمانهای کاری</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>روزها و ساعتهایی که برای برگزاری جلسه در دسترس هستید</p>
      {loading ? <div style={{ padding: 28 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map((day, i) => {
            const ranges = workTimes[i] || [];
            const active = ranges.length > 0;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: active ? 'var(--olive-100)' : 'var(--sand-100)', color: active ? 'var(--olive-700)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="clock" size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? 'var(--ink)' : 'var(--ink-3)' }}>{day}</div>
                  <div style={{ fontSize: 12.5, color: active ? 'var(--olive-600)' : 'var(--ink-4)', marginTop: 3, direction: 'ltr', textAlign: 'right' }}>
                    {active ? ranges.map(r => `${r.from} تا ${r.to}`).join('، ') : 'تعطیل'}
                  </div>
                </div>
                {active && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'var(--olive-100)', color: 'var(--olive-700)' }}>{faDigits(ranges.length)} بازه</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
