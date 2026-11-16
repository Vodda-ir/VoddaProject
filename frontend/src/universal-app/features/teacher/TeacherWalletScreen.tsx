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
  SectionHeader,
  WalletHero,
  colors,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { getWalletSnapshot } from "../wallet/api";
import type { WalletTransaction } from "../wallet/types";
import { formatWalletAmount, WalletTransactionCard } from "../wallet/WalletTransactionCard";

function amountLabel(value: number, lang: "fa" | "en"): string {
  return lang === "en"
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value))
    : formatWalletAmount(value, lang);
}

export function TeacherWalletScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
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
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{L("کیف پول استاد")}</h1>
      <WalletHero label={L("موجودی قابل برداشت")} amount={balance === null ? "—" : amountLabel(balance, lang)}>
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
          {L("درخواست برداشت وجه")}
        </Button>
      </WalletHero>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          [L("درآمد کل"), amountLabel(income, lang), colors.olive700],
          [L("تراکنش‌ها"), localizedDigits(transactions.length, lang), colors.ink],
          [L("کارمزد وُدّا"), L("۱۵٪"), colors.ink],
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

      <SectionHeader title={L("تراکنش‌ها")} />

      {loading ? <LoadingState label={L("در حال دریافت کیف پول استاد…")} /> : null}
      {!loading && error ? (
        <ErrorState
          title={L("دریافت کیف پول ناموفق بود")}
          description={L(error)}
          action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
        />
      ) : null}
      {!loading && !error && transactions.length === 0 ? (
        <EmptyState
          icon={<Icon name="wallet" size={30} />}
          title={L("تراکنشی ثبت نشده")}
          description={L("تراکنش‌های درآمد و برداشت شما در این بخش نمایش داده می‌شوند.")}
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
