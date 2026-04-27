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
      {message && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>}

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>موجودی کیف پول</CardTitle>
            <CardDescription>مدیریت شارژ حساب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-2xl bg-slate-900 px-4 py-6 text-center text-2xl font-black text-white">
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
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button onClick={initiateTopup}>شروع شارژ</Button>
              <Button variant="outline" onClick={verifyTopup}>
                تایید شارژ (MVP)
              </Button>
            </div>
            {referenceId && <p className="text-xs text-slate-500">Reference: {referenceId}</p>}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>تراکنش‌های اخیر</CardTitle>
            <CardDescription>تاریخچه واریز و برداشت</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">در حال بارگذاری...</p>
            ) : wallet?.transactions?.length ? (
              wallet.transactions.map((tx) => (
                <div key={tx.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="grid gap-1 sm:grid-cols-2">
                    <p>نوع: {tx.type}</p>
                    <p>مبلغ: {tx.amount.toLocaleString("fa-IR")}</p>
                  </div>
                  <p className="mt-1 text-slate-600">توضیح: {tx.description || "-"}</p>
                  <p className="mt-2 text-xs text-slate-500">{new Date(tx.created_at).toLocaleString("fa-IR")}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
                تراکنشی ثبت نشده است.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
