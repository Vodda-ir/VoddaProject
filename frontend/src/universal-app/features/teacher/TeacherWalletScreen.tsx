"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { Button, Card, EmptyState, ErrorState, LoadingState, colors, radii, shadows, spacing, typography } from "../../ui";
import { getWalletSnapshot } from "../wallet/api";
import type { WalletTransaction } from "../wallet/types";

function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function money(value: number): string {
  return faDigits(Math.trunc(value).toLocaleString("en-US"));
}

function transactionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return faDigits(`${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "خطایی رخ داد. دوباره تلاش کنید.";
}

function TransactionCard({ transaction }: { transaction: WalletTransaction }) {
  const credit = transaction.amount > 0;
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: spacing.md, borderRadius: radii.md }}>
      <div
        aria-hidden="true"
        style={{
          width: 42,
          height: 42,
          flex: "0 0 42px",
          display: "grid",
          placeItems: "center",
          borderRadius: radii.sm,
          background: credit ? colors.olive100 : colors.clayBackground,
          color: credit ? colors.olive700 : colors.clay,
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        {credit ? "↙" : "↗"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ ...typography.body, display: "block" }}>{transaction.title || transaction.type || "تراکنش"}</strong>
        {transaction.createdAt ? (
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{transactionDate(transaction.createdAt)}</span>
        ) : null}
      </div>
      <strong style={{ ...typography.body, color: credit ? colors.olive700 : colors.ink, whiteSpace: "nowrap" }}>
        {credit ? "+" : "−"}{money(Math.abs(transaction.amount))}
      </strong>
    </Card>
  );
}

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
    <section style={{ display: "grid", gap: spacing.lg }}>
      <header>
        <h1 style={{ ...typography.heading, margin: 0 }}>کیف پول استاد</h1>
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
        <span style={{ ...typography.bodySmall, color: "rgba(255,255,255,.72)" }}>موجودی قابل برداشت</span>
        <div style={{ marginTop: spacing.sm }}>
          <strong style={{ fontSize: 30, lineHeight: 1.4, fontWeight: 800 }}>
            {balance === null ? "—" : money(balance)}
          </strong>
          <span style={{ ...typography.body, marginInlineStart: spacing.sm, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>تومان</span>
        </div>
        <div style={{ marginTop: spacing.lg }}>
          <Button fullWidth onClick={() => navigateApp("/t/withdraw", config)}>درخواست برداشت وجه</Button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
        <Card style={{ textAlign: "center" }}>
          <strong style={{ ...typography.title, color: colors.olive700 }}>{money(income)}</strong>
          <span style={{ ...typography.caption, display: "block", color: colors.inkMuted, marginTop: spacing.xs }}>درآمد ثبت‌شده</span>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <strong style={typography.title}>{faDigits(transactions.length)}</strong>
          <span style={{ ...typography.caption, display: "block", color: colors.inkMuted, marginTop: spacing.xs }}>تراکنش‌ها</span>
        </Card>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <h2 style={{ ...typography.title, margin: 0 }}>تراکنش‌ها</h2>
        {!loading ? <Button variant="secondary" onClick={() => void load()}>به‌روزرسانی</Button> : null}
      </div>

      {loading ? <LoadingState label="در حال دریافت کیف پول استاد…" /> : null}
      {!loading && error ? (
        <ErrorState title="دریافت کیف پول ناموفق بود" description={error} action={<Button onClick={() => void load()}>تلاش دوباره</Button>} />
      ) : null}
      {!loading && !error && transactions.length === 0 ? (
        <EmptyState title="تراکنشی ثبت نشده" description="تراکنش‌های درآمد و برداشت شما در این بخش نمایش داده می‌شوند." />
      ) : null}
      {!loading && !error && transactions.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.sm }}>
          {transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} />)}
        </div>
      ) : null}
    </section>
  );
}
