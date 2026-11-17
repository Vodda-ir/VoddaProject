'use client';

// Zero-dependency SVG chart kit for the Vodda admin dashboard.
// Charts render LTR (standard for time axes) while all labels stay Persian.
// Colors reference the palette variables declared in globals.css.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { formatDate, formatNumber } from '@/lib/datetime';

export type Tone = 'olive' | 'gold' | 'clay' | 'info' | 'rose';

const TONE_COLOR: Record<Tone, string> = {
  olive: 'var(--olive-600)',
  gold: 'var(--gold)',
  clay: 'var(--clay)',
  info: 'var(--info)',
  rose: 'var(--rose)',
};

export type Point = { label: string; value: number };

/** Gregorian ISO date → short Jalali label like «۱۵ آبان» with graceful fallback. */
export function faDayLabel(iso: string): string {
  return formatDate(new Date(`${iso}T00:00:00Z`), 'fa', 'short') || toFaDigits(iso.slice(5));
}

/** Compact Persian number for tight axis labels: ۱۲٬۵۰۰ → ۱۲٫۵ هزار */
export function faCompact(value: number): string {
  if (value === 0) return toFaDigits(0);
  try {
    return formatNumber(value, 'fa', { notation: 'compact', maximumFractionDigits: 1 });
  } catch {
    return formatFaNumber(value);
  }
}

function useElementWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

/** Catmull-Rom → cubic bezier path through every point (smooth, no overshoot control). */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

// ─────────────────────────── AreaChart ───────────────────────────

