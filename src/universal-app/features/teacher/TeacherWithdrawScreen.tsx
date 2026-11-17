"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import { Button, Card, EmptyState, ErrorState, Icon, LoadingState, SectionHeader, StatusPill, colors, digitsOnly, radii, spacing, toFaDigits, toLatinDigits, typography } from "../../ui";
import { formatDate } from "@/lib/datetime";
import { messageOf } from "../../ui/errorMessage";
import { getWalletSnapshot } from "../wallet/api";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";

type Withdrawal = {
  id: number;
  amount: number;
  card: string;
  sheba: string;
  status: string;
  createdAt: string;
};

function parseWithdrawal(value: unknown): Withdrawal | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asNumber(row.id);
  if (id <= 0) return null;
  return {
    id,
    amount: asNumber(row.amount),
    card: asString(row.card),
    sheba: asString(row.sheba),
    status: asString(row.status, "pending"),
    createdAt: asString(row.created_at),
  };
}

async function getWithdrawals(runtime: PlatformRuntime): Promise<Withdrawal[]> {
  const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/withdrawals");
  return asArray(response.data).map(parseWithdrawal).filter((item): item is Withdrawal => item !== null);
}

async function requestWithdrawal(
  runtime: PlatformRuntime,
  payload: { amount: number; card?: string; sheba?: string },
) {
  await runtime.request<ApiEnvelope<unknown>>("/teacher/withdrawals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function cleanCard(value: string): string {
  return digitsOnly(value, 16);
}

function cleanSheba(value: string): string {
  return toLatinDigits(value).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 26);
}

function cardDisplay(value: string): string {
  return toFaDigits(value.replace(/(\d{4})(?=\d)/g, "$1 "));
}

function dateLabel(value: string): string {
  // باگ persian-dates — تاریخ شمسی از util مرکزی، نه getFullYear میلادی
  return formatDate(new Date(value), "fa", "medium");
}

function statusLabel(status: string): string {
  if (status === "paid") return "پرداخت‌شده";
  if (status === "rejected") return "ردشده";
  return "در انتظار بررسی";
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: 48,
  padding: "10px 12px",
  border: `1px solid ${colors.sand200}`,
  borderRadius: radii.sm,
  background: colors.surface,
  color: colors.ink,
  font: "inherit",
};

