"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
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
import { getWalletSnapshot } from "../wallet/api";
import type { WalletTransaction } from "../wallet/types";
import { formatWalletAmount, toFaDigits, WalletTransactionCard } from "../wallet/WalletTransactionCard";

export function TeacherWalletScreen({ config }: { config: UniversalAppConfig }) {
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
            minHeight: 48,
            color: colors.olive700,
            background: colors.surface,
            borderColor: colors.surface,
            boxShadow: "none",
          }}
        >
          <Icon name="download" size={18} />
          درخواست برداشت وجه
        </Button>
      </WalletHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          ["درآمد کل", formatWalletAmount(income), colors.olive700],
          ["تراکنش‌ها", toFaDigits(transactions.length), colors.ink],
          ["کارمزد وُدّا", "۱۵٪", colors.ink],
        ].map(([label, value, valueColor]) => (
          <div
            key={label}
            style={{
              minWidth: 0,
              padding: "14px 6px",
              textAlign: "center",
              borderRadius: 18,
              background: colors.surface,
              boxShadow: "0 0 4px rgba(46,54,34,.04)",
            }}
          >
            <strong style={{ display: "block", fontSize: 18, fontWeight: 800, color: valueColor }}>{value}</strong>
            <span style={{ ...typography.caption, display: "block", marginTop: 4, color: colors.inkMuted }}>{label}</span>
          </div>
        ))}
      </div>

      <SectionHeader title="تراکنش‌ها" />

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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: spacing.sm }}>
          {transactions.map((transaction) => (
            <WalletTransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
