import { Card, Icon, colors, radii, spacing, typography } from "../../ui";
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
        padding: spacing.lg,
        borderRadius: radii.lg,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 46,
          height: 46,
          flex: "0 0 46px",
          display: "grid",
          placeItems: "center",
          borderRadius: 15,
          background: credit ? colors.successBackground : colors.clayBackground,
          color: credit ? colors.olive700 : colors.clay,
        }}
      >
        <Icon name={credit ? "download" : "trending"} size={21} stroke={1.9} />
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
            fontWeight: 900,
          }}
        >
          {credit ? "+" : "−"}{formatAmount(Math.abs(transaction.amount))}
        </strong>
        <span style={{ ...typography.caption, color: colors.inkFaint }}>تومان</span>
      </div>
    </Card>
  );
}
