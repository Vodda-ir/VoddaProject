'use client';

// ------------------------------------------------------------------------
// منوی کشویی زیبای وُدّا — نسخهٔ وب (پنل و صفحات عمومی).
// همان اصل اپ یونیورسال: تریگر شیشه‌ای با آیکون و زیرنویس + پنل شناور
// گروه‌بندی‌شده با جستجو، RTL/LTR با ویژگی‌های منطقی و دسترس‌پذیری کامل.
// استایل‌ها در globals.css با پیشوند web-menu-* تعریف شده‌اند.
// ------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';

export type WebMenuOption = {
  key: string;
  title: string;
  sub?: string;
  icon?: string;
  badge?: string;
  gold?: boolean;
};

export type WebMenuGroup = {
  title: string;
  items: WebMenuOption[];
};

export function MenuSelect({
  ariaLabel,
  placeholder,
  displayTitle,
  displaySub,
  displayIcon,
  displayGold = false,
  groups,
  onPick,
  searchable = false,
  searchPlaceholder,
  countLabel,
}: {
  ariaLabel: string;
  placeholder: string;
  displayTitle?: string;
  displaySub?: string;
  displayIcon?: string;
  displayGold?: boolean;
  groups: ReadonlyArray<WebMenuGroup>;
  onPick: (key: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  countLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      const timer = window.setTimeout(() => searchRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    if (open) setQuery('');
    return undefined;
  }, [open, searchable]);

  const filteredGroups = useMemo<WebMenuGroup[]>(() => {
    const q = query.trim();
    if (!q) return [...groups];
    return groups
      .map((group) => ({
        title: group.title,
        items: group.items.filter(
          (item) => item.title.includes(q) || (item.sub ?? '').includes(q) || group.title.includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const total = useMemo(() => groups.reduce((sum, group) => sum + group.items.length, 0), [groups]);
  const hasSelection = Boolean(displayTitle);

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className={`web-menu-trigger${open ? ' web-menu-trigger-open' : ''}${hasSelection && displayGold ? ' web-menu-trigger-gold' : ''}`}
      >
        <span aria-hidden="true" className={`web-menu-trigger-icon${hasSelection && displayGold ? ' web-menu-trigger-icon-gold' : ''}`}>
          <Icon name={(displayIcon ?? 'list') as 'list'} size={19} />
        </span>
        <span style={{ minWidth: 0, flex: 1, display: 'grid', gap: 2, textAlign: 'right' }}>
          {hasSelection ? (
            <>
              <strong className="web-menu-trigger-title">{displayTitle}</strong>
              {displaySub ? <span className="web-menu-trigger-sub">{displaySub}</span> : null}
            </>
          ) : (
            <span className="web-menu-trigger-placeholder">{placeholder}</span>
          )}
        </span>
        {countLabel && total > 0 ? (
          <span className="web-menu-count">
            {String(total).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[+digit])} {countLabel}
          </span>
        ) : null}
        <span aria-hidden="true" className={`web-menu-chevron${open ? ' web-menu-chevron-open' : ''}`}>
          <Icon name="chevronL" size={16} stroke={2.2} />
        </span>
      </button>

      {open ? (
        <div role="listbox" aria-label={ariaLabel} className="web-menu-panel">
          {searchable ? (
            <div className="web-menu-search">
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder ?? 'جستجو…'}
                aria-label="جستجو در فهرست"
              />
            </div>
          ) : null}

          {total === 0 ? (
            <p className="web-menu-empty">گزینه‌ای برای نمایش وجود ندارد</p>
          ) : filteredGroups.length === 0 ? (
            <p className="web-menu-empty">چیزی یافت نشد؛ عبارت دیگری را جستجو کنید</p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.title} className="web-menu-group">
                <strong className="web-menu-group-title">{group.title}</strong>
                {group.items.map((item) => {
                  const selected = hasSelection && item.title === displayTitle;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                        onPick(item.key);
                      }}
                      className={`web-menu-item${selected ? ' web-menu-item-active' : ''}`}
                    >
                      <span aria-hidden="true" className={`web-menu-item-icon${item.gold ? ' web-menu-item-icon-gold' : ''}`}>
                        <Icon name={(item.icon ?? 'book') as 'book'} size={16} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1, display: 'grid', gap: 2, textAlign: 'right' }}>
                        <span className="web-menu-item-title">
                          {item.title}
                          {item.badge ? <span className={`web-menu-item-badge${item.gold ? ' web-menu-item-badge-gold' : ''}`}>{item.badge}</span> : null}
                        </span>
                        {item.sub ? <span className="web-menu-item-sub">{item.sub}</span> : null}
                      </span>
                      {selected ? <Icon name="check" size={15} stroke={2.4} style={{ flex: '0 0 auto', color: 'var(--olive-600)' }} /> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
