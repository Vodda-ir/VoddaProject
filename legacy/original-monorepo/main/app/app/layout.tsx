import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const navItems = [
  { href: "/app/dashboard", label: "داشبورد" },
  { href: "/app/bookings", label: "جلسات" },
  { href: "/app/wallet", label: "کیف پول" },
  { href: "/app/profile", label: "پروفایل" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DashboardShell
        title="پنل کاربری"
        subtitle="مدیریت جلسه‌ها، کیف پول و تنظیمات حساب"
        panelLabel="Learner Panel"
        navItems={navItems}
      >
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
