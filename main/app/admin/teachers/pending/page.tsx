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
import { api, type TeacherSummary } from "@/lib/api/client";

export default function PendingTeachersPage() {
  const [items, setItems] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.teachers.adminPending();
      setItems(res.items);
    } catch {
      setMessage("دریافت لیست اساتید ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const updateStatus = async (id: number, action: "approve" | "reject") => {
    setMessage(null);
    try {
      if (action === "approve") {
        await api.teachers.adminApprove(id);
      } else {
        await api.teachers.adminReject(id);
      }
      setMessage("وضعیت استاد به‌روزرسانی شد.");
      await fetchPending();
    } catch {
      setMessage("به‌روزرسانی وضعیت استاد ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">اساتید در انتظار تأیید</h1>
        <p className="text-muted-foreground">لیست پروفایل‌های در انتظار بررسی و تأیید</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {loading ? (
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">در حال حاضر درخواستی در صف تأیید نیست.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader>
                <CardTitle>{teacher.name || `استاد #${teacher.id}`}</CardTitle>
                <CardDescription>
                  {teacher.specialty} - {teacher.level} - {teacher.price_per_30min.toLocaleString("fa-IR")} تومان
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{teacher.bio || "بدون توضیح"}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(teacher.id, "approve")}>
                    تأیید
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(teacher.id, "reject")}>
                    رد
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
