'use client';

import { useState } from 'react';
import { Logo } from './Brand';

export type NavItem = { id: string; label: string; icon: string };

export function PanelShell({
  title,
  nav,
  accent = 'olive',
  children,
}: {
  title: string;
  nav: NavItem[];
  accent?: 'olive' | 'gold';
  children: (active: string) => React.ReactNode;
}) {
  const [active, setActive] = useState(nav[0]?.id);

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-l border-sand-200 bg-surface p-4 md:flex">
        <div className="mb-6 px-2 pt-2">
          <Logo size={24} />
          <div className="mt-1 text-xs font-semibold text-ink-3">{title}</div>
        </div>
        {nav.map((n) => {
          const on = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                on ? 'bg-olive-600 text-white shadow-olive' : 'text-ink-2 hover:bg-sand-100'
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          );
        })}
        <a href="/" className="mt-auto rounded-md px-3 py-2.5 text-sm font-semibold text-ink-3 hover:bg-sand-100">
          ← بازگشت به سایت
        </a>
      </aside>

      {/* main */}
      <div className="flex flex-1 flex-col bg-sand-50">
        {/* mobile nav */}
        <div className="flex gap-2 overflow-x-auto border-b border-sand-200 bg-surface p-3 md:hidden">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                active === n.id ? 'bg-olive-600 text-white' : 'bg-sand-100 text-ink-2'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <header className="flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-extrabold text-ink">{nav.find((n) => n.id === active)?.label}</h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-olive-100 text-olive-700">👤</div>
        </header>
        <main className="flex-1 px-6 pb-10">{children(active)}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: string }) {
  return (
    <div className="rounded-lg bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-3">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-olive-600">{hint}</div>}
    </div>
  );
}

export function Placeholder({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-sand-200 bg-surface/60 p-12 text-center text-ink-3">
      بخش «{label}» — این صفحه به API بک‌اند متصل می‌شود.
    </div>
  );
}
