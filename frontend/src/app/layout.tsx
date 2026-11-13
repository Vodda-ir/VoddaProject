import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'وُدّا · همراهِ یادگیری قرآن کریم',
  description:
    'وُدّا بستری برای اتصال آسان و مطمئن قرآنآموزان و اساتید مجرب برای جلسات آنلاین آموزش قرآن کریم است.',
  manifest: '/manifest.webmanifest',
  applicationName: 'وُدّا',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'وُدّا',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4c5a36',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
