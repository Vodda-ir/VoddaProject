import { Card, Icon, colors, spacing, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { formatAppDateTime } from "../../ui/jalali";
import { translateLoose } from "../../i18n/phrases";
import type { WalletTransaction } from "./types";

export { toFaDigits } from "../../ui";

/** مبلغ با ارقامِ متناسب با زبان اپ: فارسی «۱۲۳٬۴۵۶»، انگلیسی «123,456». */
export function formatWalletAmount(value: number, lang: "fa" | "en" = "fa"): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 0 }).format(value);
}

function transactionDate(value: string, lang: "fa" | "en"): string {
  return formatAppDateTime(value, lang, { withYear: false });
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
  formatAmount,
}: {
  transaction: WalletTransaction;
  formatAmount?: (value: number) => string;
}) {
  const { L, lang } = useAppearance();
  const credit = transaction.amount > 0;
  const visual = TX_VISUAL[transaction.type] ?? TX_VISUAL.adjust;
  const format = formatAmount ?? ((value: number) => formatWalletAmount(value, lang));

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
          {transaction.title ? translateLoose(transaction.title, lang) : L(visual.label)}
        </strong>
        <span style={{ ...typography.caption, display: "block", marginTop: 3, color: colors.inkMuted }}>
          {L(visual.label)}
          {transaction.createdAt ? ` · ${transactionDate(transaction.createdAt, lang)}` : ""}
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
          {credit ? "+" : "−"}{format(Math.abs(transaction.amount))}
        </strong>
      </div>
    </Card>
  );
}
