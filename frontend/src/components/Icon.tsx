import type { CSSProperties } from 'react';

// Line icon set ported from docs/design/vodda-icons.jsx (24×24, stroke=currentColor).
export type IconName =
  | 'home' | 'search' | 'calendar' | 'wallet' | 'user' | 'phone' | 'video' | 'camera'
  | 'book' | 'mic' | 'star' | 'heart' | 'chevronL' | 'chevronUp' | 'arrowL' | 'arrowDownLeft' | 'arrowUpRight' | 'play'
  | 'check' | 'checkCircle' | 'bell' | 'message' | 'pin' | 'clock' | 'info' | 'shield'
  | 'award' | 'users' | 'sparkle' | 'download' | 'quran' | 'headphones' | 'megaphone'
  | 'settings' | 'filter' | 'refresh' | 'plus' | 'logout' | 'edit' | 'grid' | 'list' | 'trending' | 'coins' | 'doc' | 'x' | 'trash' | 'gift'
  | 'sun' | 'moon';

export function Icon({
  name,
  size = 24,
  stroke = 1.7,
  fill = false,
  style = {},
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  fill?: boolean;
  style?: CSSProperties;
}) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path {...p} d="M4 11.5 12 4l8 7.5" /><path {...p} d="M6 10v9.5h12V10" /><path {...p} d="M10 19.5v-5h4v5" /></>,
    search: <><circle {...p} cx="11" cy="11" r="6.5" /><path {...p} d="m20 20-3.6-3.6" /></>,
    calendar: <><rect {...p} x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path {...p} d="M3.5 9.5h17M8 3v3.5M16 3v3.5" /></>,
    wallet: <><path {...p} d="M3.5 8c0-1.7 1.3-3 3-3h10.5c1.1 0 2 .9 2 2v0" /><rect {...p} x="3.5" y="6.5" width="17" height="13" rx="3.5" /><circle cx="16" cy="13" r="1.4" fill="currentColor" stroke="none" /></>,
    user: <><circle {...p} cx="12" cy="8" r="4" /><path {...p} d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" /></>,
    phone: <path {...p} d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3c0 1.1-.9 2-2 2A15 15 0 0 1 4.5 6c0-1.1.9-2 2-2Z" />,
    video: <><rect {...p} x="3" y="6" width="12.5" height="12" rx="3" /><path {...p} d="m15.5 10 5-3v10l-5-3" /></>,
    camera: <><path {...p} d="M5 7.5h3l1.2-2h5.6l1.2 2h3c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2Z" /><circle {...p} cx="12" cy="13" r="3.5" /></>,
    book: <><path {...p} d="M12 6.5C12 6.5 10 4.5 4.5 4.5V18c5.5 0 7.5 2 7.5 2s2-2 7.5-2V4.5C14 4.5 12 6.5 12 6.5Z" /><path {...p} d="M12 6.5v13.5" /></>,
    mic: <><rect {...p} x="9" y="3" width="6" height="11" rx="3" /><path {...p} d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></>,
    star: fill
      ? <path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.2 6.9 18.9l1-5.7-4.1-4 5.7-.8L12 3.2Z" fill="currentColor" stroke="none" />
      : <path {...p} d="M12 3.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.5l5.4-.8L12 3.8Z" />,
    heart: fill
      ? <path d="M12 20s-7-4.3-9.2-8.5C1.3 8.6 2.8 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.2 0 4.7 3.1 3.2 6C19 15.7 12 20 12 20Z" fill="currentColor" stroke="none" />
      : <path {...p} d="M12 19.5s-6.5-4-8.5-7.8C2 8.7 3.4 6 6.2 6c1.9 0 3 1.1 3.8 2.2C10.8 7.1 11.9 6 13.8 6c2.8 0 4.2 2.7 2.7 5.7C14.5 15.5 12 19.5 12 19.5Z" />,
    chevronL: <path {...p} d="m14 6-6 6 6 6" />,
    chevronUp: <path {...p} d="m6 14 6-6 6 6" />,
    arrowL: <><path {...p} d="M19 12H5" /><path {...p} d="m11 6-6 6 6 6" /></>,
    arrowDownLeft: <><path {...p} d="M17 7 7 17" /><path {...p} d="M7 7v10h10" /></>,
    arrowUpRight: <><path {...p} d="M7 17 17 7" /><path {...p} d="M7 7h10v10" /></>,
    play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />,
    check: <path {...p} d="m5 12.5 4.5 4.5L19 7" />,
    checkCircle: <><circle {...p} cx="12" cy="12" r="8.5" /><path {...p} d="m8.5 12 2.4 2.4 4.6-4.8" /></>,
    megaphone: <><path {...p} d="m3.5 10.6 17-4.9v12.6l-17-4.9v-2.8Z" /><path {...p} d="M11.7 17.2a3.1 3.1 0 1 1-5.9-1.6" /></>,
    bell: <><path {...p} d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path {...p} d="M10 19a2 2 0 0 0 4 0" /></>,
    message: <path {...p} d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16H9l-4 3.5V6.5A1.5 1.5 0 0 1 6.5 5Z" />,
    pin: <><path {...p} d="M12 21s6.5-5.5 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.5 12 21 12 21Z" /><circle {...p} cx="12" cy="10" r="2.3" /></>,
    clock: <><circle {...p} cx="12" cy="12" r="8.5" /><path {...p} d="M12 7.5V12l3 2" /></>,
    info: <><circle {...p} cx="12" cy="12" r="8.5" /><path {...p} d="M12 10.5v5" /><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" /></>,
    shield: <><path {...p} d="M12 3.5 5 6v5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6l-7-2.5Z" /><path {...p} d="m9 12 2 2 4-4" /></>,
    award: <><circle {...p} cx="12" cy="9" r="5" /><path {...p} d="m8.5 13.5-1.5 6 5-2.5 5 2.5-1.5-6" /></>,
    users: <><circle {...p} cx="9" cy="8" r="3.3" /><path {...p} d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" /><path {...p} d="M16 5.2a3.3 3.3 0 0 1 0 6.4M17 14c2.4.4 4 2.3 4 5" /></>,
    sparkle: <path {...p} d="M12 4c.6 3.5 1.5 4.4 5 5-3.5.6-4.4 1.5-5 5-.6-3.5-1.5-4.4-5-5 3.5-.6 4.4-1.5 5-5Z" />,
    download: <><path {...p} d="M12 4v10m0 0 4-4m-4 4-4-4" /><path {...p} d="M5 18.5h14" /></>,
    quran: <><path {...p} d="M12 6.5C12 6.5 10 4.5 4.5 4.5V18c5.5 0 7.5 2 7.5 2s2-2 7.5-2V4.5C14 4.5 12 6.5 12 6.5Z" /><path {...p} d="M12 6.5v13.5" /><path {...p} d="M8.2 10.5c.6.5 1 1.2 1 2s-.4 1.5-1 2M15.8 10.5c-.6.5-1 1.2-1 2s.4 1.5 1 2" /></>,
    headphones: <><path {...p} d="M5 13v-1a7 7 0 0 1 14 0v1" /><rect {...p} x="3.5" y="13" width="3.5" height="6" rx="1.6" /><rect {...p} x="17" y="13" width="3.5" height="6" rx="1.6" /></>,
    settings: <><circle {...p} cx="12" cy="12" r="3" /><path {...p} d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></>,
    filter: <><path {...p} d="M4 6h16M7 12h10M10 18h4" /><circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" /></>,
    refresh: <><path {...p} d="M19 8a7.5 7.5 0 0 0-12.5-2L4 8.5" /><path {...p} d="M4 4v4.5h4.5" /><path {...p} d="M5 16a7.5 7.5 0 0 0 12.5 2l2.5-2.5" /><path {...p} d="M20 20v-4.5h-4.5" /></>,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    logout: <><path {...p} d="M14 4h-7A1.5 1.5 0 0 0 5.5 5.5v13A1.5 1.5 0 0 0 7 20h7" /><path {...p} d="M17 8.5 20.5 12 17 15.5M10 12h10.5" /></>,
    edit: <path {...p} d="M16.5 4.5 19.5 7.5 9 18l-4 1 1-4 10.5-10.5Z" />,
    grid: <><rect {...p} x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect {...p} x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect {...p} x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect {...p} x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></>,
    list: <path {...p} d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    trending: <path {...p} d="M3.5 16.5 9 11l3.5 3.5L20 7M20 7h-4.5M20 7v4.5" />,
    coins: <><ellipse {...p} cx="9" cy="7" rx="5.5" ry="2.8" /><path {...p} d="M3.5 7v4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8V7" /><path {...p} d="M14.5 11.5c2.5.2 4.5 1.3 4.5 2.8 0 1.5-2.5 2.8-5.5 2.8-1 0-2-.1-2.8-.4" /></>,
    doc: <><path {...p} d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" /><path {...p} d="M13.5 3.5v4.5H18M9 13h6M9 16h4" /></>,
    x: <path {...p} d="m6 6 12 12M18 6 6 18" />,
    trash: <><path {...p} d="M4 7h16" /><path {...p} d="M19 7l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" /><path {...p} d="M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1Z" /><path {...p} d="M10 11v6" /><path {...p} d="M14 11v6" /></>,
    gift: <><path {...p} d="M20 12v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9" /><path {...p} d="M2.5 8.5h19v3.5h-19z" /><path {...p} d="M12 8.5V22" /><path {...p} d="M12 8.5S10.8 3 8 3a2.5 2.5 0 0 0 0 5.5Z" /><path {...p} d="M12 8.5S13.2 3 16 3a2.5 2.5 0 0 1 0 5.5Z" /></>,
    sun: <><circle {...p} cx="12" cy="12" r="4.2" /><path {...p} d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" /></>,
    moon: <path {...p} d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
