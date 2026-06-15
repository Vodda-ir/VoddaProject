import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../Icon';

export function GeoPattern({ color = '#fff', opacity = 0.08 }: { color?: string; opacity?: number }) {
  const id = 'wgeo' + color.replace(/[^a-z0-9]/gi, '');
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity }} aria-hidden="true">
      <defs>
        <pattern id={id} width="46" height="46" patternUnits="userSpaceOnUse">
          <path
            d="M23 6l4 8 8-4-4 8 8 4-8 4 4 8-8-4-4 8-4-8-8 4 4-8-8-4 8-4-4-8 8 4 4-8z"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

type BtnVariant = 'primary' | 'dark' | 'ghost' | 'white' | 'soft';
type BtnSize = 'sm' | 'md' | 'lg';

export function WebBtn({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  href = '#',
  style = {},
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: Parameters<typeof Icon>[0]['name'];
  href?: string;
  style?: CSSProperties;
}) {
  const sizes: Record<BtnSize, CSSProperties> = {
    sm: { fontSize: 14, padding: '9px 16px' },
    md: { fontSize: 15, padding: '12px 22px' },
    lg: { fontSize: 16, padding: '15px 28px' },
  };
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: { background: 'var(--olive-600)', color: '#fff', boxShadow: 'var(--sh-olive)' },
    dark: { background: 'var(--olive-900)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--olive-700)', boxShadow: 'inset 0 0 0 1.5px var(--olive-300)' },
    white: { background: '#fff', color: 'var(--olive-700)', boxShadow: 'var(--sh-sm)' },
    soft: { background: 'var(--olive-100)', color: 'var(--olive-700)' },
  };
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontWeight: 700, borderRadius: 999, whiteSpace: 'nowrap', transition: 'transform .12s',
        ...sizes[size], ...variants[variant], ...style,
      }}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} stroke={2} />}
      {children}
    </a>
  );
}

export function Avatar({ size = 48, ring = false, verified = false, emoji = '📖' }: { size?: number; ring?: boolean; verified?: boolean; emoji?: string }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg,var(--olive-200),var(--olive-100))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.42,
          boxShadow: ring ? '0 0 0 3px var(--surface), 0 0 0 4.5px var(--olive-200)' : undefined,
        }}
      >
        {emoji}
      </div>
      {verified && (
        <span
          style={{
            position: 'absolute', bottom: -2, insetInlineEnd: -2,
            width: size * 0.4, height: size * 0.4, borderRadius: '50%',
            background: 'var(--olive-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface)',
          }}
        >
          <Icon name="check" size={size * 0.24} stroke={3} />
        </span>
      )}
    </div>
  );
}

export function Stars({ value = 5, size = 16 }: { value?: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: 'var(--gold)' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" size={size} fill={i < value} />
      ))}
    </span>
  );
}

export function SectionTitle({
  kicker,
  title,
  sub,
  center = true,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div style={{ textAlign: center ? 'center' : 'start', maxWidth: center ? 600 : undefined, margin: center ? '0 auto' : 0 }}>
      {kicker && <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-600)', marginBottom: 12, letterSpacing: 0.3 }}>{kicker}</div>}
      <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.5px', marginBottom: sub ? 14 : 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--ink-3)' }}>{sub}</p>}
    </div>
  );
}
