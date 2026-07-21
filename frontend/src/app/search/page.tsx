'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Teacher } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Nav, Footer } from '@/components/web/sections';
import { Avatar, Stars } from '@/components/web/ui';
import { fullUrl } from '@/lib/auth';

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const toman = (n: number) => fa(new Intl.NumberFormat('fa-IR').format(n));

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
  const [female, setFemale] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Teacher[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('q') || '');
    setCity(params.get('city') || '');
    setField(normalizeField(params.get('field') || ''));
    setFemale(params.get('female') === 'true' ? 'true' : '');
    setInitialized(true);
  }, []);

  const doSearch = useCallback(async () => {
    if (!initialized) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (field) params.field = field;
      if (city.trim()) params.city = city.trim();
      if (female) params.female = female;
      const response = await api.teachers(query.trim(), params);
      setResults(response.data || []);

      const url = new URL(window.location.href);
      for (const key of ['q', 'city', 'field', 'female']) url.searchParams.delete(key);
      if (query.trim()) url.searchParams.set('q', query.trim());
      if (city.trim()) url.searchParams.set('city', city.trim());
      if (field) url.searchParams.set('field', field);
      if (female) url.searchParams.set('female', female);
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'خطا در جستجو');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, city, field, female, initialized]);

  useEffect(() => {
    const timeout = window.setTimeout(doSearch, 350);
    return () => window.clearTimeout(timeout);
  }, [doSearch]);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>جستجوی استاد</h1>

        <div style={{ background: '#fff', borderRadius: 20, padding: 16, boxShadow: 'var(--sh-sm)', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }} className="search-grid">
            <label style={inputWrapStyle}>
              <Icon name="search" size={22} style={{ color: 'var(--ink-3)' }} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام یا تخصص استاد…" aria-label="نام یا تخصص استاد" style={inputStyle} />
            </label>
            <label style={inputWrapStyle}>
              <Icon name="pin" size={20} style={{ color: 'var(--ink-3)' }} />
              <input type="search" value={city} onChange={(event) => setCity(event.target.value)} placeholder="شهر" aria-label="شهر" style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {fields.map((item) => (
              <button key={item.id} onClick={() => setField(item.id)} style={filterStyle(field === item.id)}>{item.label}</button>
            ))}
            <button onClick={() => setFemale(female ? '' : 'true')} style={filterStyle(Boolean(female))}>اساتید بانو</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)' }}>در حال جستجو…</div>
        ) : error ? (
          <div role="alert" style={{ textAlign: 'center', padding: 60, color: 'var(--rose)' }}>{error}</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Icon name="search" size={40} style={{ color: 'var(--ink-4)', marginBottom: 12 }} /><div style={{ fontSize: 16, color: 'var(--ink-3)' }}>نتیجه‌ای یافت نشد</div></div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 14 }}>{fa(results.length)} استاد یافت شد</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {results.map((teacher) => (
                <Link key={teacher.id} href={`/teachers/${teacher.id}`} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 18, borderRadius: 20, background: '#fff', boxShadow: 'var(--sh-sm)', textDecoration: 'none', color: 'inherit' }}>
                  <Avatar size={60} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--olive-600)', marginTop: 3 }}>{teacher.tag}{teacher.city ? ` · ${teacher.city}` : ''}</div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Stars value={Math.round(teacher.rating)} size={12} /> {fa(teacher.rating.toFixed(1))}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="calendar" size={14} /> {fa(teacher.sessions)} جلسه</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(teacher.price30)}</div><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>تومان · ۳۰ دقیقه</div></div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

const inputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: 'var(--sand-50)' };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, fontFamily: 'inherit' };
const filterStyle = (selected: boolean): React.CSSProperties => ({ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: selected ? 'var(--olive-600)' : 'var(--sand-100)', color: selected ? '#fff' : 'var(--ink-2s)' });
