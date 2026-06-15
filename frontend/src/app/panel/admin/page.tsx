'use client';

import { PanelShell, StatCard, Panel, MiniBars, StatusTag, Placeholder, faDigits, type NavItem } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';

const NAV: NavItem[] = [
  { id: 'dash', icon: 'grid', label: 'داشبورد' },
  { id: 'users', icon: 'users', label: 'کاربران' },
  { id: 'teachers', icon: 'award', label: 'اساتید', badge: faDigits(3) },
  { id: 'sessions', icon: 'calendar', label: 'جلسات' },
  { id: 'tx', icon: 'coins', label: 'تراکنش‌ها' },
  { id: 'withdraws', icon: 'download', label: 'برداشت‌ها' },
  { id: 'reports', icon: 'trending', label: 'گزارش‌ها' },
  { id: 'settings', icon: 'settings', label: 'تنظیمات' },
];

const PENDING = [
  { name: 'رضا عبدلی', field: 'آموزش قرآن کریم', city: 'تهران', docs: 3 },
  { name: 'مریم سادات حسینی', field: 'مداحی اهل‌بیت', city: 'قم', docs: 2 },
  { name: 'علی کبیری', field: 'آموزش قرآن کریم', city: 'اصفهان', docs: 4 },
];
const TX = [
  { title: 'شارژ کیف پول · مجتبی ش.', type: 'charge', amount: 200000, date: 'امروز ۱۴:۲۰' },
  { title: 'کارمزد جلسه · عباس م.', type: 'fee', amount: 12750, date: 'امروز ۱۲:۰۵' },
  { title: 'برداشت استاد · محمد م.', type: 'withdraw', amount: -1000000, date: 'دیروز ۱۸:۳۰' },
  { title: 'کارمزد جلسه · مریم ر.', type: 'fee', amount: 14250, date: 'دیروز ۱۰:۱۰' },
];
const BREAKDOWN: [string, number, string][] = [
  ['آموزش قرآن کریم', 64, 'var(--olive-600)'],
  ['مداحی اهل‌بیت', 24, 'var(--clay)'],
  ['مشاورهٔ صوتی', 12, 'var(--gold)'],
];

export default function AdminPanel() {
  return (
    <PanelShell brandSub="پنل مدیریت" nav={NAV} user={{ name: 'مدیر سامانه', role: 'ادمین' }} title="داشبورد مدیریت" sub="نمای کلی عملکرد وُدّا">
      {(active) => active !== 'dash' ? <Placeholder label={NAV.find((n) => n.id === active)!.label} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }} className="why-grid">
            <StatCard icon="users" label="کل کاربران" value={faDigits('8٬420')} tone="info" delta="۶٪+" />
            <StatCard icon="award" label="اساتید فعال" value={faDigits(812)} tone="olive" delta="۴٪+" />
            <StatCard icon="checkCircle" label="جلسات این ماه" value={faDigits('3٬150')} tone="gold" delta="۱۱٪+" />
            <StatCard icon="coins" label="درآمد کارمزد (ماه)" value={`${faDigits(48)} م ت`} tone="clay" delta="۹٪+" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }} className="hero-grid">
            <Panel title="اساتید در انتظار تأیید" action="صف کامل" pad={false}>
              {PENDING.map((t, i) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < PENDING.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                  <Avatar size={42} emoji={t.field.includes('مداحی') ? '🎤' : '📖'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{t.field} · {t.city}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink-3)' }}><Icon name="doc" size={14} />{faDigits(t.docs)} مدرک</span>
                  <StatusTag status="review" />
                  <button style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '7px 14px', borderRadius: 999 }}>بررسی</button>
                </div>
              ))}
            </Panel>
            <Panel title="رشد کاربران">
              <MiniBars data={[3.1, 3.9, 4.6, 5.4, 6.8, 8.4]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} color="var(--olive-400)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-3)' }}>نرخ رشد ماهانه</span>
                <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>۲۳٪+</span>
              </div>
            </Panel>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="hero-grid">
            <Panel title="تراکنش‌های اخیر" action="همه" pad={false}>
              {TX.map((x, i) => {
                const credit = x.amount > 0;
                const isFee = x.type === 'fee';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', borderBottom: i < TX.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isFee ? 'var(--olive-100)' : credit ? 'var(--gold-bg)' : 'var(--clay-bg)', color: isFee ? 'var(--olive-700)' : credit ? '#9A7426' : 'var(--clay)' }}>
                      <Icon name={isFee ? 'coins' : credit ? 'download' : 'logout'} size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{x.date}</div>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: credit ? 'var(--olive-700)' : 'var(--ink)' }}>{credit ? '+' : '−'}{faDigits(Math.abs(x.amount).toLocaleString('en-US'))}</span>
                  </div>
                );
              })}
            </Panel>
            <Panel title="ترکیب خدمات">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {BREAKDOWN.map(([label, pct, c]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 800, color: c }}>{faDigits(pct)}٪</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: 'var(--sand-100)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-3)' }}>کل جلسات این ماه</span>
                <span style={{ fontWeight: 800 }}>{faDigits('3٬150')}</span>
              </div>
            </Panel>
          </div>
        </>
      )}
    </PanelShell>
  );
}
