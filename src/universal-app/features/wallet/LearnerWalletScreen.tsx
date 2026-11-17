"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatform } from "../../platform/context";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  SectionHeader,
  WalletHero,
  colors,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { getWalletSnapshot } from "./api";
import type { WalletTransaction } from "./types";
import { formatWalletAmount, WalletTransactionCard } from "./WalletTransactionCard";

export function LearnerWalletScreen() {
  const runtime = usePlatform();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getWalletSnapshot(runtime);
      if (isStale()) return;
      setBalance(snapshot.user.wallet);
      setTransactions(snapshot.transactions);
    } catch (loadError) {
      if (isStale()) return;
      setBalance(null);
      setTransactions([]);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <h1 style={{ ...typography.heading, fontSize: 24, margin: 0, color: colors.ink }}>کیف پول</h1>
      <WalletHero amount={balance === null ? "—" : formatWalletAmount(balance)} />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: 14,
          border: "1px solid rgba(191,149,64,.25)",
          borderRadius: 16,
          background: colors.goldBackground,
        }}
      >
        <Icon name="info" size={19} style={{ flex: "0 0 auto", marginTop: 1, color: colors.gold }} />
        <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>
          شارژ اینترنتی کیف پول پس از اتصال و تأیید درگاه پرداخت فعال می‌شود. دکمهٔ شارژ آزمایشی در نسخهٔ production نمایش داده نمی‌شود.
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
          icon={<Icon name="wallet" size={30} />}
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
