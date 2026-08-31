import { Card, colors, radii, spacing, typography } from "../../ui";
import type { WalletTransaction } from "./types";

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function transactionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toFaDigits(`${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
}

export function WalletTransactionCard({
  transaction,
  formatAmount,
}: {
  transaction: WalletTransaction;
  formatAmount: (value: number) => string;
}) {
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
        <strong style={{ ...typography.body, display: "block" }}>
          {transaction.title || transaction.type || "تراکنش"}
        </strong>
        {transaction.createdAt ? (
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{transactionDate(transaction.createdAt)}</span>
        ) : null}
      </div>
      <strong style={{ ...typography.body, color: credit ? colors.olive700 : colors.ink, whiteSpace: "nowrap" }}>
        {credit ? "+" : "−"}
        {formatAmount(Math.abs(transaction.amount))}
      </strong>
    </Card>
  );
}
