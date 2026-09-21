"use client";

import { useCallback, useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import { Button, Card, EmptyState, ErrorState, Icon, LoadingState, SectionHeader, StatusPill, WalletHero, colors, radii, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { getWalletSnapshot } from "../wallet/api";
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";

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

function normalizeDigits(value: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return Array.from(value).map((char) => {
    const faIndex = persian.indexOf(char);
    if (faIndex >= 0) return String(faIndex);
    const arIndex = arabic.indexOf(char);
    if (arIndex >= 0) return String(arIndex);
    return char;
  }).join("");
}

function cleanCard(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "");
}

function cleanSheba(value: string): string {
  return normalizeDigits(value).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toFaDigits(`${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wallet, history] = await Promise.all([getWalletSnapshot(runtime), getWithdrawals(runtime)]);
      setBalance(wallet.user.wallet);
      setWithdrawals(history);
    } catch (loadError) {
      setBalance(null);
      setWithdrawals([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const normalizedAmount = Number.parseInt(normalizeDigits(amount).replace(/\D/g, ""), 10);
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

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <SectionHeader title="برداشت وجه" description="درخواست برداشت و وضعیت پرداخت‌های شما" action="کیف پول" onAction={() => navigateApp("/t/wallet", config)} />

      {loading ? <LoadingState label="در حال دریافت وضعیت برداشت‌ها…" /> : null}
      {!loading && error ? (
        <ErrorState title="دریافت برداشت‌ها ناموفق بود" description={error} action={<Button onClick={() => void load()}>تلاش دوباره</Button>} />
      ) : null}

      {!loading && !error ? (
        <>
          <div style={{ display: "grid", gap: spacing.lg }}>
            <WalletHero label="موجودی قابل برداشت" amount={balance === null ? "—" : formatWalletAmount(balance)} />
            <Card style={{ display: "grid", gap: spacing.md }}>

            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>مبلغ برداشت</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder="مثلاً ۵۰۰۰۰۰" style={inputStyle} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: spacing.xs }}>
              {[500000, 1000000, 2000000].map((quickAmount) => (
                <Button key={quickAmount} variant="secondary" onClick={() => setAmount(String(quickAmount))}>{formatWalletAmount(quickAmount)}</Button>
              ))}
            </div>

            <div>
              <strong style={{ ...typography.body, display: "block" }}>حساب مقصد</strong>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>حداقل یکی از شماره کارت یا شبا الزامی است.</span>
            </div>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>شماره کارت (اختیاری)</span>
              <input value={card} onChange={(event) => setCard(event.target.value)} inputMode="numeric" dir="ltr" maxLength={19} placeholder="6037 9975 1234 5678" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>شماره شبا (اختیاری)</span>
              <input value={sheba} onChange={(event) => setSheba(event.target.value)} dir="ltr" maxLength={34} placeholder="IR000000000000000000000000" style={inputStyle} />
            </label>

            <Card style={{ background: colors.goldBackground, border: `1px solid ${colors.goldSoft}` }}>
              <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>
                ثبت درخواست به معنی انتقال بانکی نیست. مبلغ تا پرداخت یا رد درخواست از موجودی شما رزرو می‌شود.
              </p>
            </Card>
            {formError ? <p role="alert" style={{ ...typography.bodySmall, margin: 0, color: colors.clay }}>{formError}</p> : null}
            {success ? <p role="status" style={{ ...typography.bodySmall, margin: 0, color: colors.olive700 }}>{success}</p> : null}
            <Button fullWidth loading={busy} disabled={busy} onClick={() => void submit()}><Icon name="download" size={18} />ثبت درخواست برداشت</Button>
            </Card>
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
                    {withdrawal.card ? `کارت: ${toFaDigits(withdrawal.card)}` : withdrawal.sheba ? `شبا: ${withdrawal.sheba}` : "حساب مقصد"}
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
