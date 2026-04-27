"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type TeacherSummary } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TeachersPage() {
  const [query, setQuery] = useState("");
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.teachers.list({ query: q?.trim() || undefined });
      setTeachers(res.items);
    } catch {
      setError("دریافت لیست اساتید ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">لیست اساتید</h1>
            <p className="text-muted-foreground mt-2">اساتید تأیید شده در پلتفرم</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو بر اساس نام یا تخصص"
              className="w-64"
            />
            <Button onClick={() => fetchTeachers(query)}>جستجو</Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        ) : teachers.length === 0 ? (
          <p className="text-muted-foreground">استادی پیدا نشد.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teachers.map((teacher) => (
              <Card key={teacher.id}>
                <CardHeader>
                  <CardTitle>{teacher.name || `استاد #${teacher.id}`}</CardTitle>
                  <CardDescription>
                    {teacher.specialty} - {teacher.level}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-3">{teacher.bio || "بدون توضیح"}</p>
                  <p className="text-sm">هزینه ۳۰ دقیقه: {teacher.price_per_30min.toLocaleString("fa-IR")} تومان</p>
                  <p className="text-sm">میانگین امتیاز: {teacher.average_rating.toFixed(1)}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/bookings?teacherId=${teacher.id}`}>رزرو جلسه</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Link href="/" className="text-primary hover:underline inline-block">
          بازگشت
        </Link>
      </div>
    </main>
  );
}
