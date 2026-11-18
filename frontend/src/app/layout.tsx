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

// پیش از اولین رنگ‌آمیزی اجرا می‌شود تا حالت تاریک/زبان ذخیره‌شده بدون فلش
// اعمال شود (FOUC). هم‌قاعده با ui/appearance.tsx — کلیدها یکی هستند.
const appearanceBootstrap = `(function(){try{var t=localStorage.getItem('vodda_theme');var l=localStorage.getItem('vodda_lang');var d=document.documentElement;if(t==='dark'){d.setAttribute('data-vodda-theme','dark');d.style.colorScheme='dark';}if(l==='en'){d.lang='en';d.dir='ltr';d.style.setProperty('--vodda-font',"system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif");}else{d.style.setProperty('--vodda-font',"'IRANYekanXFaNum', 'Yekan Bakh', 'Vazirmatn', system-ui, sans-serif");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: اسکریپت پیش از رنگ‌آمیزی، lang/dir/تم را روی
    // همین عنصر عوض می‌کند — این اختلاف عمدی است و نباید هشدار هیدریشن بدهد.
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
