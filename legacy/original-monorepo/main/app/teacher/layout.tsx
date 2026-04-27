import { RequireTeacher } from "@/components/auth/require-teacher";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const navItems = [
  { href: "/teacher/dashboard", label: "داشبورد مربی" },
  { href: "/teacher/sessions", label: "جلسات" },
  { href: "/teacher/income", label: "درآمد" },
  { href: "/app/profile", label: "پروفایل" },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireTeacher>
      <DashboardShell
        title="پنل مربی"
        subtitle="کنترل رزروها، درآمد و تنظیمات حرفه‌ای"
        panelLabel="Teacher Panel"
        navItems={navItems}
      >
        {children}
      </DashboardShell>
    </RequireTeacher>
  );
}
