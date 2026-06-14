'use client';

import { PanelShell, StatCard, Placeholder, type NavItem } from '@/components/PanelShell';

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: '▦' },
  { id: 'users', label: 'کاربران', icon: '👥' },
  { id: 'teachers', label: 'اساتید', icon: '🎓' },
  { id: 'sessions', label: 'جلسات', icon: '📅' },
  { id: 'transactions', label: 'تراکنش‌ها', icon: '💳' },
  { id: 'withdrawals', label: 'برداشت‌ها', icon: '💸' },
  { id: 'reports', label: 'گزارش‌ها', icon: '📊' },
  { id: 'settings', label: 'تنظیمات', icon: '⚙' },
];

export default function AdminPanel() {
  return (
    <PanelShell title="پنل مدیریت" nav={NAV}>
      {(active) =>
        active === 'dashboard' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="کاربران" value="۱٬۲۴۰" icon="👥" />
            <StatCard label="اساتید فعال" value="۸۶" icon="🎓" hint="۷ در انتظار تأیید" />
            <StatCard label="جلسات برگزارشده" value="۳٬۵۲۰" icon="📅" />
            <StatCard label="درآمد کارمزد" value="۴۲٬۵۰۰٬۰۰۰" icon="💲" hint="تومان" />
          </div>
        ) : (
          <Placeholder label={NAV.find((n) => n.id === active)!.label} />
        )
      }
    </PanelShell>
  );
}
