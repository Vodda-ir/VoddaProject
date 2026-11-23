'use client';

/*
 * ۱.ب.۴ — صفحهٔ «مشاهدهٔ همهٔ خدمات رایگان» (/free-services).
 * جستجوی زنده + فیلتر دسته — کلیک روی کارت → پروفایل استاد با فیلتر همان خدمت.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { FreeServiceCard } from '@/lib/home/discover';
import { formatFaNumber } from '@/lib/persian';
import { Icon } from '@/components/Icon';
import { FreeServiceCardRow } from '@/components/web/sections';

export function FreeServicesBrowser({ cards }: { cards: FreeServiceCard[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(
    () => [...new Set(cards.map((card) => card.title).filter(Boolean))],
    [cards],
  );
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      cards.filter((card) => {
        if (category && card.title !== category) return false;
        if (!needle) return true;
        return (
          card.title.toLowerCase().includes(needle) ||
          card.teacherName.toLowerCase().includes(needle) ||
          card.teacherCity.toLowerCase().includes(needle)
        );
      }),
    [cards, category, needle],
  );

  return (
    <div className="free-services-browser">
      <label className="free-services-search">
        <Icon name="search" size={17} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجوی خدمت، نام استاد یا شهر…"
          aria-label="جستجو در خدمات رایگان"
        />
      </label>

      {categories.length > 0 ? (
        <div className="free-services-chips" role="group" aria-label="فیلتر خدمت">
          <button
            type="button"
            className="free-services-chip"
            data-active={category === '' ? 'true' : undefined}
            onClick={() => setCategory('')}
          >
            همهٔ خدمات
          </button>
          {categories.map((title) => (
            <button
              key={title}
              type="button"
              className="free-services-chip"
              data-active={category === title ? 'true' : undefined}
              onClick={() => setCategory(category === title ? '' : title)}
            >
              {title}
            </button>
          ))}
        </div>
      ) : null}

      <p className="free-services-count" role="status">
        {formatFaNumber(visible.length)} خدمت رایگان
      </p>

      {visible.length === 0 ? (
        <div className="landing-empty-state" role="status">
          <span><Icon name="search" size={27} /></span>
          <strong>خدمت رایگانی با این جستجو پیدا نشد</strong>
          <p>عبارت دیگری را امتحان کنید یا فیلتر را بردارید.</p>
        </div>
      ) : (
        <div className="vodda-hscroll vodda-service-row">
          {visible.map((card) => (
            <FreeServiceCardRow key={`${card.teacherId}-${card.id}`} card={card} />
          ))}
        </div>
      )}

      <p className="free-services-hint">
        <Icon name="info" size={14} />
        جلسه‌های رایگان با رزرو عادی پیش می‌روند؛ فقط هزینه‌ای از کیف پول شما کسر نمی‌شود.{' '}
        <Link href="/search">فهرست همهٔ اساتید</Link>
      </p>
    </div>
  );
}
