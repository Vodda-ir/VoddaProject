'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setToken } from '@/lib/auth';
import { digitsOnly, toFaDigits } from '@/lib/persian';

/* ── Fully controlled 5-digit OTP input ── */
function OtpInput({
  length = 5,
  disabled = false,
  onComplete,
}: {
  length?: number;
  disabled?: boolean;
  onComplete: (v: string) => void;
}) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // find first empty index
  const firstEmpty = useMemo(() => values.findIndex(v => v === ''), [values]);

  // focus the first empty cell whenever values change
  useEffect(() => {
    const idx = firstEmpty === -1 ? length - 1 : firstEmpty;
    refs.current[idx]?.focus();
  }, [firstEmpty, length]);

  // click on container focuses first empty
  const onContainerClick = useCallback(() => {
    const idx = firstEmpty === -1 ? length - 1 : firstEmpty;
    refs.current[idx]?.focus();
  }, [firstEmpty, length]);

  const setValueAt = useCallback((idx: number, char: string) => {
    setValues(prev => {
      const next = [...prev];
      next[idx] = char;
      return next;
    });
  }, []);

  const clearFrom = useCallback((idx: number) => {
    setValues(prev => {
      const next = [...prev];
      for (let i = idx; i < length; i++) next[i] = '';
      return next;
    });
  }, [length]);

  const handleChange = useCallback((i: number, raw: string) => {
    const chars = digitsOnly(raw);
    if (chars.length === 0) return;

    // distribute characters starting from i
    setValues(prev => {
      const next = [...prev];
      let ci = 0;
      for (let j = i; j < length && ci < chars.length; j++, ci++) {
        next[j] = chars[ci];
      }
      return next;
    });

    // after state update, check completion
    setTimeout(() => {
      setValues(current => {
        const filled = current.filter(v => v !== '').length;
        if (filled === length) {
          onComplete(current.join(''));
        }
        return current;
      });
    }, 50);
  }, [length, onComplete]);

  const handleKeyDown = useCallback((i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (values[i] !== '') {
        // clear current and all after
        clearFrom(i);
        // focus stays on current (or previous if already empty)
        if (i > 0) refs.current[i - 1]?.focus();
        else refs.current[0]?.focus();
      } else if (i > 0) {
        // already empty, go back
        clearFrom(i - 1);
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }, [values, clearFrom, length]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = digitsOnly(e.clipboardData.getData('text'), length);
    if (pasted.length === 0) return;
    e.preventDefault();
    setValues(prev => {
      const next = Array(length).fill('');
      for (let j = 0; j < pasted.length; j++) next[j] = pasted[j];
      return next;
    });
    setTimeout(() => {
      if (pasted.length === length) onComplete(pasted);
    }, 50);
  }, [length, onComplete]);

  const isFilled = (i: number) => values[i] !== '';
  const focusIdx = firstEmpty === -1 ? length - 1 : firstEmpty;

  return (
    <div
      ref={containerRef}
      onClick={onContainerClick}
      style={{ display: 'flex', gap: 10, justifyContent: 'center', direction: 'ltr', cursor: 'text' }}
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, i) => (
        <input className="input-base"
          key={i}
          ref={el => { refs.current[i] = el; }}
          value={toFaDigits(values[i])}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={() => {
            // when clicking a filled cell before first empty, jump to first empty
            if (i > firstEmpty && firstEmpty !== -1) {
              setTimeout(() => refs.current[firstEmpty]?.focus(), 0);
            }
          }}
          maxLength={1}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={disabled}
          style={{
            width: 52, height: 58, borderRadius: 14,
            border: focusIdx === i ? '2px solid var(--olive-600)' : isFilled(i) ? '2px solid var(--olive-400)' : '2px solid var(--sand-200)',
            textAlign: 'center', fontSize: 24, fontWeight: 700,
            fontFamily: 'var(--font)', color: 'var(--ink)',
            background: isFilled(i) ? 'var(--olive-50)' : '#fff',
            outline: 'none',
            transition: 'border-color .2s, background .2s, box-shadow .2s',
            boxShadow: focusIdx === i ? '0 0 0 3px rgba(94,110,67,.15)' : 'none',
            caretColor: 'var(--olive-600)',
          }}
        />
      ))}
    </div>
  );
}

