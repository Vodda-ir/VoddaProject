import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'وُدّا · همراهِ یادگیری قرآن و مداحی',
  description:
    'وُدّا بستری برای اتصال آسان و مطمئن قرآن‌آموزان و اساتید مجرب برای جلسات آنلاین آموزش قرآن و مداحی است.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="stylesheet" href="https://v1.fontapi.ir/css/YekanBakh" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
