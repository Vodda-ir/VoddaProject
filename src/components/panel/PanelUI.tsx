'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/components/Icon';

export function PanelPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ops-page-header">
      <div className="ops-page-heading">
        {eyebrow && <span className="ops-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ops-page-actions">{actions}</div>}
    </header>
  );
}

export function PanelMetric({
  icon,
  label,
  value,
  hint,
  tone = 'olive',
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'olive' | 'gold' | 'clay' | 'info';
}) {
  return (
    <article className="ops-metric-card" data-tone={tone}>
      <span className="ops-metric-icon"><Icon name={icon} size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {hint && <span>{hint}</span>}
      </div>
    </article>
  );
}

export function PanelSection({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ops-section-card ${className}`.trim()}>
      {(title || action) && (
        <div className="ops-section-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PanelEmpty({
  icon = 'info',
  title,
  description,
  action,
}: {
  icon?: Parameters<typeof Icon>[0]['name'];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ops-empty-state">
      <span><Icon name={icon} size={23} /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function PanelStatus({
  status,
  children,
}: {
  status: 'approved' | 'pending' | 'rejected' | 'active' | 'inactive' | 'paid' | 'done' | 'canceled' | 'info';
  children: ReactNode;
}) {
  return <span className="ops-status" data-status={status}>{children}</span>;
}

export function PanelButton({
  children,
  icon,
  tone = 'default',
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: Parameters<typeof Icon>[0]['name'];
  tone?: 'default' | 'primary' | 'danger' | 'success';
}) {
  return (
    <button
      {...props}
      className={`ops-button ${props.className || ''}`.trim()}
      data-tone={tone}
      style={style}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export const panelInputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  padding: '9px 12px',
  border: '1px solid var(--sand-200)',
  borderRadius: 11,
  outline: 'none',
  color: 'var(--ink)',
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: 12.5,
};
