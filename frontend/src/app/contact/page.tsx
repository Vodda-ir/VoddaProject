'use client';

import { useState } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="تماس با ما" title="در خدمت شما هستیم" sub="سوال، پیشنهاد یا انتقادی دارید؟ با ما در میان بگذارید." />

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 36 }}>
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: 'message' as const, label: 'ایمیل', value: 'info@vodda.app' },
              { icon: 'phone' as const, label: 'تلفن پشتیبانی', value: '۰۲۱-۱۲۳۴۵۶۷۸' },
              { icon: 'pin' as const, label: 'آدرس', value: 'تهران، ایران' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 18, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--sh-sm)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={c.icon} size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: '1 1 300px', background: '#fff', borderRadius: 20, padding: 28, boxShadow: 'var(--sh-sm)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon name="checkCircle" size={32} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>پیام شما ارسال شد</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>به‌زودی با شما تماس می‌گیریم.</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>فرم تماس</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input placeholder="نام و نام خانوادگی" style={inputStyle} />
                  <input placeholder="ایمیل یا شماره تماس" style={inputStyle} />
                  <textarea placeholder="متن پیام…" style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
                  <button onClick={() => setSent(true)} style={{ padding: '14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>
                    ارسال پیام
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 14, border: '1px solid var(--sand-200)',
  fontFamily: 'inherit', fontSize: 14, outline: 'none',
};
