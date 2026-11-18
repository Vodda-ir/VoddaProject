'use client';

/*
 * ۱.ب.۱ — chip شهر + bottom sheet انتخاب شهر (وب / لندینگ).
 *
 *  - chip در نوار بالای صفحهٔ نخست، گوشهٔ بالا (RTL راست / LTR چپ).
 *  - تشخیص: انتخاب ذخیره‌شده ← GPS (فقط با مجوز موجود یا یک‌بار درخواست) ← شهر
 *    پروفایل از /me ← placeholder «انتخاب شهر».
 *  - GPS → نزدیک‌ترین شهر از دیتاست آفلاین `src/lib/cities.ts` (بدون سرویس بیرونی).
 *  - ذخیره: localStorage (منبع واحد userCity) + PUT /me برای کاربر واردشده.
 *  - تغییر شهر با رویداد `vodda-city-changed` به فهرست‌های همان صفحه خبر می‌دهد.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { POPULAR_CITIES, allCityNames, nearestCity, searchCityNames } from '@/lib/cities';
import {
  CITY_CHANGE_EVENT,
  cityPermissionAsked,
  markCityPermissionAsked,
  notifyCityChanged,
  readStoredCity,
  storedCityUsable,
  writeStoredCity,
} from '@/lib/userCity';
import { formatFaNumber } from '@/lib/persian';

type MePayload = { name?: string; city?: string; bio?: string };

/** ۱.ب.۱ — اولویت هم‌شهری برای فهرست اساتید وب: درجه ۱ نخست، سپس هم‌شهری، سپس ترتیب قبلی. */
export function sortByCityPriority<T extends { city?: string; is_tier1?: boolean }>(teachers: T[], city: string): T[] {
  const key = city.trim();
  if (!key) return teachers;
  return [...teachers].sort((left, right) => {
    const tier1 = Number(right.is_tier1 === true) - Number(left.is_tier1 === true);
    if (tier1 !== 0) return tier1;
    return Number((right.city ?? '').trim() === key) - Number((left.city ?? '').trim() === key);
  });
}

async function fetchMe(): Promise<MePayload | null> {
  try {
    const response = await fetch('/api/backend/me', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) return null;
    const body = await response.json();
    return (body?.data as MePayload) ?? null;
  } catch {
    return null;
  }
}

async function geoPermissionState(): Promise<'granted' | 'denied' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function currentPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

