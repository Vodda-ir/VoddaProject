/* نشان درجه استاد — سبک مهر؛ رنگ مهر درجه استاد را نشان می‌دهد و هماهنگ با پالت برند وُدّاست:
 * بین‌المللی (درجه ۱) → طلایی، درجه ۲ → زیتونی، درجه ۳ → فیروزه‌ای خاکستری.
 * استادان بدون درجه هیچ مهر و تیکی ندارند. */
export const TIER_BADGES: Record<string, { color: string; label: string }> = {
  international: { color: "#8b681f", label: "استاد بین‌المللی (درجه ۱)" },
  grade2: { color: "#4c5a36", label: "استاد درجه ۲" },
  grade3: { color: "#5e7e8c", label: "استاد درجه ۳" },
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
