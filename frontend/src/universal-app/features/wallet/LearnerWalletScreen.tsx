"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../platform/context";
import {
  Button,
  Card,
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

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <WalletHero amount={balance === null ? "—" : formatWalletAmount(balance)} />

      <Card
        className="vodda-enter vodda-enter-delay-1"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: spacing.md,
          background: colors.goldBackground,
          borderColor: colors.goldSoft,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            flex: "0 0 42px",
            display: "grid",
            placeItems: "center",
            borderRadius: 14,
            color: colors.goldDark,
            background: "rgba(255,255,255,.55)",
          }}
        >
          <Icon name="shield" size={20} />
        </span>
        <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>
          شارژ اینترنتی پس از اتصال و تأیید درگاه پرداخت فعال می‌شود. تا آن زمان هیچ مسیر شارژ آزمایشی در اپ نمایش داده نمی‌شود.
        </p>
      </Card>

      <SectionHeader
        title="تراکنش‌ها"
        description={transactions.length ? `${transactions.length.toLocaleString("fa-IR")} گردش مالی ثبت‌شده` : undefined}
        action={!loading ? "به‌روزرسانی" : undefined}
        onAction={() => void load()}
      />

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
        <div style={{ display: "grid", gap: spacing.sm }}>
          {transactions.map((transaction) => (
            <WalletTransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
