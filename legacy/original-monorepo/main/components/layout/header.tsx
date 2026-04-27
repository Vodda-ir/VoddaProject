"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { LoginDialog } from "@/components/auth/login-dialog";

export function Header() {
  const { user, loading, logout, switchRole } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/" className="font-bold text-lg text-primary">
            وُدّا
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              درباره ما
            </Link>
            <Link
              href="/teachers"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              اساتید
            </Link>
            {!loading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {user.name?.trim() || user.mobile || "پروفایل"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuLabel>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {user.name?.trim() || "کاربر"}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {user.mobile}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/app/dashboard">پنل کاربری</Link>
                      </DropdownMenuItem>
                      {user.roles.includes("teacher") && (
                        <DropdownMenuItem asChild>
                          <Link href="/teacher/dashboard">پنل مربی</Link>
                        </DropdownMenuItem>
                      )}
                      {user.roles.includes("admin") && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin/teachers/pending">پنل ادمین</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>نقش فعال: {user.active_role}</DropdownMenuLabel>
                      {user.roles.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          disabled={switchingRole !== null || role === user.active_role}
                          onClick={async () => {
                            setSwitchingRole(role);
                            await switchRole(role as "learner" | "teacher" | "admin");
                            setSwitchingRole(null);
                          }}
                        >
                          {role === "learner" && "قرآن‌آموز"}
                          {role === "teacher" && "استاد"}
                          {role === "admin" && "ادمین"}
                          {switchingRole === role ? " (در حال تغییر...)" : ""}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="text-destructive focus:text-destructive"
                      >
                        خروج
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button size="sm" onClick={() => setLoginOpen(true)}>
                    ورود
                  </Button>
                )}
              </>
            )}
          </nav>
          <div className="md:hidden">
            <Button variant="outline" size="sm" onClick={() => setMobileMenuOpen((prev) => !prev)}>
              {mobileMenuOpen ? "بستن" : "منو"}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <div className="container grid gap-2 px-4 py-3">
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground"
              >
                درباره ما
              </Link>
              <Link
                href="/teachers"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground"
              >
                اساتید
              </Link>
              {!loading && !user && (
                <Button
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLoginOpen(true);
                  }}
                >
                  ورود
                </Button>
              )}
              {!loading && user && (
                <>
                  <Link
                    href="/app/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground"
                  >
                    پنل کاربری
                  </Link>
                  {user.roles.includes("teacher") && (
                    <Link
                      href="/teacher/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground"
                    >
                      پنل مربی
                    </Link>
                  )}
                  {user.roles.includes("admin") && (
                    <Link
                      href="/admin/teachers/pending"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground"
                    >
                      پنل ادمین
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                  >
                    خروج
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
