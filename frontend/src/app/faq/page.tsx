'use client';

import { useState } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

const faqs = [
  {
    q: 'چگونه می‌توانم استاد رزرو کنم؟',
    a: 'پس از ورود، از صفحهٔ جستجو استاد و خدمت تأییدشده را انتخاب کنید. سپس یکی از زمان‌های معتبر برنامهٔ کاری استاد را برگزینید و درخواست را ثبت کنید.',
  },
  {
    q: 'هزینهٔ جلسه چگونه محاسبه می‌شود؟',
    a: 'قیمت هر خدمت توسط استاد تعیین و پیش از ثبت رزرو نمایش داده می‌شود. مبلغ هنگام رزرو از موجودی کیف پول کسر می‌شود و نتیجهٔ بازگشت وجه یا تسویه در دفتر تراکنش‌ها قابل مشاهده است.',
  },
  {
    q: 'اگر جلسه لغو یا رد شود چه می‌شود؟',
    a: 'در جریان فعلی، رد درخواست توسط استاد یا لغو معتبر جلسه باعث بازگشت کامل مبلغ به کیف پول قرآن‌آموز می‌شود. وضعیت و تراکنش بازگشت وجه در پنل ثبت خواهد شد.',
  },
  {
    q: 'چگونه می‌توانم استاد شوم؟',
    a: 'از بخش «استاد شوید» اطلاعات حرفه‌ای خود را ثبت کنید. پروفایل و هر خدمت جدید فقط پس از بررسی مدیر در جستجوی عمومی منتشر می‌شود.',
  },
  {
    q: 'جلسه چگونه برگزار می‌شود؟',
    a: 'در نسخهٔ فعلی، وُدّا رزرو، تأیید و پیگیری وضعیت جلسه را مدیریت می‌کند. تماس صوتی داخل سامانه هنوز فعال نشده و شیوهٔ برگزاری باید پس از تأیید جلسه با استاد هماهنگ شود.',
  },
  {
    q: 'کیف پول چگونه شارژ می‌شود؟',
    a: 'اتصال درگاه پرداخت عمومی هنوز فعال نشده است. تا زمان تکمیل و آزمون درگاه، دکمهٔ شارژ در نسخهٔ production نمایش داده نمی‌شود و هیچ پرداخت آنلاین آزمایشی به‌عنوان پرداخت واقعی معرفی نخواهد شد.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="سؤالات متداول" title="پاسخ پرسش‌های شما" sub="پاسخ‌ها بر اساس قابلیت‌های فعال نسخهٔ فعلی وُدّا نوشته شده‌اند." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 36 }}>
          {faqs.map((item, index) => {
            const expanded = open === index;
            const panelId = `faq-panel-${index}`;
            return (
              <section key={item.q} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh-sm)' }}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? -1 : index)}
                  style={{
                    width: '100%', padding: '18px 20px', border: 'none', cursor: 'pointer',
                    background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: 'inherit', fontSize: 15, fontWeight: 700, textAlign: 'right',
                  }}
                >
                  {item.q}
                  <Icon name="chevronUp" size={20} style={{ transform: expanded ? 'none' : 'rotate(180deg)', transition: 'transform .2s', color: 'var(--ink-3)', flexShrink: 0 }} />
                </button>
                {expanded && (
                  <div id={panelId} style={{ padding: '0 20px 18px', fontSize: 14, lineHeight: 2, color: 'var(--ink-3)' }}>
                    {item.a}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
