'use client';

import { PanelShell, StatCard, Placeholder, type NavItem } from '@/components/PanelShell';

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: '▦' },
  { id: 'requests', label: 'درخواست‌ها', icon: '✉' },
  { id: 'sessions', label: 'جلسات', icon: '📅' },
  { id: 'services', label: 'خدمات من', icon: '🎓' },
  { id: 'worktimes', label: 'زمان‌های کاری', icon: '⏰' },
  { id: 'wallet', label: 'کیف پول', icon: '👛' },
  { id: 'reviews', label: 'نظرات', icon: '★' },
];

export default function TeacherPanel() {
  return (
    <PanelShell title="پنل استاد" nav={NAV}>
      {(active) =>
        active === 'dashboard' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="درخواست‌های جدید" value="۴" icon="✉" hint="نیازمند پاسخ" />
            <StatCard label="جلسات این هفته" value="۹" icon="📅" />
            <StatCard label="میانگین امتیاز" value="۴٫۹" icon="★" />
            <StatCard label="درآمد قابل برداشت" value="۱٬۲۴۰٬۰۰۰" icon="👛" hint="تومان" />
          </div>
        ) : (
          <Placeholder label={NAV.find((n) => n.id === active)!.label} />
        )
      }
    </PanelShell>
  );
}
