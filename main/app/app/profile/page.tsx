"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/lib/auth/auth-context";

export default function ProfilePage() {
  const { user, refetchMe, switchRole } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [teacherSpecialty, setTeacherSpecialty] = useState("آموزش قرآن کریم");
  const [teacherLevel, setTeacherLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherPrice, setTeacherPrice] = useState(200000);

  const currentRoles = useMemo(() => user?.roles ?? [], [user?.roles]);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const onSave = async () => {
    if (!name.trim()) {
      setMessage("نام نمی‌تواند خالی باشد.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.auth.updateProfile(name.trim());
      await refetchMe({ clearTokenOnError: false });
      setMessage("پروفایل با موفقیت به‌روزرسانی شد.");
    } catch {
      setMessage("به‌روزرسانی پروفایل ناموفق بود.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmitTeacherProfile = async () => {
    setMessage(null);
    try {
      await api.teachers.upsertProfile({
        specialty: teacherSpecialty,
        level: teacherLevel,
        bio: teacherBio,
        price_per_30min: teacherPrice,
      });
      await refetchMe({ clearTokenOnError: false });
      setMessage("درخواست پروفایل استاد ثبت شد و نیازمند تایید ادمین است.");
    } catch {
      setMessage("ثبت درخواست استاد ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader>
            <CardTitle>اطلاعات شخصی</CardTitle>
            <CardDescription>نام و اطلاعات تماس شما</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">نام</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام شما" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">شماره موبایل</Label>
              <Input id="mobile" type="tel" value={user?.mobile ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activeRole">نقش فعال</Label>
              <Input id="activeRole" value={user?.active_role ?? "-"} disabled />
            </div>
            <div className="md:col-span-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>تعویض نقش</CardTitle>
            <CardDescription>نقش فعلی را سریع تغییر دهید</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentRoles.map((role) => (
              <Button
                key={role}
                className="w-full justify-start"
                variant={role === user?.active_role ? "default" : "outline"}
                onClick={async () => {
                  setMessage(null);
                  const ok = await switchRole(role as "learner" | "teacher" | "admin");
                  setMessage(ok ? "نقش فعال تغییر کرد." : "تغییر نقش ناموفق بود.");
                }}
              >
                {role === "learner" && "قرآن‌آموز"}
                {role === "teacher" && "استاد"}
                {role === "admin" && "ادمین"}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>درخواست پروفایل استاد</CardTitle>
          <CardDescription>برای فعال شدن نقش استاد این فرم را تکمیل کنید</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teacherSpecialty">تخصص</Label>
            <Input id="teacherSpecialty" value={teacherSpecialty} onChange={(e) => setTeacherSpecialty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacherLevel">سطح</Label>
            <select
              id="teacherLevel"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={teacherLevel}
              onChange={(e) => setTeacherLevel(e.target.value as "beginner" | "intermediate" | "advanced")}
            >
              <option value="beginner">مبتدی</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">پیشرفته</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="teacherBio">بیوگرافی</Label>
            <Input id="teacherBio" value={teacherBio} onChange={(e) => setTeacherBio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacherPrice">قیمت هر ۳۰ دقیقه</Label>
            <Input
              id="teacherPrice"
              type="number"
              value={teacherPrice}
              onChange={(e) => setTeacherPrice(Number(e.target.value || 0))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onSubmitTeacherProfile}>ثبت درخواست استاد</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
