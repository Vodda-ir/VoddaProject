"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type BookingSummary } from "@/lib/api/client";

export default function TeacherSessionsPage() {
  const [items, setItems] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.bookings.listTeacher();
      setItems(res.items);
    } catch {
      setMessage("دریافت لیست جلسات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onAccept = async (id: number) => {
    setMessage(null);
    try {
      await api.bookings.accept(id);
      setMessage("رزرو پذیرفته شد.");
      await fetchBookings();
    } catch {
      setMessage("پذیرش رزرو ناموفق بود.");
    }
  };

  const onReject = async (id: number) => {
    setMessage(null);
    try {
      await api.bookings.reject(id, "عدم امکان برگزاری در این زمان");
      setMessage("رزرو رد شد.");
      await fetchBookings();
    } catch {
      setMessage("رد رزرو ناموفق بود.");
    }
  };

  const pending = items.filter((b) => b.status === "pending");
  const accepted = items.filter((b) => b.status === "accepted");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جلسات</h1>
        <p className="text-muted-foreground">جلسات رزرو شده و در انتظار تأیید</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>درخواست‌های در انتظار</CardTitle>
          <CardDescription>درخواست‌هایی که باید تأیید یا رد شوند</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">درخواستی در انتظار نیست.</p>
          ) : (
            pending.map((b) => (
              <div key={b.id} className="rounded-md border p-3 text-sm">
                <p>قرآن‌آموز: {b.learner_name || `#${b.learner_id}`}</p>
                <p>
                  زمان: {b.slot_date} | {b.slot_start} - {b.slot_end}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => onAccept(b.id)}>
                    پذیرش
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(b.id)}>
                    رد
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>جلسات پذیرفته شده</CardTitle>
          <CardDescription>جلسات تأییدشده شما</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground">جلسه پذیرفته‌شده‌ای ندارید.</p>
          ) : (
            accepted.map((b) => (
              <div key={b.id} className="rounded-md border p-3 text-sm">
                <p>قرآن‌آموز: {b.learner_name || `#${b.learner_id}`}</p>
                <p>
                  زمان: {b.slot_date} | {b.slot_start} - {b.slot_end}
                </p>
                <p>وضعیت: {b.status}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
