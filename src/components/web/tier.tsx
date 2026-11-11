/*
 * نشان درجه استاد — همان سیستم اپلیکیشن (سبک مهر اینستاگرام).
 * رنگ مهر نشان‌دهندهٔ درجه استاد است و تیک سبز ثابت جای آن را گرفته است:
 * بین‌المللی (درجه ۱) → آبی، درجه ۲ → سبز، درجه ۳ → قرمز.
 * استادان بدون درجه هیچ نشانِ تیک‌مانندی ندارند.
 */
export type TeacherTier = 'international' | 'grade2' | 'grade3';

export const TIER_BADGES: Record<TeacherTier, { color: string; label: string; short: string }> = {
  international: { color: '#0095F6', label: 'استاد بین‌المللی (درجه ۱)', short: 'بین‌المللی' },
  grade2: { color: '#1EA55C', label: 'استاد درجه ۲', short: 'درجه ۲' },
  grade3: { color: '#E5484D', label: 'استاد درجه ۳', short: 'درجه ۳' },
};

export function tierOf(tier?: string | null): TeacherTier | null {
  if (tier === 'international' || tier === 'grade2' || tier === 'grade3') return tier;
  return null;
}

/** مهر درجه استاد — نشانِ گوشهٔ آواتار (سبک اپلیکیشن). */
export function TierSeal({ tier, size = 15 }: { tier?: string | null; size?: number }) {
  const key = tierOf(tier);
  const badge = key ? TIER_BADGES[key] : undefined;
  if (!badge) return null;
  return (
    <span
      role="img"
      aria-label={badge.label}
      title={badge.label}
      style={{ display: 'inline-flex', flex: '0 0 auto' }}
    >
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

/** برچسب متنی درجه استاد — کنار نام یا در ردیف‌های جدول. */
export function TierChip({ tier, size = 13 }: { tier?: string | null; size?: number }) {
  const key = tierOf(tier);
  if (!key) return null;
  const badge = TIER_BADGES[key];
  return (
    <span
      title={badge.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2.5px 8px',
        borderRadius: 999,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.6,
        color: badge.color,
        background: `${badge.color}14`,
        border: `1px solid ${badge.color}3d`,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width={size + 1} height={size + 1} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: '0 0 auto' }}>
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
      {badge.label}
    </span>
  );
}

/** آواتار استاد همراه مهر درجه — جایگزین تیک سبز تأیید (در ui.tsx پیاده‌سازی شده است). */
