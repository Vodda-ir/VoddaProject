import type { Metadata } from 'next';
import { getAllFreeServices } from '@/lib/server/discover';
import { Nav, Footer } from '@/components/web/sections';
import { FreeServicesBrowser } from '@/components/web/FreeServicesBrowser';
import { SectionTitle } from '@/components/web/ui';

export const metadata: Metadata = {
  title: 'خدمات رایگان وُدّا',
  description: 'همهٔ جلسه‌های رایگان استادان تأییدشدهٔ وُدّا — با جستجو و فیلتر.',
};

export const dynamic = 'force-dynamic';

export default async function FreeServicesPage() {
  let cards: Awaited<ReturnType<typeof getAllFreeServices>>['data'] = [];
  try {
    cards = (await getAllFreeServices()).data;
  } catch {
    cards = [];
  }

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="public-container free-services-page" style={{ flex: 1 }}>
        <SectionTitle
          kicker="بدون هزینه"
          title="همهٔ خدمات رایگان وُدّا"
          sub="جلسه‌های رایگان استادان تأییدشده — مرتب بر پایهٔ rank استاد؛ برای شروع مسیر قرآن بدون پرداخت."
        />
        <FreeServicesBrowser cards={cards} />
      </main>
      <Footer />
    </div>
  );
}
