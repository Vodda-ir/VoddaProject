'use client';

import { useState } from 'react';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero, WebBtn } from '@/components/web/ui';

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
      <PublicPageHero
        kicker="سؤالات متداول"
        title="پاسخ کوتاه و روشن به پرسش‌های رایج"
        description="پاسخ‌ها بر اساس قابلیت‌های فعال نسخهٔ فعلی وُدّا نوشته شده‌اند و از وعده‌دادن قابلیت‌های هنوز متصل‌نشده پرهیز می‌کنند."
        icon="message"
      />

      <main className="public-container public-content">
        <div className="faq-layout">
          <aside className="faq-side-card">
            <span className="public-principle-icon"><Icon name="info" size={22} /></span>
            <strong>پاسخ را پیدا نکردید؟</strong>
            <p>پیام شما داخل سامانه ثبت می‌شود تا تیم وُدّا بتواند آن را پیگیری کند.</p>
            <WebBtn href="/contact" variant="soft" icon="message" style={{ width: '100%' }}>تماس با ما</WebBtn>
          </aside>

          <div className="faq-list">
            {faqs.map((item, index) => {
              const expanded = open === index;
              const panelId = `faq-panel-${index}`;
              return (
                <section key={item.q} className={`faq-item ${expanded ? 'open' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? -1 : index)}
                  >
                    <span className="faq-question-index">{toPersianIndex(index + 1)}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>{item.q}</span>
                    <span className="faq-chevron"><Icon name="chevronUp" size={18} /></span>
                  </button>
                  {expanded && <div id={panelId} className="faq-answer">{item.a}</div>}
                </section>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function toPersianIndex(value: number) {
  return String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}
