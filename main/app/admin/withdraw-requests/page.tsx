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
import { api, type WithdrawRequestItem } from "@/lib/api/client";

export default function WithdrawRequestsPage() {
  const [items, setItems] = useState<WithdrawRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.wallet.adminListWithdrawRequests();
      setItems(res.items);
    } catch {
      setMessage("دریافت درخواست‌های برداشت ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const process = async (id: number, action: "approved" | "rejected" | "paid") => {
    setMessage(null);
    try {
      await api.wallet.adminProcessWithdrawRequest(id, action);
      setMessage("وضعیت درخواست برداشت به‌روزرسانی شد.");
      await fetchItems();
    } catch {
      setMessage("پردازش درخواست برداشت ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">درخواست‌های برداشت</h1>
        <p className="text-muted-foreground">لیست درخواست‌های برداشت اساتید</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">درخواست برداشتی ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>درخواست #{item.id}</CardTitle>
                <CardDescription>
                  {item.user_name || "کاربر"} ({item.user_mobile}) - {item.amount.toLocaleString("fa-IR")} تومان
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">وضعیت: {item.status}</p>
                <p className="text-sm text-muted-foreground">بانک: {item.bank_info || "-"}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => process(item.id, "approved")}>
                    تایید اولیه
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => process(item.id, "paid")}>
                    تایید پرداخت
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => process(item.id, "rejected")}>
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
