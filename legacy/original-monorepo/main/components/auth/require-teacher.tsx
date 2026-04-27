"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

type RequireTeacherProps = {
  children: ReactNode;
};

export function RequireTeacher({ children }: RequireTeacherProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!user.roles.includes("teacher")) {
      router.replace("/app/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">در حال بارگذاری…</p>
      </div>
    );
  }

  if (!user || !user.roles.includes("teacher")) {
    return null;
  }

  return <>{children}</>;
}
