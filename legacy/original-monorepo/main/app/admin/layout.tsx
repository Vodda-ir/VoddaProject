import { RequireAdmin } from "@/components/auth/require-admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const navItems = [
  { href: "/admin/teachers/pending", label: "اساتید در انتظار" },
  { href: "/admin/withdraw-requests", label: "درخواست برداشت" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAdmin>
      <DashboardShell
        title="پنل ادمین"
        subtitle="بررسی اساتید و مدیریت مالی پلتفرم"
        panelLabel="Admin Panel"
        navItems={navItems}
      >
        {children}
      </DashboardShell>
    </RequireAdmin>
  );
}
