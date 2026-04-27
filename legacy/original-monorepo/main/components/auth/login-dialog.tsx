"use client";

import { useState, useEffect } from "react";
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
import { InputOTP } from "@/components/ui/input-otp";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

const MOBILE_REGEX = /^09\d{9}$/;
const OTP_VALID_SECONDS = 120;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

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
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  const handleRequestOtp = async () => {
    setError(null);
    const trimmed = mobile.trim().replace(/\D/g, "");
    if (!trimmed) {
      setError("شماره موبایل را وارد کنید.");
      return;
    }
    if (!MOBILE_REGEX.test(trimmed)) {
      setError("شماره موبایل باید به صورت 09xxxxxxxxx باشد");
      return;
    }
    setLoading(true);
    try {
      await api.auth.requestOtp(trimmed);
      setOtpVisible(true);
      setStep("otp");
      setCode("");
      setCountdownSeconds(OTP_VALID_SECONDS);
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
      setCountdownSeconds(0);
    }
    onOpenChange(next);
  };

  const handleChangeNumber = () => {
    setStep("phone");
    setOtpVisible(false);
    setCode("");
    setError(null);
    setCountdownSeconds(0);
  };

  const handleResendOtp = async () => {
    setError(null);
    if (countdownSeconds > 0) {
      setError("کد قبلی هنوز معتبره");
      return;
    }
    const trimmed = mobile.trim().replace(/\D/g, "");
    if (!trimmed || !MOBILE_REGEX.test(trimmed)) return;
    setLoading(true);
    try {
      await api.auth.requestOtp(trimmed);
      setCountdownSeconds(OTP_VALID_SECONDS);
      setCode("");
    } catch {
      setError("ارسال کد با خطا مواجه شد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showClose={true} className="rounded-3xl bg-background/80 backdrop-blur-md border-white/20">
        <DialogHeader>
          <DialogTitle>ورود به وُدّا</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="mobile">شماره موبایل</Label>
            <div className="relative">
              <svg
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <Input
                id="mobile"
                type="tel"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                disabled={step === "otp"}
                className="text-center pl-10 pr-10 font-medium placeholder:font-normal rounded-2xl"
              />
            </div>
          </div>

          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              otpVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 pt-2">
                <Label htmlFor="otp">کد تأیید</Label>
                <div dir="ltr" className="flex justify-center">
                  <InputOTP
                    id="otp"
                    maxLength={5}
                    value={code}
                    onChange={setCode}
                    dir="ltr"
                    containerClassName="justify-center"
                  />
                </div>
                {countdownSeconds > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    اعتبار کد: {formatCountdown(countdownSeconds)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {step === "phone" ? (
            <Button onClick={handleRequestOtp} disabled={loading}>
              {loading ? "در حال ارسال…" : "دریافت کد"}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleChangeNumber}>
                تغییر شماره
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendOtp}
                disabled={countdownSeconds > 0 || loading}
              >
                ارسال مجدد
              </Button>
              <Button onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "در حال بررسی…" : "تأیید و ورود"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
