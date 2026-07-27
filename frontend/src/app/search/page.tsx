'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Teacher } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Nav, Footer } from '@/components/web/sections';
import { Avatar, Stars } from '@/components/web/ui';
import { fullUrl } from '@/lib/auth';

const LIMIT = 20;
const fa = (value: number | string) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[+digit]);
const toman = (value: number) => fa(new Intl.NumberFormat('fa-IR').format(value));

const fields = [
  { id: '', label: 'همه' },
  { id: 'آموزش قرآن کریم', label: 'آموزش قرآن' },
  { id: 'مداحی اهل‌بیت', label: 'مداحی' },
];

function normalizeField(value: string): string {
  if (value === 'quran') return 'آموزش قرآن کریم';
  if (value === 'maddahi') return 'مداحی اهل‌بیت';
  return fields.some((field) => field.id === value) ? value : '';
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [field, setField] = useState('');
  const [female, setFemale] = useState(false);
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
    setPage(Math.max(0, Number.parseInt(params.get('page') || '1', 10) - 1 || 0));
    setInitialized(true);
  }, []);

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

        const response = await fetch(`/api/backend/teachers?${params}`, { cache: 'no-store', signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'جستجوی استاد انجام نشد.');
        setResults(body.data || []);
        setTotal(body.total || 0);

        const url = new URL(window.location.href);
        for (const key of ['q', 'city', 'field', 'female', 'page']) url.searchParams.delete(key);
        if (query.trim()) url.searchParams.set('q', query.trim());
        if (city.trim()) url.searchParams.set('city', city.trim());
        if (field) url.searchParams.set('field', field);
        if (female) url.searchParams.set('female', 'true');
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
  }, [query, city, field, female, page, initialized]);

  const totalPages = Math.ceil(total / LIMIT);
  const resetPage = (update: () => void) => { setPage(0); update(); };

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>جستجوی استاد</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 20, fontSize: 13.5 }}>فقط استادان فعال و تأییدشده در نتایج نمایش داده می‌شوند.</p>

        <section style={{ background: '#fff', borderRadius: 20, padding: 16, boxShadow: 'var(--sh-sm)', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }} className="search-grid">
            <label style={inputWrapStyle}>
              <Icon name="search" size={22} style={{ color: 'var(--ink-3)' }} />
              <input type="search" value={query} onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder="نام یا تخصص استاد…" aria-label="نام یا تخصص استاد" style={inputStyle} />
            </label>
            <label style={inputWrapStyle}>
              <Icon name="pin" size={20} style={{ color: 'var(--ink-3)' }} />
              <input type="search" value={city} onChange={(event) => resetPage(() => setCity(event.target.value))} placeholder="شهر" aria-label="شهر" style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {fields.map((item) => (
              <button type="button" key={item.id} onClick={() => resetPage(() => setField(item.id))} style={filterStyle(field === item.id)}>{item.label}</button>
            ))}
            <button type="button" onClick={() => resetPage(() => setFemale((value) => !value))} style={filterStyle(female)}>اساتید بانو</button>
          </div>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)' }}>در حال جستجو…</div>
        ) : error ? (
          <div role="alert" style={{ textAlign: 'center', padding: 60, color: 'var(--rose)' }}>{error}</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Icon name="search" size={40} style={{ color: 'var(--ink-4)', marginBottom: 12 }} /><div style={{ fontSize: 16, color: 'var(--ink-3)' }}>نتیجه‌ای یافت نشد.</div></div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 14 }}>{fa(total)} استاد یافت شد</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {results.map((teacher) => (
                <Link key={teacher.id} href={`/teachers/${teacher.id}`} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 18, borderRadius: 20, background: '#fff', boxShadow: 'var(--sh-sm)', color: 'inherit', flexWrap: 'wrap' }}>
                  <Avatar size={60} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} />
                  <div style={{ flex: '1 1 250px', minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--olive-600)', marginTop: 3 }}>{teacher.tag}{teacher.city ? ` · ${teacher.city}` : ''}</div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Stars value={Math.round(teacher.rating)} size={12} /> {teacher.rating > 0 ? fa(teacher.rating.toFixed(1)) : 'بدون امتیاز'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="calendar" size={14} /> {fa(teacher.sessions)} جلسه</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(teacher.price30)}</div><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>تومان · ۳۰ دقیقه</div></div>
                </Link>
              ))}
            </div>
            {totalPages > 1 && <nav aria-label="صفحه‌بندی نتایج" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}><button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} style={pageButton(page === 0)}>قبلی</button><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>صفحه {fa(page + 1)} از {fa(totalPages)}</span><button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} style={pageButton(page >= totalPages - 1)}>بعدی</button></nav>}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

const inputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: 'var(--sand-50)' };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, fontFamily: 'inherit' };
const filterStyle = (selected: boolean): React.CSSProperties => ({ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: selected ? 'var(--olive-600)' : 'var(--sand-100)', color: selected ? '#fff' : 'var(--ink-2s)' });
const pageButton = (disabled: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: 12, border: '1px solid var(--sand-200)', background: '#fff', cursor: disabled ? 'default' : 'pointer', color: disabled ? 'var(--ink-4)' : 'var(--ink)', opacity: disabled ? .5 : 1 });
