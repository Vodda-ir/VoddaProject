"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../platform/context";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  IllustrationWallet,
  Input,
  LoadingState,
  SectionHeader,
  WalletHero,
  colors,
  digitsOnly,
  radii,
  spacing,
  toFaDigits,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { payViaSamanGate } from "../../../lib/saman-gate";
import { getWalletSnapshot, createWalletTopup, type WalletTopup } from "./api";
import type { WalletTransaction } from "./types";
import { formatWalletAmount, WalletTransactionCard } from "./WalletTransactionCard";
import { PaymentResultBanner } from "../payments/PaymentResultBanner";

// همان سقف‌های رسمی بک‌اند (usecase.TopupMinAmount / TopupMaxAmount) و همان
// مبلغ‌های پیشنهادی پنل وب — هر دو platform همیشه یک تجربهٔ مشترک دارند.
const TOPUP_PRESETS = [
  { value: 100_000, label: "۱۰۰ هزار" },
  { value: 250_000, label: "۲۵۰ هزار" },
  { value: 500_000, label: "۵۰۰ هزار" },
  { value: 1_000_000, label: "۱ میلیون" },
];
const TOPUP_MIN = 10_000;
const TOPUP_MAX = 100_000_000;

export function LearnerWalletScreen() {
  const runtime = usePlatform();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // شارژ کیف پول
  const [selectedPreset, setSelectedPreset] = useState<number | null>(TOPUP_PRESETS[0].value);
  const [customAmount, setCustomAmount] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getWalletSnapshot(runtime);
      setBalance(snapshot.user.wallet);
      setTransactions(snapshot.transactions);
    } catch (loadError) {
      setBalance(null);
      setTransactions([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedCustom = customAmount ? Number(digitsOnly(customAmount)) : 0;
  const topupAmount = parsedCustom > 0 ? parsedCustom : selectedPreset ?? 0;

  const startTopup = useCallback(async () => {
    if (topupBusy || redirecting) return;
    setTopupError("");
    if (!topupAmount || topupAmount < TOPUP_MIN || topupAmount > TOPUP_MAX) {
      setTopupError(`مبلغ شارژ باید بین ${toFaDigits(TOPUP_MIN)} و ${toFaDigits(TOPUP_MAX)} تومان باشد.`);
      return;
    }
    setTopupBusy(true);
    try {
      const topup: WalletTopup = await createWalletTopup(runtime, topupAmount);
      // پست فرم توکن به OnlinePG از مرورگرِ خود کاربر — دقیقاً مثل منافسه، در
      // همان تب؛ بعد از تسویه، کال‌بک به ‎/app/wallet?payment=…‎ برمی‌گردد.
      setRedirecting(true);
      payViaSamanGate(topup.token);
    } catch (topupFailure) {
      setTopupError(messageOf(topupFailure, "شروع پرداخت انجام نشد؛ چند لحظه دیگر تلاش کنید."));
      setTopupBusy(false);
    }
  }, [redirecting, runtime, topupAmount, topupBusy]);

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <h1 className="vodda-display" style={{ fontSize: 26, margin: "2px 0 0", color: colors.ink, lineHeight: 1.7 }}>کیف پول</h1>
      <PaymentResultBanner />
      <WalletHero amount={balance === null ? "—" : formatWalletAmount(balance)} />

      <div style={{ display: "grid", gap: spacing.md }}>
        <SectionHeader title="شارژ کیف پول" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
          {TOPUP_PRESETS.map((preset) => {
            const active = topupAmount === preset.value && !parsedCustom;
            return (
              <button
                key={preset.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedPreset(preset.value);
                  setCustomAmount("");
                  setTopupError("");
                }}
                style={{
                  padding: "13px 10px",
                  borderRadius: radii.sm,
                  border: `1.5px solid ${active ? colors.olive600 : colors.border}`,
                  background: active ? colors.olive600 : colors.surface,
                  color: active ? colors.surface : colors.ink,
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 14,
                  transition: "border-color 140ms ease, background 140ms ease",
                }}
              >
                {preset.label}
                <span style={{ display: "block", fontSize: 11, fontWeight: 600, opacity: 0.8, marginTop: 2 }}>
                  تومان
                </span>
              </button>
            );
          })}
        </div>

        <Input
          label="مبلغ دلخواه (تومان)"
          inputMode="numeric"
          value={customAmount}
          onChange={(event) => {
            setCustomAmount(digitsOnly(event.target.value, 9));
            setTopupError("");
          }}
          placeholder={toFaDigits("مثلاً ۳۰۰۰۰۰")}
        />

        {topupError ? (
          <p role="alert" style={{ ...typography.caption, margin: 0, color: colors.danger, fontWeight: 700 }}>
            {topupError}
          </p>
        ) : null}

        <Button
          onClick={() => void startTopup()}
          loading={topupBusy}
          disabled={redirecting || !topupAmount}
        >
          {redirecting ? (
            "در حال انتقال به درگاه…"
          ) : (
            <>
              <Icon name="wallet" size={17} />
              پرداخت با درگاه بانکی
            </>
          )}
        </Button>

        <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
          پرداخت از طریق درگاه امن سامان‌سپ انجام می‌شود؛ رسید بانک را برای پیگیری نگه دارید.
        </p>
      </div>

      <SectionHeader title="تراکنش‌ها" />

      {loading ? <LoadingState label="در حال دریافت کیف پول…" /> : null}
      {!loading && error ? (
        <ErrorState
          title="دریافت کیف پول ناموفق بود"
          description={error}
          action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
        />
      ) : null}
      {!loading && !error && transactions.length === 0 ? (
        <EmptyState
          illustration={<IllustrationWallet />}
          title="تراکنشی ثبت نشده"
          description="هنوز تراکنشی در کیف پول شما وجود ندارد."
        />
      ) : null}
      {!loading && !error && transactions.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: spacing.sm }}>
          {transactions.map((transaction) => (
            <WalletTransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
