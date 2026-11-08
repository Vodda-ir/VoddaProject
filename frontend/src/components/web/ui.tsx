import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../Icon';
import { TierSeal, tierOf } from './tier';

export function GeoPattern({ color = '#fff', opacity = 0.08 }: { color?: string; opacity?: number }) {
  const id = 'wgeo' + color.replace(/[^a-z0-9]/gi, '');
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity }} aria-hidden="true">
      <defs>
        <pattern id={id} width="46" height="46" patternUnits="userSpaceOnUse">
          <path d="M23 6l4 8 8-4-4 8 8 4-8 4 4 8-8-4-4 8-4-8-8 4 4-8-4-8 8 4 4-8z" fill="none" stroke={color} strokeWidth="1" />
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
  href = '/',
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
    sm: { minHeight: 40, fontSize: 13.5, padding: '9px 15px' },
    md: { minHeight: 46, fontSize: 14.5, padding: '11px 20px' },
    lg: { minHeight: 52, fontSize: 15.5, padding: '14px 24px' },
  };
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: { background: 'var(--olive-600)', color: '#fff' },
    dark: { background: 'var(--olive-900)', color: '#fff' },
    ghost: { background: '#fff', color: 'var(--olive-700)', border: '1px solid var(--olive-200)' },
    white: { background: '#fff', color: 'var(--olive-700)' },
    soft: { background: 'var(--olive-100)', color: 'var(--olive-700)' },
  };
  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: variant === 'primary' ? '0 8px 22px rgba(94,110,67,.16)' : undefined,
    ...sizes[size],
    ...variants[variant],
    ...style,
  };
  const content = (
    <>
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} stroke={1.9} />}
      {children}
    </>
  );

  return href.startsWith('/') ? (
    <Link href={href} style={buttonStyle}>{content}</Link>
  ) : (
    <a href={href} style={buttonStyle} rel="noreferrer">{content}</a>
  );
}

export function Avatar({
  size = 48,
  ring = false,
  tier,
  emoji,
  imageUrl,
}: {
  size?: number;
  ring?: boolean;
  /** درجه استاد — مهر رنگی درجه جای تیک سبز ثابت می‌نشیند؛ بدون درجه هیچ نشانی نیست. */
  tier?: string | null;
  emoji?: string;
  imageUrl?: string;
}) {
  const seal = tierOf(tier);
  const sealSize = Math.max(13, Math.round(size * 0.36));
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: '50%',
          background: imageUrl ? 'transparent' : 'linear-gradient(135deg,var(--olive-200),var(--olive-100))',
          boxShadow: ring ? '0 0 0 3px var(--surface), 0 0 0 4.5px var(--olive-200)' : undefined,
          fontSize: size * 0.42,
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : emoji ? (
          emoji
        ) : (
          <Icon name="user" size={size * 0.55} stroke={1.6} style={{ color: 'var(--olive-500)' }} />
        )}
      </div>
      {seal && (
        <span
          style={{
            position: 'absolute',
            insetInlineEnd: -2,
            bottom: -2,
            width: sealSize,
            height: sealSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid var(--surface)`,
            borderRadius: '50%',
            background: 'var(--surface)',
          }}
        >
          <TierSeal tier={seal} size={sealSize - 4} />
        </span>
      )}
    </div>
  );
}

export function Stars({ value = 5, size = 16 }: { value?: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: 'var(--gold)' }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} name="star" size={size} fill={index < value} />
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
    <div
      style={{
        maxWidth: center ? 680 : 720,
        margin: center ? '0 auto' : 0,
        textAlign: center ? 'center' : 'start',
      }}
    >
      {kicker && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginBottom: 11,
            color: 'var(--olive-700)',
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)' }} />
          {kicker}
        </div>
      )}
      <h2
        style={{
          margin: 0,
          color: 'var(--ink)',
          fontSize: 'clamp(28px, 4vw, 38px)',
          fontWeight: 800,
          lineHeight: 1.45,
          letterSpacing: '-.4px',
        }}
      >
        {title}
      </h2>
      {sub && (
        <p style={{ maxWidth: 620, margin: '12px auto 0', color: 'var(--ink-3)', fontSize: 15, lineHeight: 2 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function PublicPageHero({
  kicker,
  title,
  description,
  icon = 'sparkle',
}: {
  kicker: string;
  title: string;
  description?: string;
  icon?: Parameters<typeof Icon>[0]['name'];
}) {
  return (
    <section className="public-page-hero">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} aria-hidden="true">
        <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'var(--olive-100)', insetInlineStart: '-120px', top: '-180px', filter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--gold-bg)', insetInlineEnd: '-50px', bottom: '-140px' }} />
      </div>
      <div className="public-container" style={{ position: 'relative' }}>
        <div style={{ maxWidth: 760, paddingBlock: '54px 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--olive-700)', fontSize: 12.5, fontWeight: 800 }}>
            <span style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 10, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
              <Icon name={icon} size={17} />
            </span>
            {kicker}
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(31px, 5vw, 46px)', lineHeight: 1.45, fontWeight: 800, letterSpacing: '-.5px' }}>{title}</h1>
          {description && <p style={{ maxWidth: 680, margin: '14px 0 0', color: 'var(--ink-2s)', fontSize: 15.5, lineHeight: 2 }}>{description}</p>}
        </div>
      </div>
    </section>
  );
}

export function PublicSurface({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--sand-150)',
        borderRadius: 24,
        background: 'var(--surface)',
        boxShadow: '0 4px 18px rgba(46,54,34,.045)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
