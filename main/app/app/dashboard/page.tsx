"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
        <p className="text-muted-foreground">خوش آمدید به پنل کاربری وُدّا</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>جلسات من</CardTitle>
            <CardDescription>مشاهده و مدیریت جلسات رزرو شده</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/bookings">مشاهده جلسات</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>کیف پول</CardTitle>
            <CardDescription>موجودی و تراکنش‌ها</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/wallet">مشاهده کیف پول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>اعلان‌ها</CardTitle>
          <CardDescription>آخرین اعلان‌های حساب شما</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">اعلانی ندارید.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground">{n.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>پروفایل</CardTitle>
          <CardDescription>ویرایش اطلاعات حساب کاربری</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/profile">رفتن به پروفایل</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
