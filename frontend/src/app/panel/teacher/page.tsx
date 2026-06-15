'use client';

import { PanelShell, StatCard, Panel, MiniBars, StatusTag, Placeholder, faDigits, type NavItem } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';

const NAV: NavItem[] = [
  { id: 'dash', icon: 'grid', label: 'داشبورد' },
  { id: 'requests', icon: 'message', label: 'درخواست‌ها', badge: faDigits(3) },
  { id: 'sessions', icon: 'calendar', label: 'جلسات' },
  { id: 'services', icon: 'book', label: 'خدمات من' },
  { id: 'worktimes', icon: 'clock', label: 'زمان‌های کاری' },
  { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
  { id: 'reviews', icon: 'star', label: 'نظرات' },
];

const REQUESTS = [
  { id: 1, learner: 'حسین کریمی', service: 'تصحیح قرائت', date: 'سه‌شنبه ۲۳ بهمن', time: '۱۷:۰۰' },
  { id: 2, learner: 'زهرا احمدی', service: 'آموزش مقامات', date: 'چهارشنبه ۲۴ بهمن', time: '۱۹:۳۰' },
  { id: 3, learner: 'مهدی رضایی', service: 'روان‌خوانی', date: 'پنج‌شنبه ۲۵ بهمن', time: '۱۱:۰۰' },
];
const UPCOMING = [
  { id: 1, learner: 'سکینه رضوی', service: 'تصحیح قرائت و تجوید', date: 'سه‌شنبه ۲۳ بهمن', time: '۱۸:۰۰', status: 'confirmed', net: '۷۲٬۲۵۰ ت' },
  { id: 2, learner: 'علی محمدی', service: 'آموزش مقامات و صوت', date: 'پنج‌شنبه ۲۵ بهمن', time: '۲۰:۰۰', status: 'confirmed', net: '۱۲۷٬۵۰۰ ت' },
];

export default function TeacherPanel() {
  return (
    <PanelShell brandSub="پنل استاد" nav={NAV} user={{ name: 'عباس ملک‌محمدی', role: 'استاد' }} title="داشبورد استاد" sub="مدیریت جلسات، درخواست‌ها و درآمد">
      {(active) => active !== 'dash' ? <Placeholder label={NAV.find((n) => n.id === active)!.label} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }} className="why-grid">
            <StatCard icon="coins" label="درآمد این ماه" value={`${faDigits(3.65)} م ت`} tone="olive" delta="۱۲٪+" />
            <StatCard icon="message" label="درخواست جدید" value={faDigits(3)} tone="clay" />
            <StatCard icon="checkCircle" label="جلسات این ماه" value={faDigits(38)} tone="info" />
            <StatCard icon="star" label="میانگین امتیاز" value={faDigits(4.9)} tone="gold" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }} className="hero-grid">
            <Panel title="درخواست‌های در انتظار پاسخ" action="مشاهدهٔ همه" pad={false}>
              {REQUESTS.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < REQUESTS.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                  <Avatar size={42} emoji="🧑" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.learner}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{r.service} · {r.date} {r.time}</div>
                  </div>
                  <button style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--olive-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} stroke={2.6} /></button>
                  <button style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--clay-bg)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={17} stroke={2.4} /></button>
                </div>
              ))}
            </Panel>
            <Panel title="درآمد ۶ ماه اخیر">
              <MiniBars data={[1.8, 2.4, 2.1, 3.0, 2.7, 3.65]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-3)' }}>مجموع امسال</span>
                <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>۱۵٬۶۰۰٬۰۰۰ ت</span>
              </div>
            </Panel>
          </div>
          <Panel title="جلسات پیش‌رو" action="تقویم کامل" pad={false}>
            {UPCOMING.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < UPCOMING.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                <Avatar size={42} emoji="🧑" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.learner}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.service}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2s)', textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{s.date}</div><div style={{ color: 'var(--ink-4)', marginTop: 2 }}>{s.time}</div></div>
                <StatusTag status={s.status} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-700)' }}>{s.net}</span>
              </div>
            ))}
          </Panel>
        </>
      )}
    </PanelShell>
  );
}
