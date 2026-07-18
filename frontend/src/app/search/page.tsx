'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type Teacher } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Nav, Footer } from '@/components/web/sections';
import { Avatar, Stars } from '@/components/web/ui';
import { fullUrl } from '@/lib/auth';
import Link from 'next/link';

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const toman = (n: number) => fa(new Intl.NumberFormat('fa-IR').format(n));

const fields = [
  { id: '', label: 'همه' },
  { id: 'quran', label: 'آموزش قرآن' },
  { id: 'maddahi', label: 'مداحی' },
  { id: 'consult', label: 'مشاوره' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('');
  const [female, setFemale] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Teacher[]>([]);
  const [error, setError] = useState('');

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (field) params.field = field;
      if (female) params.female = female;
      const res = await api.teachers(query, params);
      setResults(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در جستجو');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, field, female]);

  useEffect(() => {
    const t = setTimeout(doSearch, 350);
    return () => clearTimeout(t);
  }, [doSearch]);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>جستجوی استاد</h1>

        <div style={{ background: '#fff', borderRadius: 20, padding: 16, boxShadow: 'var(--sh-sm)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: 'var(--sand-50)' }}>
            <Icon name="search" size={22} style={{ color: 'var(--ink-3)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام، شهر یا تخصص استاد…"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 16, fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {fields.map((f) => (
              <button
                key={f.id}
                onClick={() => setField(f.id)}
                style={{
                  padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
                  background: field === f.id ? 'var(--olive-600)' : 'var(--sand-100)',
                  color: field === f.id ? '#fff' : 'var(--ink-2s)',
                }}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setFemale(female ? '' : 'true')}
              style={{
                padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
                background: female ? 'var(--olive-600)' : 'var(--sand-100)',
                color: female ? '#fff' : 'var(--ink-2s)',
              }}
            >
              اساتید بانو
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 16, color: 'var(--ink-3)' }}>در حال جستجو…</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--rose)' }}>{error}</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Icon name="search" size={40} style={{ color: 'var(--ink-4)', marginBottom: 12 }} />
            <div style={{ fontSize: 16, color: 'var(--ink-3)' }}>نتیجه‌ای یافت نشد</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 14 }}>
              {fa(results.length)} استاد یافت شد
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {results.map((t) => (
                <Link
                  key={t.id}
                  href={`/teachers/${t.id}`}
                  style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 18, borderRadius: 20, background: '#fff', boxShadow: 'var(--sh-sm)', textDecoration: 'none', color: 'inherit', transition: 'box-shadow .15s' }}
                >
                  <Avatar size={60} ring verified={t.verified} imageUrl={fullUrl(t.user?.avatar_url)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{t.user?.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--olive-600)', marginTop: 3 }}>{t.tag} · {t.city}</div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Stars value={Math.round(t.rating)} size={12} /> {fa(t.rating.toFixed(1))}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="calendar" size={14} /> {fa(t.sessions)} جلسه
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(t.price30)}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>از ۳۰ دقیقه</div>
                  </div>
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
