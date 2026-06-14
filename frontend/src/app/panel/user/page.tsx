'use client';

import { PanelShell, StatCard, Placeholder, type NavItem } from '@/components/PanelShell';

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: '▦' },
  { id: 'sessions', label: 'جلسات من', icon: '📅' },
  { id: 'favorites', label: 'اساتید دلخواه', icon: '❤' },
  { id: 'wallet', label: 'کیف پول', icon: '👛' },
  { id: 'messages', label: 'پیام‌ها', icon: '✉' },
  { id: 'settings', label: 'تنظیمات', icon: '⚙' },
];

export default function UserPanel() {
  return (
    <PanelShell title="پنل قرآن‌آموز" nav={NAV}>
      {(active) =>
        active === 'dashboard' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="جلسات پیش‌رو" value="۲" icon="📅" hint="نزدیک‌ترین: فردا ۱۸:۰۰" />
            <StatCard label="جلسات برگزارشده" value="۷" icon="✅" />
            <StatCard label="اساتید دلخواه" value="۳" icon="❤" />
            <StatCard label="موجودی کیف پول" value="۱۰۵٬۰۰۰" icon="👛" hint="تومان" />
          </div>
        ) : (
          <Placeholder label={NAV.find((n) => n.id === active)!.label} />
        )
      }
    </PanelShell>
  );
}
