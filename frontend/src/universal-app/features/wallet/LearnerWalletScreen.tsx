"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../platform/context";
import { Card, EmptyState, ErrorState, LoadingState, Button, colors, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { getWalletSnapshot } from "./api";
import type { WalletTransaction } from "./types";
import { toFaDigits, WalletTransactionCard } from "./WalletTransactionCard";

function faNumber(value: number): string {
  return toFaDigits(new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value));
}

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
    <section style={{ display: "grid", gap: spacing.lg }}>
      <header>
        <h1 style={{ ...typography.heading, margin: 0 }}>کیف پول</h1>
      </header>

      <Card
        style={{
          padding: spacing.xxl,
          borderRadius: radii.xl,
          color: colors.surface,
          background: `linear-gradient(135deg, ${colors.olive800}, ${colors.olive600})`,
          boxShadow: shadows.olive,
        }}
      >
        <span style={{ ...typography.bodySmall, color: "rgba(255,255,255,.72)" }}>موجودی کیف پول</span>
        <div style={{ marginTop: spacing.sm }}>
          <strong style={{ fontSize: 30, lineHeight: 1.4, fontWeight: 800 }}>
            {balance === null ? "—" : faNumber(balance)}
          </strong>
          <span style={{ ...typography.body, marginInlineStart: spacing.sm, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>تومان</span>
        </div>
      </Card>

      <Card style={{ background: colors.goldBackground, border: `1px solid ${colors.goldSoft}` }}>
        <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>
          شارژ اینترنتی کیف پول پس از اتصال و تأیید درگاه پرداخت فعال می‌شود. تا آن زمان هیچ دکمه یا مسیر شارژ آزمایشی در اپ نمایش داده نمی‌شود.
        </p>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <h2 style={{ ...typography.title, margin: 0 }}>تراکنش‌ها</h2>
        {!loading ? <Button variant="secondary" onClick={() => void load()}>به‌روزرسانی</Button> : null}
      </div>

      {loading ? <LoadingState label="در حال دریافت کیف پول…" /> : null}
      {!loading && error ? (
        <ErrorState title="دریافت کیف پول ناموفق بود" description={error} action={<Button onClick={() => void load()}>تلاش دوباره</Button>} />
      ) : null}
      {!loading && !error && transactions.length === 0 ? (
        <EmptyState title="تراکنشی ثبت نشده" description="هنوز تراکنشی در کیف پول شما وجود ندارد." />
      ) : null}
      {!loading && !error && transactions.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.sm }}>
          {transactions.map((transaction) => (
            <WalletTransactionCard key={transaction.id} transaction={transaction} formatAmount={faNumber} />
          ))}
        </div>
      ) : null}
    </section>
  );
}