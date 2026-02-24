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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type WalletTransactionsResponse } from "@/lib/api/client";

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletTransactionsResponse | null>(null);
  const [amount, setAmount] = useState(100000);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await api.wallet.transactions();
      setWallet(res);
    } catch {
      setMessage("دریافت کیف پول ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const initiateTopup = async () => {
    setMessage(null);
    try {
      const res = await api.wallet.topupInitiate(amount);
      setReferenceId(res.reference_id);
      setMessage(`درخواست شارژ ایجاد شد. ref: ${res.reference_id}`);
    } catch {
      setMessage("شروع شارژ ناموفق بود.");
    }
  };

  const verifyTopup = async () => {
    if (!referenceId) {
      setMessage("اول باید شروع شارژ انجام شود.");
      return;
    }
    setMessage(null);
    try {
      const res = await api.wallet.topupVerify(referenceId, amount);
      setMessage(res.already_done ? "این شارژ قبلا تایید شده بود." : "شارژ کیف پول تایید شد.");
      await fetchWallet();
    } catch {
      setMessage("تایید شارژ ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">کیف پول</h1>
        <p className="text-muted-foreground">موجودی و تراکنش‌ها</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>موجودی</CardTitle>
          <CardDescription>اعتبار قابل استفاده</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-bold">
            {wallet?.balance?.toLocaleString("fa-IR") ?? "۰"} تومان
          </p>
          <div className="space-y-2">
            <Label htmlFor="amount">مبلغ شارژ</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={initiateTopup}>
              شروع شارژ
            </Button>
            <Button size="sm" variant="outline" onClick={verifyTopup}>
              تایید شارژ (MVP)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تراکنش‌های اخیر</CardTitle>
          <CardDescription>تاریخچه واریز و برداشت</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : wallet?.transactions?.length ? (
            wallet.transactions.map((tx) => (
              <div key={tx.id} className="rounded border p-3 text-sm">
                <p>نوع: {tx.type}</p>
                <p>مبلغ: {tx.amount.toLocaleString("fa-IR")}</p>
                <p>توضیح: {tx.description || "-"}</p>
                <p className="text-muted-foreground">{new Date(tx.created_at).toLocaleString("fa-IR")}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">تراکنشی ثبت نشده است.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
