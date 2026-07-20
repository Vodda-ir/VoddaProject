'use client';

import { FormEvent, useState } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

const SUPPORT_EMAIL = 'info@vodda.app';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanContact = contact.trim();
    const cleanMessage = message.trim();

    if (cleanName.length < 2 || cleanContact.length < 5 || cleanMessage.length < 10) {
      setError('نام، راه ارتباطی و متن پیام را کامل وارد کنید.');
      return;
    }

    setError('');
    const subject = encodeURIComponent(`پیام سایت وُدّا از طرف ${cleanName}`);
    const body = encodeURIComponent(
      `نام: ${cleanName}\nراه ارتباطی: ${cleanContact}\n\nپیام:\n${cleanMessage}`,
    );
    setOpened(true);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="تماس با ما" title="در خدمت شما هستیم" sub="سؤال، پیشنهاد یا انتقاد خود را از طریق ایمیل برای ما بفرستید." />

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 36 }}>
          <div style={{ flex: '1 1 260px' }}>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--sh-sm)', color: 'inherit', textDecoration: 'none' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="message" size={24} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>ایمیل پشتیبانی</div>
                <div dir="ltr" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{SUPPORT_EMAIL}</div>
              </div>
            </a>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 2, marginTop: 14 }}>
              شماره تلفن و آدرس عمومی پس از نهایی‌شدن اطلاعات حقوقی مجموعه در همین صفحه درج می‌شود.
            </p>
          </div>

          <div style={{ flex: '1 1 360px', background: '#fff', borderRadius: 20, padding: 28, boxShadow: 'var(--sh-sm)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>ارسال از برنامه ایمیل</h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.9, color: 'var(--ink-3)', marginBottom: 18 }}>
              پس از زدن دکمه، برنامه ایمیل دستگاه باز می‌شود. ارسال نهایی را در همان برنامه تأیید کنید.
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input aria-label="نام و نام خانوادگی" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" placeholder="نام و نام خانوادگی" style={inputStyle} />
              <input aria-label="ایمیل یا شماره تماس" value={contact} onChange={(event) => setContact(event.target.value)} maxLength={120} autoComplete="email" placeholder="ایمیل یا شماره تماس" style={inputStyle} />
              <textarea aria-label="متن پیام" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="متن پیام…" style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
              {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rose)' }}>{error}</div>}
              {opened && !error && (
                <div role="status" style={{ fontSize: 13, color: 'var(--olive-700)', lineHeight: 1.8 }}>
                  برنامه ایمیل باز شد؛ برای تکمیل فرایند، ارسال را در آن تأیید کنید.
                </div>
              )}
              <button type="submit" style={{ padding: '14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>
                آماده‌کردن ایمیل
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 14, border: '1px solid var(--sand-200)',
  fontFamily: 'inherit', fontSize: 14, outline: 'none', width: '100%',
};
