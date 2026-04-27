"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type NotificationItem } from "@/lib/api/client";

export default function DashboardPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    api.notifications
      .list()
      .then((res) => setNotifications(res.items.slice(0, 5)))
      .catch(() => setNotifications([]));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader className="pb-2">
            <CardDescription>اعلان‌های جدید</CardDescription>
            <CardTitle className="text-2xl">{unreadCount.toLocaleString("fa-IR")}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader className="pb-2">
            <CardDescription>همه اعلان‌ها</CardDescription>
            <CardTitle className="text-2xl">{notifications.length.toLocaleString("fa-IR")}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 bg-slate-50/70 sm:col-span-2 xl:col-span-2">
          <CardHeader className="pb-3">
            <CardDescription>اقدامات سریع</CardDescription>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/app/bookings">رزرو جلسه</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/wallet">شارژ کیف پول</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/profile">ویرایش پروفایل</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>میانبرهای پنل</CardTitle>
            <CardDescription>دسترسی سریع به بخش‌های پرکاربرد</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/app/bookings" className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
              <p className="font-semibold text-slate-900">جلسات من</p>
              <p className="mt-1 text-sm text-slate-500">مدیریت درخواست‌ها و امتیازدهی</p>
            </Link>
            <Link href="/app/wallet" className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
              <p className="font-semibold text-slate-900">کیف پول</p>
              <p className="mt-1 text-sm text-slate-500">مشاهده موجودی و تراکنش‌ها</p>
            </Link>
            <Link href="/app/profile" className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 sm:col-span-2">
              <p className="font-semibold text-slate-900">پروفایل و نقش‌ها</p>
              <p className="mt-1 text-sm text-slate-500">تغییر نقش فعال و تکمیل اطلاعات حساب</p>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>آخرین اعلان‌ها</CardTitle>
            <CardDescription>به‌روزرسانی‌های مهم حساب شما</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
                اعلانی ندارید.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    {!n.read_at && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">جدید</span>}
                  </div>
                  <p className="text-slate-600">{n.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
