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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">درآمد</h1>
        <p className="text-muted-foreground">موجودی و درخواست برداشت</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>موجودی قابل برداشت</CardTitle>
          <CardDescription>اعتبار حاصل از جلسات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-bold">{wallet?.balance?.toLocaleString("fa-IR") ?? "۰"} تومان</p>
          <div className="space-y-2">
            <Label htmlFor="amount">مبلغ برداشت</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankInfo">اطلاعات بانکی (JSON)</Label>
            <Input id="bankInfo" value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} />
          </div>
          <Button size="sm" className="mt-2" onClick={requestWithdraw}>
            درخواست برداشت
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
