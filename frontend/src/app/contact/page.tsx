'use client';

import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero, PublicSurface } from '@/components/web/ui';
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
      <PublicPageHero
        kicker="تماس با وُدّا"
        title="پیام شما داخل سامانه ثبت و پیگیری می‌شود"
        description="برای سؤال، پیشنهاد یا گزارش مشکل، راه ارتباطی معتبر بگذارید تا امکان پاسخ‌گویی وجود داشته باشد."
        icon="message"
      />

      <main className="public-container public-content">
        <div className="contact-layout">
          <div className="contact-info-column">
            <PublicSurface style={{ padding: 22 }}>
              <span className="contact-info-icon"><Icon name="message" size={23} /></span>
              <small>ایمیل پشتیبانی</small>
              <strong dir="ltr">{SUPPORT_EMAIL}</strong>
              <p>برای موضوعاتی که نیاز به توضیح یا فایل تکمیلی دارند می‌توانید مستقیماً ایمیل بزنید.</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-email-link">ارسال ایمیل <Icon name="arrowL" size={16} /></a>
            </PublicSurface>

            <PublicSurface style={{ padding: 22 }}>
              <span className="contact-info-icon olive"><Icon name="shield" size={23} /></span>
              <small>پیگیری ساختاریافته</small>
              <strong>فرم داخل سامانه</strong>
              <p>ارسال فرم این صفحه پیام را در backend ثبت می‌کند تا قابل مشاهده و پیگیری در پنل مدیریت باشد.</p>
            </PublicSurface>

            <div className="contact-note">
              <Icon name="info" size={18} />
              اطلاعات حقوقی و شماره تماس عمومی پس از نهایی‌شدن مجموعه در همین صفحه منتشر می‌شود.
            </div>
          </div>

          <PublicSurface style={{ padding: 26 }}>
            <div className="contact-form-heading">
              <span><Icon name="edit" size={20} /></span>
              <div>
                <strong>ارسال پیام</strong>
                <p>اطلاعات زیر فقط برای ثبت و پاسخ‌گویی به پیام استفاده می‌شود.</p>
              </div>
            </div>

            <form onSubmit={submit} className="contact-form">
              <label>
                <span>نام و نام خانوادگی</span>
                <input aria-label="نام و نام خانوادگی" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" placeholder="نام شما" style={inputStyle} disabled={submitting} />
              </label>
              <label>
                <span>ایمیل یا شماره تماس</span>
                <input aria-label="ایمیل یا شماره تماس" value={contact} onChange={(event) => setContact(event.target.value)} maxLength={160} autoComplete="email" placeholder="راه ارتباطی برای پاسخ" style={inputStyle} disabled={submitting} />
              </label>
              <label>
                <span>متن پیام</span>
                <textarea aria-label="متن پیام" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="سؤال یا توضیح خود را بنویسید…" style={{ ...inputStyle, minHeight: 145, resize: 'vertical' }} disabled={submitting} />
              </label>

              {error && <div role="alert" className="contact-form-message error"><Icon name="info" size={17} />{error}</div>}
              {sent && !error && <div role="status" className="contact-form-message success"><Icon name="checkCircle" size={17} />پیام با موفقیت ثبت شد. پس از بررسی از راه ارتباطی واردشده پاسخ می‌دهیم.</div>}

              <button type="submit" disabled={submitting} className="contact-submit">
                {submitting ? 'در حال ارسال…' : 'ثبت پیام'}
                {!submitting && <Icon name="arrowL" size={17} />}
              </button>
            </form>
          </PublicSurface>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 50,
  padding: '12px 14px',
  border: '1px solid var(--sand-200)',
  borderRadius: 14,
  outline: 'none',
  color: 'var(--ink)',
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: 13.5,
};
