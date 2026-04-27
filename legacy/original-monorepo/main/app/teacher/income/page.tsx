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

export default function TeacherIncomePage() {
  const [wallet, setWallet] = useState<WalletTransactionsResponse | null>(null);
  const [amount, setAmount] = useState(50000);
  const [bankInfo, setBankInfo] = useState('{"iban":"IR..."}');
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.wallet.transactions();
      setWallet(res);
    } catch {
      setMessage("دریافت اطلاعات درآمد ناموفق بود.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestWithdraw = async () => {
    setMessage(null);
    try {
      await api.wallet.withdrawRequest(amount, bankInfo);
      setMessage("درخواست برداشت ثبت شد.");
      await load();
    } catch {
      setMessage("ثبت درخواست برداشت ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>}

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>موجودی قابل برداشت</CardTitle>
            <CardDescription>اعتبار حاصل از جلسات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-2xl bg-slate-900 px-4 py-6 text-center text-2xl font-black text-white">
              {wallet?.balance?.toLocaleString("fa-IR") ?? "۰"} تومان
            </p>
            <div className="space-y-2">
              <Label htmlFor="amount">مبلغ برداشت</Label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankInfo">اطلاعات بانکی (JSON)</Label>
              <Input id="bankInfo" value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} />
            </div>
            <Button className="w-full" onClick={requestWithdraw}>درخواست برداشت</Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>تراکنش‌های اخیر</CardTitle>
            <CardDescription>گردش مالی کیف پول شما</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {wallet?.transactions?.length ? (
              wallet.transactions.map((tx) => (
                <div key={tx.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="grid gap-1 sm:grid-cols-2">
                    <p>نوع: {tx.type}</p>
                    <p>مبلغ: {tx.amount.toLocaleString("fa-IR")}</p>
                  </div>
                  <p className="mt-1 text-slate-600">{tx.description || "-"}</p>
                  <p className="mt-2 text-xs text-slate-500">{new Date(tx.created_at).toLocaleString("fa-IR")}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">تراکنشی ثبت نشده است.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