export function AreaChart({
  data,
  height = 210,
  tone = 'olive',
  formatValue,
}: {
  data: Point[];
  height?: number;
  tone?: Tone;
  formatValue?: (value: number) => string;
}) {
  const { ref, width } = useElementWidth();
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = formatValue ?? faCompact;
  const color = TONE_COLOR[tone];

  const pad = { top: 16, right: 10, bottom: 26, left: 10 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const maxValue = niceMax(Math.max(1, ...data.map((p) => p.value)));
  const pts = useMemo(
    () =>
      data.map((point, index) => ({
        x: data.length > 1 ? (index / (data.length - 1)) * innerW : innerW / 2,
        y: pad.top + innerH - (Math.min(point.value, maxValue) / maxValue) * innerH,
        ...point,
      })),
    [data, innerW, innerH, maxValue, pad.top],
  );

  const line = smoothPath(pts);
  const area =
    pts.length > 1
      ? `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${pad.top + innerH} L ${pts[0].x.toFixed(2)} ${pad.top + innerH} Z`
      : '';

  const gridValues = [0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  function move(event: React.MouseEvent<SVGRectElement>) {
    if (!pts.length || innerW <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - pad.left;
    const index = Math.round((x / Math.max(1, innerW)) * (pts.length - 1));
    setHover(Math.min(pts.length - 1, Math.max(0, index)));
  }

  const hovered = hover !== null ? pts[hover] : null;

  return (
    <div ref={ref} className="adm-chart" style={{ height }} dir="ltr">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="نمودار روند">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.26} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          {gridValues.map((ratio) => {
            const y = pad.top + innerH - ratio * innerH;
            return (
              <g key={ratio}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--sand-150)" strokeDasharray="3 5" />
                <text x={width - pad.right} y={y - 4} textAnchor="end" fontSize={9} fill="var(--ink-3)">
                  {fmt(maxValue * ratio)}
                </text>
              </g>
            );
          })}
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--sand-200)" />

          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {line && <path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />}

          {pts.map((point, index) =>
            index % labelEvery === 0 || index === pts.length - 1 ? (
              <text
                key={`x-${index}`}
                x={Math.min(Math.max(point.x, 12), width - pad.right - 12)}
                y={height - 8}
                textAnchor="middle"
                fontSize={9}
                fill="var(--ink-3)"
              >
                {typeof point.label === 'string' && point.label.includes('-') ? faDayLabel(point.label) : point.label}
              </text>
            ) : null,
          )}

          {pts.length > 0 && (
            <circle
              cx={pts[pts.length - 1].x}
              cy={pts[pts.length - 1].y}
              r={3.4}
              fill={color}
              stroke="#fff"
              strokeWidth={1.6}
              className="adm-chart-pulse"
            />
          )}

          {hovered && (
            <g>
              <line x1={hovered.x} x2={hovered.x} y1={pad.top} y2={pad.top + innerH} stroke={color} strokeOpacity={0.35} strokeDasharray="4 4" />
              <circle cx={hovered.x} cy={hovered.y} r={4.4} fill={color} stroke="#fff" strokeWidth={2} />
            </g>
          )}

          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={move}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hovered && (
        <div
          className="adm-chart-tip"
          style={{
            left: `${Math.min(Math.max((hovered.x / Math.max(1, width)) * 100, 12), 88)}%`,
            top: Math.max(0, hovered.y - 46),
          }}
        >
          <strong>{formatFaNumber(hovered.value)}</strong>
          <span>{hovered.label.includes('-') ? faDayLabel(hovered.label) : hovered.label}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── BarsChart ───────────────────────────

export function BarsChart({
  data,
  secondary,
  height = 210,
  tone = 'olive',
  secondaryTone = 'gold',
  formatValue,
}: {
  data: Point[];
  secondary?: Point[];
  height?: number;
  tone?: Tone;
  secondaryTone?: Tone;
  formatValue?: (value: number) => string;
}) {
  const { ref, width } = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = formatValue ?? faCompact;
  const color = TONE_COLOR[tone];
  const secondColor = TONE_COLOR[secondaryTone];

  const pad = { top: 16, right: 10, bottom: 26, left: 10 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const maxValue = niceMax(
    Math.max(1, ...data.map((p) => p.value), ...(secondary ?? []).map((p) => p.value)),
  );

  const slot = data.length ? innerW / data.length : innerW;
  const barW = secondary && secondary.length ? Math.max(3, slot * 0.26) : Math.max(4, Math.min(26, slot * 0.56));
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  return (
    <div ref={ref} className="adm-chart" style={{ height }} dir="ltr">
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} role="img" aria-label="نمودار ستونی">
          {[0.5, 1].map((ratio) => {
            const y = pad.top + innerH - ratio * innerH;
            return (
              <g key={ratio}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--sand-150)" strokeDasharray="3 5" />
                <text x={width - pad.right} y={y - 4} textAnchor="end" fontSize={9} fill="var(--ink-3)">
                  {fmt(maxValue * ratio)}
                </text>
              </g>
            );
          })}
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--sand-200)" />

          {data.map((point, index) => {
            const primaryH = (Math.min(point.value, maxValue) / maxValue) * innerH;
            const secondPoint = secondary?.[index];
            const secondH = secondPoint ? (Math.min(secondPoint.value, maxValue) / maxValue) * innerH : 0;
            const x1 = pad.left + slot * index + slot / 2 - (secondary?.length ? barW + 2 : barW / 2);
            const x2 = pad.left + slot * index + slot / 2 + (secondary?.length ? 2 : 0);
            const hovered = hover === index;
            return (
              <g key={index} opacity={hover === null || hovered ? 1 : 0.45}>
                <rect
                  x={x1}
                  y={pad.top + innerH - primaryH}
                  width={barW}
                  height={Math.max(point.value > 0 ? 3 : 0, primaryH)}
                  rx={Math.min(5, barW / 2)}
                  fill={color}
                />
                {secondPoint && (
                  <rect
                    x={x2}
                    y={pad.top + innerH - secondH}
                    width={barW}
                    height={Math.max(secondPoint.value > 0 ? 3 : 0, secondH)}
                    rx={Math.min(5, barW / 2)}
                    fill={secondColor}
                  />
                )}
                {(index % labelEvery === 0 || index === data.length - 1) && (
                  <text
                    x={Math.min(Math.max(pad.left + slot * index + slot / 2, 12), width - pad.right - 12)}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--ink-3)"
                  >
                    {point.label.includes('-') ? faDayLabel(point.label) : point.label}
                  </text>
                )}
                {hovered && (
                  <text
                    x={Math.min(Math.max(pad.left + slot * index + slot / 2, 18), width - pad.right - 18)}
                    y={pad.top + innerH - Math.max(primaryH, secondH) - 7}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="var(--ink)"
                  >
                    {formatFaNumber(point.value)}
                    {secondPoint ? ` · ${formatFaNumber(secondPoint.value)}` : ''}
                  </text>
                )}
                <rect
                  x={pad.left + slot * index}
                  y={pad.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ─────────────────────────── DonutChart ───────────────────────────

export function DonutChart({
  segments,
  size = 158,
  thickness = 21,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - thickness) / 2 - 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="adm-donut">
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} dir="ltr">
        <svg width={size} height={size} role="img" aria-label="نمودار دایره‌ای">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--sand-100)" strokeWidth={thickness} />
          {total > 0 &&
            segments.map((segment, index) => {
              if (segment.value <= 0) return null;
              const length = (segment.value / total) * circumference;
              const dash = `${Math.max(0, length - 2)} ${circumference - Math.max(0, length - 2)}`;
              const element = (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={hover === index ? thickness + 5 : thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: 'stroke-width .18s ease', cursor: 'default' }}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="adm-donut-center">
          <strong>{hover !== null ? formatFaNumber(segments[hover].value) : centerValue ?? formatFaNumber(total)}</strong>
          <span>{hover !== null ? segments[hover].label : centerLabel ?? 'کل'}</span>
        </div>
      </div>
      <ul className="adm-donut-legend">
        {segments.map((segment, index) => (
          <li
            key={segment.label}
            data-dim={hover !== null && hover !== index ? 'true' : segment.value === 0 ? 'true' : undefined}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={{ background: segment.color }} />
            <small>{segment.label}</small>
            <strong>
              {formatFaNumber(segment.value)}
              {total > 0 && segment.value > 0 ? <em>{toFaDigits(Math.round((segment.value / total) * 100))}٪</em> : null}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────── Sparkline ───────────────────────────

export function Sparkline({ values, tone = 'olive' }: { values: number[]; tone?: Tone }) {
  const width = 96;
  const height = 30;
  const max = Math.max(1, ...values);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((value, index) => ({
    x: index * step,
    y: height - 3 - ((value - min) / span) * (height - 8),
  }));
  const line = smoothPath(pts);
  const id = useId();

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TONE_COLOR[tone]} stopOpacity={0.22} />
          <stop offset="100%" stopColor={TONE_COLOR[tone]} stopOpacity={0} />
        </linearGradient>
      </defs>
      {line && (
        <>
          <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
          <path d={line} fill="none" stroke={TONE_COLOR[tone]} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {pts.length > 0 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.6} fill={TONE_COLOR[tone]} />}
    </svg>
  );
}

// ─────────────────────────── HBarList ───────────────────────────

export function HBarList({
  items,
  tone = 'olive',
  formatValue = (value: number) => toFaDigits(value),
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
  tone?: Tone;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="adm-hbars">
      {items.map((item) => (
        <li key={item.label}>
          <div className="adm-hbars-head">
            <small>{item.label}</small>
            <strong>
              {formatValue(item.value)}
              {item.hint ? <em>{item.hint}</em> : null}
            </strong>
          </div>
          <div className="adm-hbars-track">
            <span style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, background: TONE_COLOR[tone] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
