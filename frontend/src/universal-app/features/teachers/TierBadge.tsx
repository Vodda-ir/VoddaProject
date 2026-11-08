/* نشان درجه استاد — سبک مهر اینستاگرام؛ رنگ مهر درجه استاد را نشان می‌دهد:
 * بین‌المللی (درجه ۱) → آبی، درجه ۲ → سبز، درجه ۳ → قرمز.
 * استادان بدون درجه هیچ مهر و تیکی ندارند. */
export const TIER_BADGES: Record<string, { color: string; label: string }> = {
  international: { color: "#0095F6", label: "استاد بین‌المللی (درجه ۱)" },
  grade2: { color: "#1EA55C", label: "استاد درجه ۲" },
  grade3: { color: "#E5484D", label: "استاد درجه ۳" },
};

export function TierBadge({ tier, size = 15 }: { tier: string; size?: number }) {
  const badge = TIER_BADGES[tier];
  if (!badge) return null;
  return (
    <span aria-label={badge.label} title={badge.label} style={{ display: "inline-flex", flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill={badge.color}
          d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.113a2.89 2.89 0 0 0-3.494 3.482l.114.89-.637.622a2.89 2.89 0 0 0 0 4.134l.637.622-.114.89a2.89 2.89 0 0 0 3.494 3.494l.89-.114.622.637a2.89 2.89 0 0 0 4.134 0l.622-.638.89.114a2.89 2.89 0 0 0 3.494-3.494l-.114-.891.637-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.114-.89a2.89 2.89 0 0 0-3.494-3.494l-.89.114-.622-.637z"
        />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.2 8.2 1.9 1.9 3.5-4"
        />
      </svg>
    </span>
  );
}
