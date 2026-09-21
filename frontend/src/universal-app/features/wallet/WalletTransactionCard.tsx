import { Card, Icon, colors, spacing, typography } from "../../ui";
import type { WalletTransaction } from "./types";

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

export function formatWalletAmount(value: number): string {
  return toFaDigits(new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value));
}

function transactionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toFaDigits(`${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
}

export function WalletTransactionCard({
  transaction,
  formatAmount = formatWalletAmount,
}: {
  transaction: WalletTransaction;
  formatAmount?: (value: number) => string;
}) {
  const credit = transaction.amount > 0;

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
          borderRadius: 12,
          background: credit ? colors.successBackground : colors.clayBackground,
          color: credit ? colors.olive700 : colors.clay,
        }}
      >
        <Icon name={credit ? "arrowDownLeft" : "arrowUpRight"} size={20} stroke={1.9} />
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
          {transaction.title || transaction.type || "تراکنش"}
        </strong>
        {transaction.createdAt ? (
          <span style={{ ...typography.caption, display: "block", marginTop: 2, color: colors.inkMuted }}>
            {transactionDate(transaction.createdAt)}
          </span>
        ) : null}
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
