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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد مربی</h1>
        <p className="text-muted-foreground">خوش آمدید به پنل مربی وُدّا</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>جلسات</CardTitle>
            <CardDescription>جلسات رزرو شده و در انتظار تأیید</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/sessions">مشاهده جلسات</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>درآمد</CardTitle>
            <CardDescription>موجودی و درخواست برداشت</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/income">مشاهده درآمد</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>پروفایل استاد</CardTitle>
          <CardDescription>تکمیل اطلاعات برای تأیید توسط ادمین</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="specialty">تخصص</Label>
            <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">سطح</Label>
            <select
              id="level"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value as "beginner" | "intermediate" | "advanced")}
            >
              <option value="beginner">مبتدی</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">پیشرفته</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">بیوگرافی</Label>
            <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="معرفی کوتاه" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">قیمت هر ۳۰ دقیقه</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value || 0))} />
          </div>
          <Button onClick={saveProfile}>ثبت/به‌روزرسانی پروفایل</Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
