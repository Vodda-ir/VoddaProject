import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'وُدّا · همراهِ یادگیری قرآن کریم',
  description:
    'وُدّا بستری برای اتصال آسان و مطمئن قرآنآموزان و اساتید مجرب برای جلسات آنلاین آموزش قرآن کریم است.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
