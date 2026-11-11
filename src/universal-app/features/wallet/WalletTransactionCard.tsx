import { Card, Icon, colors, spacing, toFaDigits, typography } from "../../ui";
import type { WalletTransaction } from "./types";

export { toFaDigits } from "../../ui";

export function formatWalletAmount(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
}

function transactionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const label = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(date);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return toFaDigits(`${label} · ${time}`);
}

type TxVisual = { icon: "coins" | "video" | "trending" | "download" | "x" | "info"; label: string; ink: string; background: string };

const TX_VISUAL: Record<string, TxVisual> = {
  charge: { icon: "coins", label: "شارژ کیف پول", ink: colors.olive700, background: colors.olive100 },
  session: { icon: "video", label: "پرداخت جلسه", ink: "#8d6d1f", background: colors.goldBackground },
  earning: { icon: "trending", label: "درآمد جلسه", ink: colors.olive700, background: colors.olive100 },
  withdrawal: { icon: "download", label: "برداشت", ink: colors.clay, background: colors.clayBackground },
  commission: { icon: "x", label: "کارمزد سامانه", ink: colors.clay, background: colors.clayBackground },
  adjust: { icon: "info", label: "اصلاحیه حساب", ink: colors.olive700, background: colors.olive100 },
};

export function WalletTransactionCard({
  transaction,
  formatAmount = formatWalletAmount,
}: {
  transaction: WalletTransaction;
  formatAmount?: (value: number) => string;
}) {
  const credit = transaction.amount > 0;
  const visual = TX_VISUAL[transaction.type] ?? TX_VISUAL.adjust;

  return (
    <Card
      className="vodda-card--interactive"
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: 14,
        borderRadius: 18,
        boxShadow: "0 0 6px rgba(46,54,34,.04)",
        maxWidth: "100%",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 42,
          height: 42,
          flex: "0 0 42px",
          display: "grid",
          placeItems: "center",
          borderRadius: 13,
          background: visual.background,
          color: visual.ink,
        }}
      >
        <Icon name={visual.icon} size={20} stroke={1.9} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{
            ...typography.body,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: colors.ink,
            fontWeight: 800,
          }}
        >
          {transaction.title || visual.label}
        </strong>
        <span style={{ ...typography.caption, display: "block", marginTop: 3, color: colors.inkMuted }}>
          {visual.label}
          {transaction.createdAt ? ` · ${transactionDate(transaction.createdAt)}` : ""}
        </span>
      </div>
      <div style={{ flex: "0 0 auto", textAlign: "left" }}>
        <strong
          dir="ltr"
          style={{
            ...typography.body,
            display: "block",
            color: credit ? colors.olive700 : colors.ink,
            whiteSpace: "nowrap",
            fontWeight: 800,
          }}
        >
          {credit ? "+" : "−"}{formatAmount(Math.abs(transaction.amount))}
        </strong>
      </div>
    </Card>
  );
}
