"use client";

import { useState } from "react";
import Link from "next/link";
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
import { api } from "@/lib/api/client";

export default function TeacherDashboardPage() {
  const [specialty, setSpecialty] = useState("آموزش قرآن کریم");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState(200000);
  const [message, setMessage] = useState<string | null>(null);

  const saveProfile = async () => {
    setMessage(null);
    try {
      await api.teachers.upsertProfile({
        specialty,
        level,
        bio,
        price_per_30min: price,
      });
      setMessage("پروفایل استاد ثبت/به‌روزرسانی شد و در انتظار تأیید ادمین قرار گرفت.");
    } catch {
      setMessage("ثبت پروفایل استاد ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle>جلسات مربی</CardTitle>
            <CardDescription>مدیریت درخواست‌های رزرو و زمان‌بندی</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/sessions">مشاهده جلسات</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle>درآمد و برداشت</CardTitle>
            <CardDescription>پیگیری موجودی و ثبت درخواست برداشت</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/income">مشاهده درآمد</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>تکمیل پروفایل تخصصی</CardTitle>
          <CardDescription>این اطلاعات برای تایید ادمین و نمایش در لیست اساتید استفاده می‌شود</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="specialty">تخصص</Label>
            <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">سطح</Label>
            <select
              id="level"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value as "beginner" | "intermediate" | "advanced")}
            >
              <option value="beginner">مبتدی</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">پیشرفته</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">قیمت هر ۳۰ دقیقه</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">بیوگرافی</Label>
            <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="معرفی کوتاه" />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <Button onClick={saveProfile}>ثبت/به‌روزرسانی پروفایل</Button>
            {message && <p className="text-sm text-slate-600">{message}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
