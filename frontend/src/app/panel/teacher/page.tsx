'use client';

import { useState, useEffect } from 'react';
import { PanelShell, StatCard, Panel, MiniBars, StatusTag, Placeholder, faDigits, type NavItem } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken, clearToken, type AuthUser } from '@/lib/auth';

const NAV: NavItem[] = [
  { id: 'dash', icon: 'grid', label: 'داشبورد' },
  { id: 'requests', icon: 'message', label: 'درخواستها', badge: faDigits(0) },
  { id: 'sessions', icon: 'calendar', label: 'جلسات' },
  { id: 'services', icon: 'book', label: 'خدمات من' },
  { id: 'worktimes', icon: 'clock', label: 'زمانهای کاری' },
  { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
  { id: 'reviews', icon: 'star', label: 'نظرات' },
];

const REQUESTS = [
  { id: 1, learner: 'حسین کریمی', service: 'تصحیح قرائت', date: 'سهشنبه ۲۳ بهمن', time: '۱۷:۰۰' },
  { id: 2, learner: 'زهرا احمدی', service: 'آموزش مقامات', date: 'چهارشنبه ۲۴ بهمن', time: '۱۹:۳۰' },
  { id: 3, learner: 'مهدی رضایی', service: 'روانخوانی', date: 'پنجشنبه ۲۵ بهمن', time: '۱۱:۰۰' },
];
const UPCOMING = [
  { id: 1, learner: 'سکینه رضوی', service: 'تصحیح قرائت و تجوید', date: 'سهشنبه ۲۳ بهمن', time: '۱۸:۰۰', status: 'confirmed', net: '۷۲٬۲۵۰ ت' },
  { id: 2, learner: 'علی محمدی', service: 'آموزش مقامات و صوت', date: 'پنجشنبه ۲۵ بهمن', time: '۲۰:۰۰', status: 'confirmed', net: '۱۲۷٬۵۰۰ ت' },
];

export default function TeacherPanel() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState<unknown[]>([]);
  const [upcoming, setUpcoming] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.me(token),
      api.teacherSessions(token, 'pending'),
      api.teacherSessions(token, 'upcoming'),
    ]).then(([meRes, pendingRes, upcomingRes]) => {
      setMe(meRes.data);
      setPending((pendingRes.data || []) as unknown[]);
      setUpcoming((upcomingRes.data || []) as unknown[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const name = me?.name || 'استاد';
  const wallet = me?.wallet ?? 0;

  if (loading && !me) {
    return (
      <PanelShell brandSub="پنل استاد" nav={NAV} user={{ name: '...', role: 'استاد' }} title="در حال بارگذاری">
        {() => <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)' }}>در حال بارگذاری…</div>}
      </PanelShell>
    );
  }

  return (
    <PanelShell
      brandSub="پنل استاد"
      nav={NAV}
      user={{ name, role: 'استاد' }}
      title="داشبورد استاد"
      sub="مدیریت جلسات، درخواستها و درآمد"
      onLogout={() => { clearToken(); window.location.href = '/panel/login'; }}
    >
      {(active) => active !== 'dash' ? <Placeholder label={NAV.find((n) => n.id === active)!.label} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }} className="why-grid">
            <StatCard icon="coins" label="موجودی قابل برداشت" value={`${faDigits(wallet)} ت`} tone="olive" />
            <StatCard icon="message" label="درخواست جدید" value={faDigits(pending.length)} tone="clay" />
            <StatCard icon="checkCircle" label="جلسات پیشرو" value={faDigits(upcoming.length)} tone="info" />
            <StatCard icon="star" label="میانگین امتیاز" value={faDigits(4.8)} tone="gold" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }} className="hero-grid">
            <Panel title="درخواستهای در انتظار پاسخ" action="مشاهدهٔ همه" pad={false}>
              {pending.length === 0 ? (
                <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>درخواستی در انتظار نیست</div>
              ) : (
                (pending as Array<Record<string, unknown>>).map((r, i) => (
                  <div key={r.id as number} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    borderBottom: i < pending.length - 1 ? '1px solid var(--sand-100)' : 'none',
                  }}>
                    <Avatar size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{(r.learner_name || r.learnerName || 'قرآنآموز') as string}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{(r.service || r.title || '') as string}</div>
                    </div>
                    <button style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--olive-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} stroke={2.6} /></button>
                    <button style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--clay-bg)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={17} stroke={2.4} /></button>
                  </div>
                ))
              )}
            </Panel>
            <Panel title="درآمد ۶ ماه اخیر">
              <MiniBars data={[1.8, 2.4, 2.1, 3.0, 2.7, 3.65]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-3)' }}>موجودی</span>
                <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits(wallet)} ت</span>
              </div>
            </Panel>
          </div>
          <Panel title="جلسات پیشرو" action="تقویم کامل" pad={false}>
            {upcoming.length === 0 ? (
              <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>جلسهای در پیش رو نیست</div>
            ) : (
              (upcoming as Array<Record<string, unknown>>).map((s, i) => (
                <div key={s.id as number} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: i < upcoming.length - 1 ? '1px solid var(--sand-100)' : 'none',
                }}>
                  <Avatar size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{(s.learner_name || s.learnerName || 'قرآنآموز') as string}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{(s.service || s.title || '') as string}</div>
                  </div>
                  <StatusTag status={(s.status as string) || 'confirmed'} />
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-700)' }}>
                    {faDigits((s.price as number) || 0)} ت
                  </span>
                </div>
              ))
            )}
          </Panel>
        </>
      )}
    </PanelShell>
  );
}
