'use client';

// Reusable building blocks for the advanced Vodda admin panel:
// KPI cards, data tables, filter tabs, search, drawer and CSV export.

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { Sparkline, type Tone } from '@/components/admin/charts';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

// ─────────────────────────── StatCard ───────────────────────────

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'olive',
  delta,
  trend,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  delta?: number | null;
  trend?: number[];
}) {
  return (
    <article className="adm-stat" data-tone={tone}>
      <div className="adm-stat-top">
        <span className="adm-stat-icon"><Icon name={icon} size={19} /></span>
        {trend && trend.length > 1 && <Sparkline values={trend} tone={tone} />}
      </div>
      <strong className="adm-stat-value">{value}</strong>
      <div className="adm-stat-label">
        <span>{label}</span>
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <em data-up={delta >= 0 ? 'true' : undefined}>
            <Icon name={delta >= 0 ? 'arrowUpRight' : 'arrowDownLeft'} size={12} />
            {toFaDigits(Math.abs(Math.round(delta)))}٪
          </em>
        )}
      </div>
      {hint && <small className="adm-stat-hint">{hint}</small>}
    </article>
  );
}

/** Percentage change between two numbers; null when not computable. */
export function deltaOf(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─────────────────────────── FilterTabs ───────────────────────────

export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
  counts,
  ariaLabel,
}: {
  items: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
  ariaLabel: string;
}) {
  return (
    <div className="adm-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value || 'all'}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className="adm-tab"
          data-active={value === item.value ? 'true' : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {counts && counts[item.value] !== undefined && (
            <span className="adm-tab-count">{toFaDigits(counts[item.value] as number)}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────── SearchInput ───────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 350,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <label className="adm-search">
      <Icon name="search" size={16} />
      <input
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(next), delay);
        }}
      />
    </label>
  );
}

// ─────────────────────────── DataTable ───────────────────────────

export type TableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string | number;
  align?: 'start' | 'center' | 'end';
};

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  loading,
  emptyTitle,
  emptyDescription,
  emptyIcon = 'info',
  onRowClick,
  rowStyle,
}: {
  columns: Array<TableColumn<T>>;
  rows: T[];
  loading?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: IconName;
  onRowClick?: (row: T) => void;
  rowStyle?: (row: T) => React.CSSProperties | undefined;
}) {
  const skeletonRows = 6;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width, textAlign: column.align ?? 'start' }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }).map((_, index) => (
              <tr key={`skeleton-${index}`} aria-hidden="true">
                {columns.map((column) => (
                  <td key={column.key}>
                    <span className="adm-skeleton" style={{ width: `${55 + ((index * 13) % 35)}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="adm-table-empty">
                  <span><Icon name={emptyIcon} size={22} /></span>
                  <strong>{emptyTitle}</strong>
                  {emptyDescription && <p>{emptyDescription}</p>}
                </div>
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={String(row.id)}
                data-clickable={onRowClick ? 'true' : undefined}
                style={rowStyle?.(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align ?? 'start' }}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────── Pagination ───────────────────────────

export function TablePagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="adm-pagination">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="صفحه قبل">
        <Icon name="chevronL" size={15} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <span>
        صفحه {toFaDigits(page + 1)} از {toFaDigits(totalPages)}
      </span>
      <button type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} aria-label="صفحه بعد">
        <Icon name="chevronL" size={15} />
      </button>
    </div>
  );
}

// ─────────────────────────── Drawer ───────────────────────────

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <button type="button" aria-label="بستن" className="adm-drawer-overlay" onClick={onClose} />
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="adm-drawer-close" onClick={onClose} aria-label="بستن پنل">
            <Icon name="x" size={17} />
          </button>
        </header>
        <div className="adm-drawer-body">{children}</div>
      </aside>
    </>
  );
}

// ─────────────────────────── CSV export ───────────────────────────

export function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────── Mini helpers ───────────────────────────

export function TrendPill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className="adm-trend" data-up={up ? 'true' : undefined}>
      <Icon name={up ? 'arrowUpRight' : 'arrowDownLeft'} size={12} />
      {toFaDigits(Math.abs(value))}٪
    </span>
  );
}

export function KeyValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="adm-kv">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

/** Sums a daily series into window totals + previous-window totals for delta badges. */
export function windowTotals(series: Array<Record<string, number>>, key: string, days: number) {
  const values = useMemo(() => series.map((point) => Number(point[key] || 0)), [series, key]);
  const current = values.slice(-days).reduce((sum, value) => sum + value, 0);
  const previous = values.slice(-days * 2, -days).reduce((sum, value) => sum + value, 0);
  return { current, previous };
}

export function formatMoney(value: number): string {
  return `${formatFaNumber(Math.round(value))} تومان`;
}
