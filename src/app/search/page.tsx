'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Teacher } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Nav, Footer, bioIntro } from '@/components/web/sections';
import { Avatar, PublicPageHero } from '@/components/web/ui';
import { avatarUrl, fullUrl } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

const LIMIT = 20;

const fields = [
  { id: '', label: 'همه' },
  { id: 'آموزش قرآن کریم', label: 'آموزش قرآن' },
];

function normalizeField(value: string): string {
  if (value === 'quran') return 'آموزش قرآن کریم';
  return fields.some((field) => field.id === value) ? value : '';
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [field, setField] = useState('');
  const [female, setFemale] = useState(false);
  const [topicId, setTopicId] = useState(0);
  const [topicTitle, setTopicTitle] = useState('');
  const [page, setPage] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('q') || '');
    setCity(params.get('city') || '');
    setField(normalizeField(params.get('field') || ''));
    setFemale(params.get('female') === 'true');
    setTopicId(Number.parseInt(params.get('official_service_id') || '0', 10) || 0);
    setPage(Math.max(0, Number.parseInt(params.get('page') || '1', 10) - 1 || 0));
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!topicId) {
      setTopicTitle('');
      return;
    }
    let active = true;
    fetch('/api/backend/catalog/services', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        const groups: Array<{ services?: Array<{ id: number; title: string }> }> = body?.data?.categories ?? [];
        let foundTitle = '';
        for (const group of groups) {
          const hit = group.services?.find((item) => item.id === topicId);
          if (hit) {
            foundTitle = hit.title;
            break;
          }
        }
        setTopicTitle(foundTitle);
      })
      .catch(() => {
        if (active) setTopicTitle('');
      });
    return () => {
      active = false;
    };
  }, [topicId]);

  useEffect(() => {
    if (!initialized) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
        if (query.trim()) params.set('q', query.trim());
        if (city.trim()) params.set('city', city.trim());
        if (field) params.set('field', field);
        if (female) params.set('female', 'true');
        if (topicId) params.set('official_service_id', String(topicId));

        const response = await fetch(`/api/backend/teachers?${params}`, { cache: 'no-store', signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'جستجوی استاد انجام نشد.');

        setResults(body.data || []);
        setTotal(body.total || 0);

        const url = new URL(window.location.href);
        for (const key of ['q', 'city', 'field', 'female', 'page', 'official_service_id']) url.searchParams.delete(key);
        if (query.trim()) url.searchParams.set('q', query.trim());
        if (city.trim()) url.searchParams.set('city', city.trim());
        if (field) url.searchParams.set('field', field);
        if (female) url.searchParams.set('female', 'true');
        if (topicId) url.searchParams.set('official_service_id', String(topicId));
        if (page > 0) url.searchParams.set('page', String(page + 1));
        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'جستجوی استاد انجام نشد.');
        setResults([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, city, field, female, topicId, page, initialized]);

  const totalPages = Math.ceil(total / LIMIT);
  const resetPage = (update: () => void) => {
    setPage(0);
    update();
  };
  const hasFilter = Boolean(query.trim() || city.trim() || field || female || topicId);

  function clearFilters() {
    setPage(0);
    setQuery('');
    setCity('');
    setField('');
    setFemale(false);
    setTopicId(0);
  }

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <PublicPageHero
        kicker="جستجوی استاد"
        title="استادی را پیدا کنید که با مسیر شما هماهنگ است"
        description="فقط پروفایل استادان فعال و تأییدشده در نتایج عمومی نمایش داده می‌شود."
        icon="search"
      />

      <main className="public-container public-content">
        {topicId ? (
          <div className="ops-inline-note" style={{ marginBottom: 14 }}>
            <Icon name="quran" size={16} />
            <span style={{ flex: 1 }}>
              موضوع: <strong>{topicTitle || `#${topicId}`}</strong> — فقط اساتیدی که این موضوع رسمی را تدریس می‌کنند.
            </span>
            <Link href="/dispatch" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 800, color: 'var(--olive-600)' }}>
              <Icon name="bell" size={15} /> فراخوان بزن
            </Link>
            <button type="button" onClick={() => setTopicId(0)} aria-label="حذف فیلتر موضوع" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontFamily: 'inherit' }}>
              <Icon name="x" size={15} />
            </button>
          </div>
        ) : null}
        <section className="web-search-panel">
          <div className="web-search-fields">
            <label>
              <Icon name="search" size={19} />
              <input className="input-base"
                type="search"
                value={query}
                onChange={(event) => resetPage(() => setQuery(event.target.value))}
                placeholder="نام یا تخصص استاد"
                aria-label="نام یا تخصص استاد"
              />
            </label>
            <label>
              <Icon name="pin" size={18} />
              <input className="input-base"
                type="search"
                value={city}
                onChange={(event) => resetPage(() => setCity(event.target.value))}
                placeholder="شهر"
                aria-label="شهر"
              />
            </label>
          </div>

          <div className="web-search-filters">
            <span className="web-search-filter-label"><Icon name="filter" size={16} />فیلترها</span>
            {fields.map((item) => (
              <button type="button" key={item.id} onClick={() => resetPage(() => setField(item.id))} className={field === item.id ? 'active' : undefined}>
                {item.label}
              </button>
            ))}
            <button type="button" onClick={() => resetPage(() => setFemale((value) => !value))} className={female ? 'active' : undefined}>
              اساتید بانو
            </button>
            {hasFilter && <button type="button" className="clear" onClick={clearFilters}><Icon name="x" size={14} />پاک کردن</button>}
          </div>
        </section>

        <div className="web-results-head">
          <div>
            <small>نتایج جستجو</small>
            <strong>{loading ? 'در حال دریافت استادان…' : `${toFaDigits(total)} استاد یافت شد`}</strong>
          </div>
          {!loading && total > 0 && <span>صفحه {toFaDigits(page + 1)} از {toFaDigits(Math.max(totalPages, 1))}</span>}
        </div>

        {loading ? (
          <div className="web-search-loading">
            {[0, 1, 2, 3].map((item) => <div key={item} />)}
          </div>
        ) : error ? (
          <div className="web-search-state error" role="alert">
            <span><Icon name="info" size={25} /></span>
            <strong>جستجو انجام نشد</strong>
            <p>{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="web-search-state">
            <span><Icon name="search" size={28} /></span>
            <strong>نتیجه‌ای با این فیلترها پیدا نشد</strong>
            <p>عبارت جستجو یا فیلترها را تغییر دهید.</p>
            {hasFilter && <button type="button" onClick={clearFilters}>پاک کردن فیلترها</button>}
          </div>
        ) : (
          <>
            <div className="web-teacher-results">
              {results.map((teacher) => <SearchTeacherCard key={teacher.id} teacher={teacher} />)}
            </div>

            {totalPages > 1 && (
              <nav aria-label="صفحه‌بندی نتایج" className="web-pagination">
                <button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
                  قبلی
                </button>
                <span>{toFaDigits(page + 1)} / {toFaDigits(totalPages)}</span>
                <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>
                  بعدی
                </button>
              </nav>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SearchTeacherCard({ teacher }: { teacher: Teacher }) {
  const name = teacher.user?.name || 'استاد وُدّا';
  const price = Math.max(0, teacher.price30 || teacher.services?.[0]?.price || 0);

  return (
    <Link href={`/teachers/${teacher.id}`} className="web-search-teacher-card">
      <div className="web-search-teacher-top">
        <Avatar size={58} ring tier={teacher.tier} imageUrl={avatarUrl(teacher.user?.avatar_url, teacher.user?.updated_at)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{name}</strong>
          <span>{teacher.tag || teacher.field}</span>
        </div>
        {teacher.rating > 0 && (
          <span className="web-search-rating"><Icon name="star" size={14} fill />{toFaDigits(teacher.rating.toFixed(1))}</span>
        )}
      </div>

      <div className="web-search-teacher-meta">
        {teacher.city && <span><Icon name="pin" size={14} />{teacher.city}</span>}
        <span><Icon name="calendar" size={14} />{toFaDigits(teacher.sessions || 0)} جلسه</span>
        <span><Icon name="message" size={14} />{toFaDigits(teacher.reviews || 0)} نظر</span>
      </div>

      {teacher.bio && <p>{bioIntro(teacher.bio)}</p>}

      <div className="web-search-teacher-footer">
        <span>
          <small>شروع جلسه از</small>
          <strong>{price > 0 ? `${formatFaNumber(price)} تومان` : 'مشاهده خدمات'}</strong>
        </span>
        <span className="web-search-card-cta">پروفایل و رزرو <Icon name="arrowL" size={15} /></span>
      </div>
    </Link>
  );
}
