"use client";

import { useCallback, useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import { Button, Card, EmptyState, ErrorState, Icon, LoadingState, SectionHeader, StatusPill, colors, digitsOnly, radii, spacing, toLatinDigits, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { formatAppDateTime } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
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

function cardDisplay(value: string, lang: "fa" | "en"): string {
  return localizedDigits(value.replace(/(\d{4})(?=\d)/g, "$1 "), lang);
}

type Translate = (text: string) => string;

function amountLabel(value: number, lang: "fa" | "en"): string {
  return lang === "en"
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value))
    : formatWalletAmount(value);
}

function dateLabel(value: string, lang: "fa" | "en"): string {
  return formatAppDateTime(value, lang, { withTime: false });
}

function statusLabel(status: string, L: Translate): string {
  if (status === "paid") return L("پرداخت‌شده");
  if (status === "rejected") return L("ردشده");
  return L("در انتظار بررسی");
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
  const { L, lang } = useAppearance();
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
      setSuccess(L("درخواست برداشت {n} تومان ثبت شد و تا تعیین وضعیت از موجودی رزرو می‌شود.").replace("{n}", amountLabel(normalizedAmount, lang)));
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
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: colors.ink }}>{L("درخواست برداشت ثبت شد")}</h2>
            <p style={{ ...typography.body, maxWidth: 420, margin: "10px 0 0", color: colors.inkSecondary, lineHeight: 2 }}>{success}</p>
          </div>
          <Button fullWidth onClick={() => navigateApp("/t/wallet", config)} style={{ minHeight: 52 }}>{L("بازگشت به کیف پول")}</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      {loading ? <LoadingState label={L("در حال دریافت وضعیت برداشت‌ها…")} /> : null}
      {!loading && error ? (
        <ErrorState title={L("دریافت برداشت‌ها ناموفق بود")} description={L(error)} action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>} />
      ) : null}

      {!loading && !error ? (
        <>
          <div style={{ display: "grid", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: 16, borderRadius: 18, background: colors.olive50 }}>
              <span style={{ fontSize: 13, color: colors.inkSecondary }}>{L("موجودی قابل برداشت")}</span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: colors.olive700 }}>
                {balance === null ? "—" : L("{n} تومان").replace("{n}", amountLabel(balance, lang))}
              </strong>
            </div>

            <div style={{ display: "grid", gap: spacing.md }}>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>{L("مبلغ برداشت")}</span>
              <input value={localizedDigits(amount, lang)} onChange={(event) => setAmount(digitsOnly(event.target.value))} inputMode="numeric" placeholder={L("مثلاً ۵۰۰۰۰۰")} style={inputStyle} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: spacing.xs }}>
              {[500000, 1000000, 2000000].map((quickAmount) => (
                <Button key={quickAmount} variant="secondary" onClick={() => setAmount(String(quickAmount))}>{quickAmount >= 1000000 ? L("{n} میلیون").replace("{n}", amountLabel(quickAmount / 1000000, lang)) : L("{n} هزار").replace("{n}", amountLabel(quickAmount / 1000, lang))}</Button>
              ))}
            </div>

            <div>
              <strong style={{ ...typography.body, display: "block" }}>{L("حساب مقصد")}</strong>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>{L("حداقل یکی از شماره کارت یا شبا الزامی است.")}</span>
            </div>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>{L("شماره کارت (اختیاری)")}</span>
              <input value={cardDisplay(card, lang)} onChange={(event) => setCard(cleanCard(event.target.value))} inputMode="numeric" dir="ltr" maxLength={19} placeholder={L("۶۰۳۷ ۹۹۷۵ ۱۲۳۴ ۵۶۷۸")} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: spacing.xs }}>
              <span style={{ ...typography.bodySmall, fontWeight: 700 }}>{L("شماره شبا (اختیاری)")}</span>
              <input value={localizedDigits(sheba, lang)} onChange={(event) => setSheba(cleanSheba(event.target.value))} dir="ltr" maxLength={26} placeholder={L("IR۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰")} style={inputStyle} />
            </label>

            <Card style={{ background: colors.goldBackground, border: `1px solid ${colors.goldSoft}` }}>
              <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>
                {L("ثبت درخواست به معنی انتقال بانکی نیست. مبلغ تا پرداخت یا رد درخواست از موجودی شما رزرو می‌شود.")}
              </p>
            </Card>
            {formError ? <p role="alert" style={{ ...typography.bodySmall, margin: 0, color: colors.clay }}>{L(formError)}</p> : null}
            <Button fullWidth loading={busy} disabled={busy} onClick={() => void submit()}><Icon name="download" size={18} />{L("ثبت درخواست برداشت")}</Button>
            </div>
          </div>

          <SectionHeader title={L("تاریخچه برداشت")} action={L("به‌روزرسانی")} onAction={() => void load()} />
          {withdrawals.length === 0 ? (
            <EmptyState icon={<Icon name="download" size={30} />} title={L("درخواستی ثبت نشده")} description={L("پس از ثبت برداشت، وضعیت آن در این بخش قابل پیگیری است.")} />
          ) : (
            <div style={{ display: "grid", gap: spacing.sm }}>
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} style={{ display: "grid", gap: spacing.sm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}>
                    <strong style={typography.body}>{L("{n} تومان").replace("{n}", amountLabel(withdrawal.amount, lang))}</strong>
                    <StatusPill status={withdrawal.status} label={statusLabel(withdrawal.status, L)} />
                  </div>
                  <div style={{ ...typography.caption, color: colors.inkMuted }}>
                    {withdrawal.card ? L("کارت: {n}").replace("{n}", localizedDigits(withdrawal.card, lang)) : withdrawal.sheba ? L("شبا: {n}").replace("{n}", localizedDigits(withdrawal.sheba, lang)) : L("حساب مقصد")}
                    {withdrawal.createdAt ? ` · ${dateLabel(withdrawal.createdAt, lang)}` : ""}
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
