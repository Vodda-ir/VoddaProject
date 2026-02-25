"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardNavItem = {
  href: string;
  label: string;
};

type DashboardShellProps = {
  title: string;
  subtitle: string;
  panelLabel: string;
  navItems: DashboardNavItem[];
  children: React.ReactNode;
};

export function DashboardShell({
  title,
  subtitle,
  panelLabel,
  navItems,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentItem = useMemo(() => {
    return (
      navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0]
    );
  }, [navItems, pathname]);

  return (
    <div className="relative min-h-screen bg-slate-100/70">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.10),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_40%)]" />
      <div className="relative mx-auto flex w-full max-w-[1400px] gap-4 px-3 pb-6 pt-4 sm:px-4 md:gap-6 md:px-6 md:pt-6">
        <aside className="sticky top-20 hidden h-[calc(100vh-6.5rem)] w-72 shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5">
              <p className="text-xs font-semibold text-primary">{panelLabel}</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <span>{item.label}</span>
                    <span className={cn("text-xs", active ? "text-primary-foreground/85" : "text-slate-400")}>•</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-3">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">بازگشت به سایت</Link>
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-primary">{panelLabel}</p>
                <p className="text-sm font-bold text-slate-900">{currentItem?.label ?? title}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMobileOpen((prev) => !prev)}>
                {mobileOpen ? "بستن منو" : "منو"}
              </Button>
            </div>
            {mobileOpen && (
              <nav className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
                {navItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-medium",
                        active ? "bg-primary text-primary-foreground" : "bg-slate-50 text-slate-700"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  بازگشت به سایت
                </Link>
              </nav>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
              <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <main className="p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
