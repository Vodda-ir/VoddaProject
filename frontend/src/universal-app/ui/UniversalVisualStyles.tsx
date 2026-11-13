export function UniversalVisualStyles() {
  return (
    <style>{`
      @font-face {
        font-family: "IRANYekanXFaNum";
        src: url("/fonts/IRANYekanXFaNum-Regular.ttf") format("truetype");
        font-style: normal;
        font-weight: 400;
        font-display: swap;
      }
      @font-face {
        font-family: "IRANYekanXFaNum";
        src: url("/fonts/IRANYekanXFaNum-Medium.ttf") format("truetype");
        font-style: normal;
        font-weight: 500;
        font-display: swap;
      }
      @font-face {
        font-family: "IRANYekanXFaNum";
        src: url("/fonts/IRANYekanXFaNum-DemiBold.ttf") format("truetype");
        font-style: normal;
        font-weight: 600;
        font-display: swap;
      }
      @font-face {
        font-family: "IRANYekanXFaNum";
        src: url("/fonts/IRANYekanXFaNum-Bold.ttf") format("truetype");
        font-style: normal;
        font-weight: 700;
        font-display: swap;
      }
      @font-face {
        font-family: "IRANYekanXFaNum";
        src: url("/fonts/IRANYekanXFaNum-ExtraBold.ttf") format("truetype");
        font-style: normal;
        font-weight: 800;
        font-display: swap;
      }
      @font-face {
        font-family: "IRANYekanXFaNum";
        src: url("/fonts/IRANYekanXFaNum-ExtraBold.ttf") format("truetype");
        font-style: normal;
        font-weight: 900;
        font-display: swap;
      }
      /* فونت نمایشی نستعلیق (گلزار) — فقط برای تیترهای سطح صفحه و لحظه‌های برند */
      @font-face {
        font-family: "VoddaDisplay";
        src: url("/fonts/VoddaDisplay-Gulzar.woff2") format("woff2");
        font-style: normal;
        font-weight: 400;
        font-display: swap;
      }
      /* فونت قرآنی نسخ (امیری) — برای آیات و متون عربی */
      @font-face {
        font-family: "VoddaQuran";
        src: url("/fonts/VoddaQuran-Amiri-Regular.woff2") format("woff2");
        font-style: normal;
        font-weight: 400;
        font-display: swap;
      }
      @font-face {
        font-family: "VoddaQuran";
        src: url("/fonts/VoddaQuran-Amiri-Bold.woff2") format("woff2");
        font-style: normal;
        font-weight: 700;
        font-display: swap;
      }
      /* کلاس نمایشی: نستعلیق با ارتفاع خط مناسب قلم‌های دست‌نویس */
      .vodda-display {
        font-family: "VoddaDisplay", "IRANYekanXFaNum", system-ui, sans-serif;
        font-weight: 400;
        line-height: 1.95;
        letter-spacing: 0;
      }
      /* کلاس قرآنی: نسخ امیری برای آیات با اعراب کامل */
      .vodda-quran {
        font-family: "VoddaQuran", "IRANYekanXFaNum", system-ui, sans-serif;
        line-height: 2.1;
        font-weight: 400;
      }
      [data-universal-app="vodda"],
      [data-app-shell] {
        font-family: "IRANYekanXFaNum", system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      [data-universal-app="vodda"] button,
      [data-universal-app="vodda"] input,
      [data-universal-app="vodda"] textarea,
      [data-universal-app="vodda"] select,
      [data-universal-app="vodda"] option,
      [data-app-shell] button,
      [data-app-shell] input,
      [data-app-shell] textarea,
      [data-app-shell] select,
      [data-app-shell] option {
        font-family: inherit !important;
      }
      [data-universal-app="vodda"] *,
      [data-app-shell] * {
        box-sizing: border-box;
      }
      [data-universal-app="vodda"] button,
      [data-universal-app="vodda"] a,
      [data-app-shell] button,
      [data-app-shell] a {
        -webkit-tap-highlight-color: transparent;
      }
      /* Lock single-column screen grids to the container width. Without this a
         nowrap title inside a card can push the implicit grid track past the
         viewport and horizontally break narrow screens. */
      .vodda-screen {
        grid-template-columns: minmax(0, 1fr);
      }
      .vodda-screen > * {
        max-width: 100%;
      }
      .vodda-button:not(:disabled):hover {
        filter: brightness(.985);
      }
      /* بازخورد فشار روی دکمه‌ها — حس لمس فیزیکی (فاز جان‌بخشی) */
      .vodda-button:not(:disabled):active {
        transform: scale(.97);
        filter: brightness(.965);
      }
      .vodda-button:not(:disabled) {
        transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease, opacity 150ms ease, filter 150ms ease;
      }
      /* کارت‌های تعاملی روی نشانگرِ دسکتاپ کمی بلند می‌شوند و سایه‌شان عمیق‌تر می‌شود */
      .vodda-card--interactive:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 6px rgba(46,54,34,.05), 0 16px 32px rgba(46,54,34,.11) !important;
      }
      .vodda-card--interactive {
        transition: transform 180ms ease, box-shadow 180ms ease;
      }
      .vodda-input:focus,
      .vodda-textarea:focus {
        border-color: #728350 !important;
      }
      .vodda-input::placeholder,
      .vodda-textarea::placeholder {
        color: #7a7463;
      }
      .vodda-card {
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .vodda-scroll-rail {
        scrollbar-width: none;
        overscroll-behavior-inline: contain;
      }
      .vodda-scroll-rail::-webkit-scrollbar {
        display: none;
      }
      .vodda-bottom-nav {
        transform: translateZ(0);
      }
      /* هالهٔ نرم زیر پیل تب فعال — مسیر کاربر همیشه روشن است (فاز نور) */
      .vodda-bottom-nav a[aria-current="page"] > span {
        box-shadow: 0 6px 16px rgba(76, 90, 54, .30);
      }
      /* هالهٔ طلایی تنفّسی دور دکمهٔ مرکزی فراخوان */
      .vodda-nav-cta-orb {
        position: relative;
      }
      .vodda-nav-cta-orb::before {
        content: "";
        position: absolute;
        inset: -7px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(191, 149, 64, .28) 0%, rgba(191, 149, 64, 0) 68%);
        animation: vodda-cta-halo 3.2s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes vodda-cta-halo {
        0%, 100% { opacity: .55; transform: scale(.96); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      .vodda-bottom-nav a {
        transition: color 150ms ease, background 150ms ease, transform 150ms ease;
      }
      .vodda-nav-cta-orb {
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }
      .vodda-bottom-nav a:active .vodda-nav-cta-orb {
        transform: scale(0.92);
      }
      .vodda-spinner {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid currentColor;
        border-inline-end-color: transparent;
        animation: vodda-spin .72s linear infinite;
      }
      .vodda-loader-orbit {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 3px solid #e8ecdb;
        border-top-color: #5e6e43;
        animation: vodda-spin .75s linear infinite;
      }
      .vodda-overlay {
        animation: vodda-fade-in 140ms ease-out;
      }
      .vodda-skeleton {
        position: relative;
        overflow: hidden;
        background: #eceadf;
        border-radius: 10px;
      }
      .vodda-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
        animation: vodda-shimmer 1.4s ease infinite;
      }
      @keyframes vodda-shimmer {
        to { transform: translateX(100%); }
      }
      .vodda-live-dot {
        position: relative;
      }
      .vodda-live-dot::after {
        content: "";
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0;
        animation: vodda-pulse 2s ease-out infinite;
      }
      @keyframes vodda-pulse {
        0% { transform: scale(.55); opacity: .5; }
        70% { transform: scale(1.45); opacity: 0; }
        100% { transform: scale(1.45); opacity: 0; }
      }
      /* فراخوان — live broadcast animations */
      .vodda-neon {
        border: 1.5px solid rgba(114, 131, 80, 0.55) !important;
        box-shadow:
          0 0 0 1px rgba(114, 131, 80, 0.12),
          0 0 18px rgba(114, 131, 80, 0.18),
          inset 0 0 22px rgba(114, 131, 80, 0.05) !important;
        animation: vodda-neon-olive 3.4s ease-in-out infinite;
      }
      .vodda-neon-gold {
        border: 1.5px solid rgba(191, 149, 64, 0.6) !important;
        box-shadow:
          0 0 0 1px rgba(191, 149, 64, 0.14),
          0 0 20px rgba(191, 149, 64, 0.2),
          inset 0 0 22px rgba(191, 149, 64, 0.06) !important;
        animation: vodda-neon-gold 3.4s ease-in-out infinite;
      }
      @keyframes vodda-neon-olive {
        0%, 100% { box-shadow: 0 0 0 1px rgba(114, 131, 80, 0.12), 0 0 14px rgba(114, 131, 80, 0.14), inset 0 0 18px rgba(114, 131, 80, 0.04) !important; }
        50% { box-shadow: 0 0 0 1px rgba(114, 131, 80, 0.18), 0 0 24px rgba(114, 131, 80, 0.24), inset 0 0 26px rgba(114, 131, 80, 0.07) !important; }
      }
      @keyframes vodda-neon-gold {
        0%, 100% { box-shadow: 0 0 0 1px rgba(191, 149, 64, 0.14), 0 0 16px rgba(191, 149, 64, 0.16), inset 0 0 18px rgba(191, 149, 64, 0.05) !important; }
        50% { box-shadow: 0 0 0 1px rgba(191, 149, 64, 0.2), 0 0 26px rgba(191, 149, 64, 0.26), inset 0 0 26px rgba(191, 149, 64, 0.08) !important; }
      }
      .vodda-dispatch-pulse {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        position: relative;
      }
      .vodda-dispatch-pulse::after {
        content: "";
        position: absolute;
        inset: -7px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.45);
        animation: vodda-pulse 1.8s ease-out infinite;
      }
      .vodda-dispatch-radar {
        animation: vodda-radar 2.1s ease-out infinite;
      }
      @keyframes vodda-radar {
        0% { box-shadow: 0 0 0 0 rgba(94, 110, 67, 0.32); }
        70% { box-shadow: 0 0 0 18px rgba(94, 110, 67, 0); }
        100% { box-shadow: 0 0 0 0 rgba(94, 110, 67, 0); }
      }
      @keyframes vodda-live-dot {
        0% { box-shadow: 0 0 0 0 rgba(94, 110, 67, 0.45); }
        70% { box-shadow: 0 0 0 7px rgba(94, 110, 67, 0); }
        100% { box-shadow: 0 0 0 0 rgba(94, 110, 67, 0); }
      }
      .vodda-dialog {
        animation: vodda-dialog-in 170ms ease-out;
      }
      .vodda-sheet {
        animation: vodda-sheet-in 190ms ease-out;
      }
      /* ── ورود نرم کارت‌ها و بخش‌ها (A7/C1) ── */
      .vodda-enter {
        animation: vodda-enter 340ms cubic-bezier(.2,.7,.3,1) both;
      }
      .vodda-enter-delay-1 { animation-delay: 60ms; }
      .vodda-enter-delay-2 { animation-delay: 120ms; }
      .vodda-enter-delay-3 { animation-delay: 180ms; }
      @keyframes vodda-enter {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: none; }
      }
      /* بازخورد فشار همهٔ عناصر تعاملی */
      .vodda-tappable {
        transition: transform 140ms ease, opacity 140ms ease;
      }
      .vodda-tappable:active {
        transform: scale(0.97);
      }
      /* گسترش ناحیهٔ لمسی عناصر کوچک تا ۴۴px بدون تغییر ظاهر (A6) */
      .vodda-hit {
        position: relative;
      }
      .vodda-hit::after {
        content: "";
        position: absolute;
        inset: -9px;
      }
      /* محو لبهٔ نوارهای اسکرول افقی در RTL (B7) */
      .vodda-fade-edge {
        -webkit-mask-image: linear-gradient(to left, black calc(100% - 26px), transparent);
        mask-image: linear-gradient(to left, black calc(100% - 26px), transparent);
      }
      /* ── Toast موفقیت (C2) ── */
      .vodda-toast {
        position: fixed;
        right: 50%;
        bottom: calc(96px + env(safe-area-inset-bottom));
        transform: translateX(50%);
        z-index: 200;
        max-width: min(92vw, 520px);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
        border-radius: 999px;
        color: #ffffff;
        background: linear-gradient(145deg, #3c472b, #4c5a36);
        box-shadow: 0 14px 34px rgba(42, 40, 32, 0.28);
        font-size: 13.5px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        animation: vodda-toast-in 220ms ease-out both;
        pointer-events: none;
      }
      @keyframes vodda-toast-in {
        from { opacity: 0; transform: translateX(50%) translateY(14px); }
        to { opacity: 1; transform: translateX(50%) translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .vodda-toast { animation: none; opacity: 1; }
        .vodda-nav-cta-orb::before { animation: none; opacity: .7; }
      }
      @keyframes vodda-spin { to { transform: rotate(360deg); } }
      @keyframes vodda-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vodda-dialog-in {
        from { opacity: 0; transform: translateY(8px) scale(.985); }
        to { opacity: 1; transform: none; }
      }
      @keyframes vodda-sheet-in {
        from { transform: translateY(24px); opacity: .5; }
        to { transform: none; opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .vodda-button,
        .vodda-card,
        .vodda-enter,
        .vodda-dialog,
        .vodda-sheet,
        .vodda-overlay,
        .vodda-spinner,
        .vodda-loader-orbit,
        .vodda-skeleton::after,
        .vodda-live-dot::after,
        .vodda-dispatch-pulse::after,
        .vodda-dispatch-radar,
        .vodda-neon,
        .vodda-neon-gold,
        .vodda-nav-cta-orb::before {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}
