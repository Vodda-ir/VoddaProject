"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

type RequireAdminProps = {
  children: ReactNode;
  loginPath?: string;
};

export function RequireAdmin({
  children,
  loginPath = "/admin/login",
}: RequireAdminProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === loginPath;

  useEffect(() => {
    if (isLoginPage) return;
    if (loading) return;
    if (!user) {
      router.replace(loginPath);
      return;
    }
    if (!user.roles.includes("admin")) {
      router.replace("/");
    }
  }, [user, loading, router, loginPath, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">در حال بارگذاری…</p>
      </div>
    );
  }

  if (!user || !user.roles.includes("admin")) {
    return null;
  }

  return <>{children}</>;
}