export function CityChip() {
  const [city, setCity] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [me, setMe] = useState<MePayload | null>(null);

  /* فرآیند تشخیص — همان اولویت مشخصات؛ درخواست مکرر مجوز ممنوع. */
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = readStoredCity();
      if (storedCityUsable(stored)) {
        if (active && stored) setCity(stored.name);
        return;
      }
      const state = await geoPermissionState();
      if (state === 'granted' || (state !== 'denied' && !cityPermissionAsked())) {
        if (state !== 'granted') markCityPermissionAsked();
        const position = await currentPosition();
        const detected = position ? nearestCity(position.lat, position.lon) : null;
        if (detected) {
          writeStoredCity(detected, 'gps');
          if (active) setCity(detected);
          return;
        }
      }
      const profile = await fetchMe();
      const profileCity = profile?.city?.trim() ?? '';
      if (active && profileCity) {
        setMe(profile);
        setCity(profileCity);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* هم‌زمان‌سازی با نمونه‌های دیگر chip/فهرست‌ها در همان صفحه */
  useEffect(() => {
    const handler = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (typeof name === 'string' && name.trim()) setCity(name.trim());
    };
    window.addEventListener(CITY_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CITY_CHANGE_EVENT, handler);
  }, []);

  const applyCity = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setCity(clean);
    writeStoredCity(clean, 'saved');
    notifyCityChanged(clean);
    /* نکته: نوت خطا پاک نمی‌شود تا پیام «مجوز رد شد» همراه شهر پروفایل بماند؛ */
    if (me?.name) {
      void fetch('/api/backend/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ name: me.name, city: clean, bio: me.bio ?? '' }),
      }).catch(() => undefined);
    }
  };

  const useMyLocation = async () => {
    setDetecting(true);
    setNote(null);
    try {
      const state = await geoPermissionState();
      if (state === 'denied') {
        /* پیام بعد از applyCity ست می‌شود تا پاک نشود */
        if (me?.city?.trim()) applyCity(me.city.trim());
        setNote('مجوز موقعیت داده نشد؛ شهر پروفایل شما استفاده می‌شود.');
        return;
      }
      if (state !== 'granted') markCityPermissionAsked();
      const position = await currentPosition();
      if (!position) {
        setNote('موقعیت دریافت نشد؛ لطفاً دوباره تلاش کنید.');
        return;
      }
      const detected = nearestCity(position.lat, position.lon);
      if (!detected) {
        setNote('نزدیک‌ترین شهر ایران به موقعیت شما پیدا نشد.');
        return;
      }
      writeStoredCity(detected, 'gps');
      setCity(detected);
      notifyCityChanged(detected);
    } finally {
      setDetecting(false);
    }
  };

  const everyCity = useMemo(() => allCityNames(), []);
  const popular = useMemo(() => searchCityNames(query, POPULAR_CITIES), [query]);
  const rest = useMemo(() => searchCityNames(query, everyCity), [query, everyCity]);
  const label = city.trim() || 'انتخاب شهر';

  const pick = (name: string) => {
    applyCity(name);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="vodda-city-chip"
        onClick={() => {
          setNote(null);
          setQuery('');
          setOpen(true);
        }}
        aria-label={`شهر فعلی: ${label} — تغییر شهر`}
        title={city.trim() ? `شهر فعلی: ${label}` : 'برای انتخاب شهر بزنید'}
      >
        <Icon name="pin" size={14} stroke={1.9} />
        <span className="vodda-city-chip-label">{label}</span>
        {city.trim() ? null : <Icon name="chevronL" size={12} />}
      </button>

      {open && typeof document !== 'undefined'
        ? /* ۱.ب.۱ — portal به body: `.public-nav` backdrop-filter دارد و fixed داخلی را
           * به خود nav می‌چسباند؛ portal تضمین می‌کند sheet به viewport بچسبد. */
          createPortal(
            <>
          <button
            type="button"
            aria-label="بستن انتخاب شهر"
            className="vodda-city-sheet-backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="vodda-city-sheet" role="dialog" aria-modal="true" aria-label="انتخاب شهر">
            <div className="vodda-city-sheet-head">
              <strong>انتخاب شهر</strong>
              <button
                type="button"
                aria-label="بستن"
                className="vodda-city-sheet-close"
                onClick={() => setOpen(false)}
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            {/* ① استفاده از موقعیت من */}
            <button
              type="button"
              className="vodda-city-use-location"
              onClick={() => void useMyLocation()}
              disabled={detecting}
            >
              <Icon name="pin" size={17} stroke={2} />
              {detecting ? 'در حال دریافت موقعیت…' : 'استفاده از موقعیت من'}
            </button>

            {note && (
              <div className="vodda-city-note" role="status">
                <Icon name="info" size={14} />
                <span>{note}</span>
              </div>
            )}

            {/* ② جستجوی شهر */}
            <label className="vodda-city-search">
              <span>جستجوی شهر</span>
              <div style={{ position: 'relative' }}>
                <Icon
                  name="search"
                  size={16}
                  style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="مثلاً مشهد…"
                  aria-label="جستجوی شهر"
                />
              </div>
            </label>

            {/* ③ ۱۲ شهر پرتردد */}
            {popular.length > 0 && (
              <section aria-label="شهرهای پرتردد" className="vodda-city-group">
                <strong>شهرهای پرتردد</strong>
                <div className="vodda-city-popular">
                  {popular.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pick(name)}
                      aria-pressed={name === city}
                      className="vodda-city-pill"
                      data-active={name === city ? 'true' : undefined}
                    >
                      {name === city && <Icon name="checkCircle" size={13} stroke={2} />}
                      {name}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ④ همهٔ شهرها با جستجو */}
            <section aria-label="همهٔ شهرها" className="vodda-city-group">
              <div className="vodda-city-group-head">
                <strong>همهٔ شهرها</strong>
                <small>{formatFaNumber(rest.length)} شهر</small>
              </div>
              {rest.length === 0 ? (
                <span className="vodda-city-empty">شهری با این نام پیدا نشد.</span>
              ) : (
                <div className="vodda-city-list">
                  {rest.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pick(name)}
                      className="vodda-city-row"
                      data-active={name === city ? 'true' : undefined}
                    >
                      <span>{name}</span>
                      {name === city && <Icon name="checkCircle" size={14} stroke={2} />}
                    </button>
                  ))}
                </div>
              )}
                </section>
          </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
