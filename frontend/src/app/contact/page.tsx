'use client';

import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';
import { api } from '@/lib/api';

const SUPPORT_EMAIL = 'info@vodda.app';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanContact = contact.trim();
    const cleanMessage = message.trim();

    if (cleanName.length < 2 || cleanContact.length < 5 || cleanMessage.length < 10) {
      setError('نام، راه ارتباطی و متن پیام را کامل وارد کنید.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSent(false);
    try {
      await api.sendSupportMessage({ name: cleanName, contact: cleanContact, message: cleanMessage });
      setSent(true);
      setName('');
      setContact('');
      setMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ارسال پیام انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="تماس با ما" title="پیام شما ثبت و پیگیری می‌شود" sub="سؤال، پیشنهاد یا گزارش مشکل را مستقیم برای تیم وُدّا بفرستید." />

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 36 }}>
          <div style={{ flex: '1 1 260px' }}>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--sh-sm)', color: 'inherit', textDecoration: 'none' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="message" size={24} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>ایمیل جایگزین پشتیبانی</div>
                <div dir="ltr" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{SUPPORT_EMAIL}</div>
              </div>
            </a>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 2, marginTop: 14 }}>
              فرم روبه‌رو پیام را داخل سامانه ثبت می‌کند. اطلاعات حقوقی و شماره تماس عمومی پس از نهایی‌شدن مجموعه منتشر می‌شود.
            </p>
          </div>

          <div style={{ flex: '1 1 360px', background: '#fff', borderRadius: 20, padding: 28, boxShadow: 'var(--sh-sm)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>ارسال پیام</h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.9, color: 'var(--ink-3)', marginBottom: 18 }}>
              ایمیل یا شماره تماس معتبری بنویسید تا امکان پاسخ‌گویی وجود داشته باشد.
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input aria-label="نام و نام خانوادگی" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" placeholder="نام و نام خانوادگی" style={inputStyle} disabled={submitting} />
              <input aria-label="ایمیل یا شماره تماس" value={contact} onChange={(event) => setContact(event.target.value)} maxLength={160} autoComplete="email" placeholder="ایمیل یا شماره تماس" style={inputStyle} disabled={submitting} />
              <textarea aria-label="متن پیام" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="متن پیام…" style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} disabled={submitting} />
              {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rose)', lineHeight: 1.8 }}>{error}</div>}
              {sent && !error && (
                <div role="status" style={{ fontSize: 13, color: 'var(--olive-700)', lineHeight: 1.8 }}>
                  پیام با موفقیت ثبت شد. پس از بررسی از طریق راه ارتباطی واردشده پاسخ می‌دهیم.
                </div>
              )}
              <button type="submit" disabled={submitting} style={{ padding: '14px', borderRadius: 999, border: 'none', cursor: submitting ? 'wait' : 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'در حال ارسال…' : 'ثبت پیام'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '12px 16px', borderRadius: 14, border: '1px solid var(--sand-200)',
  fontFamily: 'inherit', fontSize: 14, outline: 'none', width: '100%',
};
