'use client';

import { PanelShell, StatCard, Panel, StatusTag, Placeholder, faDigits, type NavItem } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';

const NAV: NavItem[] = [
  { id: 'dash', icon: 'grid', label: 'داشبورد' },
  { id: 'sessions', icon: 'calendar', label: 'جلسات من', badge: faDigits(2) },
  { id: 'fav', icon: 'heart', label: 'اساتید دلخواه' },
  { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
  { id: 'messages', icon: 'message', label: 'پیام‌ها' },
  { id: 'settings', icon: 'settings', label: 'تنظیمات' },
];

const UPCOMING = [
  { id: 1, teacher: 'عباس ملک‌محمدی', service: 'تصحیح قرائت و تجوید', date: 'سه‌شنبه ۲۳ بهمن', time: '۱۸:۰۰', status: 'confirmed', verified: true },
  { id: 2, teacher: 'مریم رضوی', service: 'روخوانی از پایه', date: 'پنج‌شنبه ۲۵ بهمن', time: '۱۰:۳۰', status: 'pending', verified: true },
];
const SUGGESTED = [
  { name: 'عباس ملک‌محمدی', tag: 'حافظ و قاری', rating: '۴٫۹', emoji: '📖' },
  { name: 'محمد ملک‌مطیعی', tag: 'مداح و ذاکر', rating: '۴٫۸', emoji: '🎤' },
  { name: 'مریم رضوی', tag: 'حافظ کل', rating: '۵٫۰', emoji: '📖' },
  { name: 'علی کبیری', tag: 'قاری ممتاز', rating: '۴٫۷', emoji: '📖' },
];

export default function UserPanel() {
  return (
    <PanelShell brandSub="پنل قرآن‌آموز" nav={NAV} user={{ name: 'مجتبی شعبان‌زاده', role: 'قرآن‌آموز' }} title="سلام مجتبی 🌿" sub="خلاصه‌ای از فعالیت‌های شما در وُدّا">
      {(active) => active !== 'dash' ? <Placeholder label={NAV.find((n) => n.id === active)!.label} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 22 }} className="cat-grid">
            <StatCard icon="calendar" label="جلسات پیش‌رو" value={faDigits(2)} tone="olive" />
            <StatCard icon="checkCircle" label="جلسات برگزارشده" value={faDigits(14)} tone="info" delta="۸٪+" />
            <StatCard icon="wallet" label="موجودی کیف پول" value={`${faDigits('105٬000')} ت`} tone="gold" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }} className="hero-grid">
            <Panel title="جلسات پیش‌رو" action="مشاهدهٔ همه" pad={false}>
              {UPCOMING.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < UPCOMING.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                  <Avatar size={44} verified={s.verified} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.teacher}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{s.service}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-2s)' }}>
                    <div style={{ fontWeight: 700 }}>{s.date}</div>
                    <div style={{ color: 'var(--ink-4)', marginTop: 2 }}>{s.time}</div>
                  </div>
                  <StatusTag status={s.status} />
                  <button style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '8px 16px', borderRadius: 999 }}>{s.status === 'confirmed' ? 'پیوستن' : 'جزئیات'}</button>
                </div>
              ))}
            </Panel>
            <Panel title="اساتید پیشنهادی" action="بیشتر">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {SUGGESTED.map((t) => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar size={40} verified emoji={t.emoji} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--olive-600)' }}>{t.tag}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12.5, fontWeight: 800, color: 'var(--gold)' }}><Icon name="star" size={13} fill />{t.rating}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </PanelShell>
  );
}
