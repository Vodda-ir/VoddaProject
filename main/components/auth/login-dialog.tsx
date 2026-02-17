"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { setAccessToken } from "@/lib/auth/token";
import { cn } from "@/lib/utils";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuth();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otpVisible, setOtpVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setError(null);
    const trimmed = mobile.trim().replace(/\D/g, "");
    if (!trimmed) {
      setError("شماره موبایل را وارد کنید.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.requestOtp(trimmed);
      setOtpVisible(true);
      setStep("otp");
      setCode("");
    } catch {
      setError("ارسال کد با خطا مواجه شد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    const trimmedMobile = mobile.trim().replace(/\D/g, "");
    if (!trimmedMobile || !code.trim()) {
      setError("شماره و کد را وارد کنید.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(trimmedMobile, code.trim());
      setAccessToken(res.access_token);
      await login(res.access_token);
      onOpenChange(false);
      setStep("phone");
      setOtpVisible(false);
      setMobile("");
      setCode("");
    } catch {
      setError("کد نامعتبر یا منقضی است.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep("phone");
      setOtpVisible(false);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>ورود به وُدّا</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="mobile">شماره موبایل</Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              disabled={step === "otp"}
              className="font-medium placeholder:font-normal"
            />
          </div>

          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              otpVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 pt-2">
                <Label htmlFor="otp">کد تأیید</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="۶ رقم"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="font-medium placeholder:font-normal"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          {step === "phone" ? (
            <Button onClick={handleRequestOtp} disabled={loading}>
              {loading ? "در حال ارسال…" : "دریافت کد"}
            </Button>
          ) : (
            <Button onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "در حال بررسی…" : "تأیید و ورود"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