export function TeacherWithdrawScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [balance, setBalance] = useState<number | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [card, setCard] = useState("");
  const [sheba, setSheba] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const [wallet, history] = await Promise.all([getWalletSnapshot(runtime), getWithdrawals(runtime)]);
      if (isStale()) return;
      setBalance(wallet.user.wallet);
      setWithdrawals(history);
    } catch (loadError) {
      if (isStale()) return;
      setBalance(null);
      setWithdrawals([]);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const normalizedAmount = Number.parseInt(digitsOnly(amount), 10);
    const normalizedCard = cleanCard(card);
    const normalizedSheba = cleanSheba(sheba);

    setFormError(null);
    setSuccess(null);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setFormError("مبلغ معتبر وارد کنید.");
      return;
    }
    if (balance === null || normalizedAmount > balance) {
      setFormError("مبلغ برداشت از موجودی قابل برداشت بیشتر است.");
      return;
    }
    if (!normalizedCard && !normalizedSheba) {
      setFormError("حداقل شماره کارت یا شماره شبا را وارد کنید.");
      return;
    }
    if (normalizedCard && !/^\d{16}$/.test(normalizedCard)) {
      setFormError("شماره کارت باید دقیقاً ۱۶ رقم باشد.");
      return;
    }
    if (normalizedSheba && !/^IR\d{24}$/.test(normalizedSheba)) {
      setFormError("شماره شبا باید با IR شروع شود و پس از آن دقیقاً ۲۴ رقم داشته باشد.");
      return;
    }

    setBusy(true);
    try {
      await requestWithdrawal(runtime, {
        amount: normalizedAmount,
        ...(normalizedCard ? { card: normalizedCard } : {}),
        ...(normalizedSheba ? { sheba: normalizedSheba } : {}),
      });
      setAmount("");
      setCard("");
      setSheba("");
      setSuccess(`درخواست برداشت ${formatWalletAmount(normalizedAmount)} تومان ثبت شد و تا تعیین وضعیت از موجودی رزرو می‌شود.`);
      await load();
    } catch (submitError) {
      setFormError(messageOf(submitError));
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <section className="vodda-screen" style={{ minHeight: "62dvh", display: "grid", placeItems: "center" }}>
        <div style={{ width: "100%", display: "grid", justifyItems: "center", gap: spacing.lg, padding: 32, textAlign: "center" }}>
          <span style={{ width: 92, height: 92, display: "grid", placeItems: "center", borderRadius: "50%", color: colors.olive600, background: colors.olive100 }}>
            <Icon name="checkCircle" size={52} stroke={1.8} />
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: colors.ink }}>درخواست برداشت ثبت شد</h2>
            <p style={{ ...typography.body, maxWidth: 420, margin: "10px 0 0", color: colors.inkSecondary, lineHeight: 2 }}>{success}</p>
          </div>
          <Button fullWidth onClick={() => navigateApp("/t/wallet", config)} style={{ minHeight: 52 }}>بازگشت به کیف پول</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      {loading ? <LoadingState label="در حال دریافت وضعیت برداشت‌ها…" /> : null}
      {!loading && error ? (
        <ErrorState title="دریافت برداشت‌ها ناموفق بود" description={error} action={<Button onClick={() => void load()}>تلاش دوباره</Button>} />
      ) : null}

      {!loading && !error ? (
        <>
          <div style={{ display: "grid", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: 16, borderRadius: 18, background: colors.olive50 }}>
              <span style={{ fontSize: 13, color: colors.inkSecondary }}>موجودی قابل برداشت</span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: colors.olive700 }}>
                {balance === null ? "—" : `${formatWalletAmount(balance)} تومان`}
              </strong>
            </div>

            <div style={{ display: "grid", gap: spacing.md }}>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>مبلغ برداشت</span>
              <input className="vodda-input" value={toFaDigits(amount)} onChange={(event) => setAmount(digitsOnly(event.target.value))} inputMode="numeric" placeholder="مثلاً ۵۰۰۰۰۰" style={inputStyle} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: spacing.xs }}>
              {[500000, 1000000, 2000000].map((quickAmount) => (
                <Button key={quickAmount} variant="secondary" onClick={() => setAmount(String(quickAmount))}>{quickAmount >= 1000000 ? `${formatWalletAmount(quickAmount / 1000000)} میلیون` : `${formatWalletAmount(quickAmount / 1000)} هزار`}</Button>
              ))}
            </div>

            <div>
              <strong style={{ ...typography.body, display: "block" }}>حساب مقصد</strong>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>حداقل یکی از شماره کارت یا شبا الزامی است.</span>
            </div>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>شماره کارت (اختیاری)</span>
              <input className="vodda-input" value={cardDisplay(card)} onChange={(event) => setCard(cleanCard(event.target.value))} inputMode="numeric" dir="ltr" maxLength={19} placeholder="۶۰۳۷ ۹۹۷۵ ۱۲۳۴ ۵۶۷۸" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>شماره شبا (اختیاری)</span>
              <input className="vodda-input" value={toFaDigits(sheba)} onChange={(event) => setSheba(cleanSheba(event.target.value))} dir="ltr" maxLength={26} placeholder="IR۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰" style={inputStyle} />
            </label>

            <Card style={{ background: colors.goldBackground, border: `1px solid ${colors.goldSoft}` }}>
              <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>
                ثبت درخواست به معنی انتقال بانکی نیست. مبلغ تا پرداخت یا رد درخواست از موجودی شما رزرو می‌شود.
              </p>
            </Card>
            {formError ? <p role="alert" style={{ ...typography.bodySmall, margin: 0, color: colors.clay }}>{formError}</p> : null}
            <Button fullWidth loading={busy} disabled={busy} onClick={() => void submit()}><Icon name="download" size={18} />ثبت درخواست برداشت</Button>
            </div>
          </div>

          <SectionHeader title="تاریخچه برداشت" action="به‌روزرسانی" onAction={() => void load()} />
          {withdrawals.length === 0 ? (
            <EmptyState icon={<Icon name="download" size={30} />} title="درخواستی ثبت نشده" description="پس از ثبت برداشت، وضعیت آن در این بخش قابل پیگیری است." />
          ) : (
            <div style={{ display: "grid", gap: spacing.sm }}>
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} style={{ display: "grid", gap: spacing.sm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}>
                    <strong style={typography.body}>{formatWalletAmount(withdrawal.amount)} تومان</strong>
                    <StatusPill status={withdrawal.status} label={statusLabel(withdrawal.status)} />
                  </div>
                  <div style={{ ...typography.caption, color: colors.inkMuted }}>
                    {withdrawal.card ? `کارت: ${toFaDigits(withdrawal.card)}` : withdrawal.sheba ? `شبا: ${toFaDigits(withdrawal.sheba)}` : "حساب مقصد"}
                    {withdrawal.createdAt ? ` · ${dateLabel(withdrawal.createdAt)}` : ""}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
