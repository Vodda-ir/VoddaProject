"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  MetricTile,
  SectionHeader,
  WalletHero,
  spacing,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { getWalletSnapshot } from "../wallet/api";
import type { WalletTransaction } from "../wallet/types";
import { formatWalletAmount, toFaDigits, WalletTransactionCard } from "../wallet/WalletTransactionCard";

export function TeacherWalletScreen({ config }: { config: UniversalAppConfig }) {
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

  const income = useMemo(
    () => transactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0),
    [transactions],
  );

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>کیف پول استاد</h1>
      <WalletHero label="موجودی قابل برداشت" amount={balance === null ? "—" : formatWalletAmount(balance)}>
        <Button
          fullWidth
          onClick={() => navigateApp("/t/withdraw", config)}
          style={{
            color: "var(--vodda-olive-900, #2e3622)",
            background: "rgba(255,255,255,.94)",
            borderColor: "rgba(255,255,255,.94)",
          }}
        >
          <Icon name="download" size={18} />
          درخواست برداشت وجه
        </Button>
      </WalletHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
        <MetricTile icon="trending" label="درآمد ثبت‌شده" value={formatWalletAmount(income)} />
        <MetricTile icon="list" label="تراکنش‌ها" value={toFaDigits(transactions.length)} tone="info" />
      </div>

      <SectionHeader
        title="تراکنش‌ها"
        description="درآمد، برداشت و سایر گردش‌های مالی"
        action={!loading ? "به‌روزرسانی" : undefined}
        onAction={() => void load()}
      />

      {loading ? <LoadingState label="در حال دریافت کیف پول استاد…" /> : null}
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
          description="تراکنش‌های درآمد و برداشت شما در این بخش نمایش داده می‌شوند."
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