export default function PanelLogin() {
  const [mobile, setMobile] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mobileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // باگ refresh-loop: مقصد پس از ورود از ?redirect= خوانده می‌شود اما فقط مسیرهای داخلی
  // /panel/ پذیرفته می‌شوند (جلوگیری از open redirect)؛ در غیر این صورت مقصد پیش‌فرض نقش.
  const redirectTarget = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const target = new URLSearchParams(window.location.search).get('redirect') || '';
    return target.startsWith('/panel/') && !target.startsWith('/panel/login') ? target : '';
  }, []);

  useEffect(() => { if (!codeSent) mobileRef.current?.focus(); }, [codeSent]);

  async function sendOTP() {
    if (mobile.length < 11) { setError('شماره موبایل ۱۱ رقمی وارد کنید'); return; }
    setLoading(true); setError('');
    try {
      await authApi.requestOTP(mobile);
      setCodeSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally { setLoading(false); }
  }

  const handleVerify = useCallback(async (code: string) => {
    setLoading(true); setError('');
    try {
      const res = await authApi.verifyOTP(mobile, code);
      setToken(res.data.token);
      // Redirect based on role: admin → teacher → learner
      const role = res.data.user?.role || res.data.role || 'learner';
      const panel = redirectTarget
        || (role === 'admin' ? '/panel/admin' : role === 'teacher' ? '/panel/teacher' : '/panel/user');
      // باگ refresh-loop: replace به‌جای push تا دکمهٔ بازگشت مرورگر کاربر را به صفحهٔ ورود برنگرداند.
      router.replace(panel);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'کد وارد شده صحیح نیست');
    } finally { setLoading(false); }
  }, [mobile, router, redirectTarget]);

  function resetMobile() { setCodeSent(false); setError(''); }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sand-50)', fontFamily: 'var(--font)', direction: 'rtl', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 28, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: 'var(--sh-lg)', border: '1px solid var(--sand-150)', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--olive-700)' }}>
            وُدّا <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', marginBottom: 8, marginRight: 2 }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>ورود به پنل مدیریت</div>
        </div>

        {/* Mobile field — collapses when OTP sent */}
        <div style={{
          maxHeight: codeSent ? 64 : 200, overflow: 'hidden',
          opacity: codeSent ? 0.65 : 1,
          transition: 'max-height .45s cubic-bezier(.4,0,.2,1), opacity .35s, margin-bottom .35s',
          marginBottom: codeSent ? 22 : 0,
        }}>
          {!codeSent && (
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2s)', marginBottom: 8, display: 'block' }}>
              شماره موبایل
            </label>
          )}
          <input className="input-base"
            ref={mobileRef}
            value={toFaDigits(mobile)}
            onChange={e => setMobile(digitsOnly(e.target.value, 11))}
            onKeyDown={e => e.key === 'Enter' && sendOTP()}
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            disabled={codeSent}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14,
              border: '1.5px solid var(--sand-200)', fontSize: codeSent ? 15 : 16,
              fontWeight: codeSent ? 600 : 700, fontFamily: 'var(--font)',
              direction: 'ltr', textAlign: 'center', color: codeSent ? 'var(--ink-2s)' : 'var(--ink)',
              background: 'var(--sand-50)', outline: 'none',
              boxSizing: 'border-box' as const, transition: 'font-size .35s',
            }}
          />
        </div>

        {!codeSent && (
          <>
            {error && <div style={{ color: 'var(--rose)', fontSize: 12.5, marginTop: 10, textAlign: 'center' }}>{error}</div>}
            <button onClick={sendOTP} disabled={loading}
              style={{ width: '100%', marginTop: 18, padding: '14px', borderRadius: 14, border: 'none', background: loading ? 'var(--sand-200)' : 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'var(--font)', transition: 'background .2s', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'در حال ارسال…' : 'دریافت کد تأیید'}
            </button>
          </>
        )}

        {/* OTP section — slides in */}
        <div style={{
          maxHeight: codeSent ? 300 : 0, opacity: codeSent ? 1 : 0, overflow: 'hidden',
          transition: 'max-height .45s cubic-bezier(.4,0,.2,1), opacity .35s, margin-top .35s',
          marginTop: codeSent ? 0 : -8,
        }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 18 }}>
            کد تأیید ۵ رقمی به <span dir="ltr">{toFaDigits(mobile)}</span> پیامک شد
          </div>

          <OtpInput length={5} disabled={loading} onComplete={handleVerify} />

          {error && (
            <div style={{ color: 'var(--rose)', fontSize: 12.5, marginTop: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--olive-600)', fontSize: 13 }}>
              در حال بررسی…
            </div>
          )}

          <button onClick={resetMobile}
            style={{ display: 'block', margin: '20px auto 0', padding: '10px 20px', borderRadius: 12, background: 'transparent', color: 'var(--ink-3)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            ← ویرایش شماره
          </button>
        </div>
      </div>
    </div>
  );
}
