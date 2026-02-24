"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type BookingSummary, type TeacherSummary } from "@/lib/api/client";

function toTimeWithSeconds(v: string) {
  return v.length === 5 ? `${v}:00` : v;
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const selectedTeacherIdFromQuery = searchParams.get("teacherId");

  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [teacherId, setTeacherId] = useState(selectedTeacherIdFromQuery ?? "");
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("10:00");
  const [slotEnd, setSlotEnd] = useState("10:30");
  const [notes, setNotes] = useState("");

  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [ratingComments, setRatingComments] = useState<Record<number, string>>({});

  const acceptedOrPending = useMemo(
    () => bookings.filter((b) => b.status === "pending" || b.status === "accepted"),
    [bookings]
  );
  const history = useMemo(
    () => bookings.filter((b) => b.status === "completed" || b.status === "rejected" || b.status === "cancelled"),
    [bookings]
  );

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [teachersRes, bookingsRes] = await Promise.all([
        api.teachers.list(),
        api.bookings.listMy(),
      ]);
      setTeachers(teachersRes.items);
      setBookings(bookingsRes.items);
    } catch {
      setMessage("دریافت اطلاعات جلسات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createBooking = async () => {
    setMessage(null);
    const id = Number(teacherId);
    if (!id || !slotDate || !slotStart || !slotEnd) {
      setMessage("همه فیلدهای رزرو را کامل کنید.");
      return;
    }
    try {
      await api.bookings.create({
        teacher_profile_id: id,
        slot_date: slotDate,
        slot_start: toTimeWithSeconds(slotStart),
        slot_end: toTimeWithSeconds(slotEnd),
        notes,
      });
      setMessage("درخواست رزرو ثبت شد.");
      setNotes("");
      await fetchData();
    } catch {
      setMessage("ثبت رزرو ناموفق بود. ممکن است بازه زمانی قبلاً رزرو شده باشد.");
    }
  };

  const submitRating = async (bookingId: number, score: number) => {
    setMessage(null);
    try {
      await api.ratings.create({
        booking_id: bookingId,
        score,
        comment: ratingComments[bookingId] || "",
      });
      setMessage("امتیاز ثبت شد.");
    } catch {
      setMessage("ثبت امتیاز ناموفق بود (ممکن است قبلا ثبت شده باشد).");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جلسات من</h1>
        <p className="text-muted-foreground">ثبت رزرو جدید و پیگیری وضعیت جلسه‌ها</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>رزرو جلسه جدید</CardTitle>
          <CardDescription>استاد، تاریخ و زمان جلسه را انتخاب کنید</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teacher">استاد</Label>
            <select
              id="teacher"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">انتخاب استاد</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || `استاد #${t.id}`} - {t.specialty}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slotDate">تاریخ</Label>
            <Input id="slotDate" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slotStart">شروع</Label>
            <Input id="slotStart" type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slotEnd">پایان</Label>
            <Input id="slotEnd" type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">توضیحات</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختیاری" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={createBooking}>ثبت رزرو</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>جلسات فعال</CardTitle>
          <CardDescription>رزروهای در انتظار و تأییدشده</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : acceptedOrPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">جلسه فعالی ندارید.</p>
          ) : (
            acceptedOrPending.map((b) => (
              <div key={b.id} className="rounded-md border p-3 text-sm">
                <p>استاد: {b.teacher_name || `#${b.teacher_profile_id}`}</p>
                <p>
                  زمان: {b.slot_date} | {b.slot_start} - {b.slot_end}
                </p>
                <p>وضعیت: {b.status}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تاریخچه جلسات</CardTitle>
          <CardDescription>جلسات تکمیل‌شده یا ردشده</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
          ) : (
            history.map((b) => (
              <div key={b.id} className="rounded-md border p-3 text-sm">
                <p>استاد: {b.teacher_name || `#${b.teacher_profile_id}`}</p>
                <p>
                  زمان: {b.slot_date} | {b.slot_start} - {b.slot_end}
                </p>
                <p>وضعیت: {b.status}</p>
                {b.status === "completed" && (
                  <div className="mt-3 space-y-2">
                    <Input
                      value={ratingComments[b.id] || ""}
                      onChange={(e) =>
                        setRatingComments((prev) => ({ ...prev, [b.id]: e.target.value }))
                      }
                      placeholder="نظر شما (اختیاری)"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitRating(b.id, 5)}>
                        ثبت امتیاز ۵
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => submitRating(b.id, 4)}>
                        ثبت امتیاز ۴
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
