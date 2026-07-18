'use client';

import { useState } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

const faqs = [
  { q: 'چگونه می‌توانم استاد رزرو کنم؟', a: 'کافیست در سایت ثبت‌نام کنید، از صفحه جستجو استاد موردنظر را پیدا کرده و روی دکمه رزرو جلسه بزنید. پس از انتخاب خدمت و زمان، درخواست شما برای استاد ارسال می‌شود.' },
  { q: 'هزینه جلسات چگونه محاسبه می‌شود؟', a: 'هزینه هر جلسه بر اساس نوع خدمت و مدت زمان آن تعیین می‌شود. مبلغ از کیف پول شما کسر و پس از برگزاری جلسه به استاد پرداخت می‌شود.' },
  { q:'اگر جلسه لغو شود چه می‌شود؟', a: 'در صورت لغو جلسه توسط شما یا استاد، مبلغ پرداختی به کیف پول شما بازگردانده می‌شود.' },
  { q: 'چگونه می‌توانم استاد شوم؟', a: 'از صفحه «استاد شوید» درخواست خود را ثبت کنید. پس از بررسی و تأیید توسط تیم وُدّا، به پنل استاد دسترسی خواهید یافت.' },
  { q: 'آیا جلسات به‌صورت آنلاین برگزار می‌شود؟', a: 'بله، تمام جلسات به‌صورت صوتی آنلاین از طریق اپلیکیشن وُدّا برگزار می‌شود.' },
  { q: 'کیف پول چگونه شارژ می‌شود؟', a: 'از بخش کیف پول در پنل کاربری، می‌توانید با انتخاب مبلغ موردنظر، کیف پول خود را شارژ کنید.' },
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="سوالات متداول" title="پاسخ پرسش‌های شما" sub="پاسخ پرتکرارترین سوالات کاربران را اینجا پیدا کنید." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 36 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh-sm)' }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                style={{
                  width: '100%', padding: '18px 20px', border: 'none', cursor: 'pointer',
                  background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontFamily: 'inherit', fontSize: 15, fontWeight: 700, textAlign: 'right',
                }}
              >
                {f.q}
                <Icon name="chevronUp" size={20} style={{ transform: open === i ? 'none' : 'rotate(180deg)', transition: 'transform .2s', color: 'var(--ink-3)' }} />
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 18px', fontSize: 14, lineHeight: 2, color: 'var(--ink-3)' }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
