export function UniversalVisualStyles() {
  return (
    <style>{`
      /* ── توکن‌های رنگ (روشن) — منبع حقیقت theme.ts به آن‌ها ارجاع می‌دهد ── */
      :root {
        color-scheme: light;
        --v-sand50: #faf8f2;
        --v-sand100: #f4f0e7;
        --v-sand150: #ede8db;
        --v-sand200: #e4ddcc;
        --v-line: #e4ddcc;
        --v-border: #e4ddcc;
        --v-surface: #ffffff;
        --v-surfaceWarm: #fcfaf4;
        --v-surfaceSoft: #f8f6ef;
        --v-surfaceElevated: #ffffff;
        --v-olive950: #252c1c;
        --v-olive900: #2e3622;
        --v-olive800: #3c472b;
        --v-olive700: #4c5a36;
        --v-olive600: #5e6e43;
        --v-olive500: #728350;
        --v-olive400: #93a172;
        --v-olive300: #b6c09b;
        --v-olive200: #d6dcc4;
        --v-olive100: #e8ecdb;
        --v-olive50: #f2f5ea;
        --v-ink: #2a2820;
        --v-inkSecondary: #565247;
        --v-inkMuted: #6f6a5b;
        --v-inkFaint: #7a7463;
        --v-gold: #bf9540;
        --v-goldDark: #8b681f;
        --v-goldSoft: #e7d5a8;
        --v-goldBackground: #f7efd9;
        --v-clay: #b0745a;
        --v-clayBackground: #f6e7df;
        --v-danger: #a65151;
        --v-dangerBackground: #faeeee;
        --v-success: #5e6e43;
        --v-successBackground: #edf2e5;
        --v-info: #5e7e8c;
        --v-infoBackground: #edf3f5;
        --v-grad-hero: linear-gradient(145deg, #4c5a36 0%, #5e6e43 52%, #728350 100%);
        --v-grad-deep: linear-gradient(145deg, #2e3622 0%, #3c472b 58%, #4c5a36 100%);
        --v-grad-oliveCard: linear-gradient(150deg, #4c5a36 0%, #5e6e43 55%, #6e7f4d 100%);
        --v-grad-soft: linear-gradient(145deg, #f2f5ea 0%, #ffffff 72%);
        --v-grad-gold: linear-gradient(145deg, #f7efd9 0%, #fffaf0 100%);
        --v-grad-goldRich: linear-gradient(145deg, #d4ab52 0%, #bf9540 52%, #8b681f 100%);
        --v-veil-strong: rgba(255,255,255,.75);
      }
      /* ── حالت تاریک — همان زبان بصری زیتونی/طلایی روی زمینهٔ ذغالی گرم ── */
      [data-vodda-theme="dark"] {
        color-scheme: dark;
        --v-sand50: #14170f;
        --v-sand100: #1a1e15;
        --v-sand150: #21261b;
        --v-sand200: #2b3122;
        --v-line: #2b3122;
        --v-border: #2b3122;
        --v-surface: #1d2118;
        --v-surfaceWarm: #20251b;
        --v-surfaceSoft: #181c13;
        --v-surfaceElevated: #242a1e;
        --v-olive950: #0e1209;
        --v-olive900: #171c10;
        --v-olive800: #2e3820;
        --v-olive700: #a4b485;
        --v-olive600: #7c8f58;
        --v-olive500: #8a9c66;
        --v-olive400: #93a172;
        --v-olive300: #5a6644;
        --v-olive200: #3a4229;
        --v-olive100: #2c3420;
        --v-olive50: #262d1b;
        --v-ink: #eceada;
        --v-inkSecondary: #cbc7b8;
        --v-inkMuted: #a5a191;
        --v-inkFaint: #8b8778;
        --v-gold: #d2aa55;
        --v-goldDark: #e3c377;
        --v-goldSoft: #6b5c33;
        --v-goldBackground: #2a2416;
        --v-clay: #c98d72;
        --v-clayBackground: #322520;
        --v-danger: #e09a9a;
        --v-dangerBackground: #332220;
        --v-success: #a4b485;
        --v-successBackground: #242c18;
        --v-info: #93b3bf;
        --v-infoBackground: #1a2528;
        --v-grad-hero: linear-gradient(145deg, #4c5a36 0%, #5e6e43 52%, #728350 100%);
        --v-grad-deep: linear-gradient(145deg, #1a2012 0%, #232b17 58%, #2e3820 100%);
        --v-grad-oliveCard: linear-gradient(150deg, #4c5a36 0%, #5e6e43 55%, #6e7f4d 100%);
        --v-grad-soft: linear-gradient(145deg, #1d2118 0%, #23281c 72%);
        --v-grad-gold: linear-gradient(145deg, #2b2517 0%, #1f1c12 100%);
        --v-grad-goldRich: linear-gradient(145deg, #d4ab52 0%, #bf9540 52%, #8b681f 100%);
        --v-veil-strong: rgba(24,28,19,.78);
        /* متن روی سطوح سبز ثابت — در هر دو حالت روشن می‌ماند تا متن سیاه روی کادر سبز رخ ندهد */
        --v-onOlive: #fffaf0;
        --v-onGold: #221a08;
        /* متن طلایی روی پنل‌های کِرِم — در تاریک روشن می‌شود (خوانایی کامل) */
        --v-goldInk: #ecd9a8;
        --v-goldInkSoft: #c9ab5e;
        --v-goldAccent: #8a7434;
        --v-goldSurface: #2b2517;
        --v-goldPanelEnd: #221e13;
        /* پالت سبز فرم خدمات — تیره و آرام در حالت تاریک */
        --v-greenInk: #9cc4aa;
        --v-greenDeep: #7ba88c;
        --v-greenBorder: #2e4a3a;
        --v-greenChip: #1d2e24;
        --v-greenBackground: #16211a;
        /* پنل‌های طلایی/کِرِم — تیره تا کادرها خیره‌کننده نشوند */
        --v-grad-goldPanel: linear-gradient(150deg, #2b2517 0%, #221e13 70%);
        --v-grad-goldRow: linear-gradient(145deg, #2e2715 0%, #241f10 100%);
        --v-grad-cream: linear-gradient(150deg, #2b2517 0%, #221e13 75%);
        --v-grad-oliveBtn: linear-gradient(145deg, #7c8f58 0%, #5e6e43 100%);
        --v-grad-cardSheen: linear-gradient(180deg, #1d2118 0%, #20251b 100%);
        /* تصویرسازی‌های خطی — ستون‌های اصلی در تاریک روشن می‌شوند */
        --v-ill-ink: #a4b485;
        --v-ill-inkSoft: rgba(164,180,133,.45);
        --v-ill-gold: #d2aa55;
        --v-ill-goldSoft: #6b5c33;
        --v-ill-cream: #2b3122;
        --v-ill-paper: #242a1e;
      }
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
      /* کلاس نمایشی: نسخ امیری پررنگ — تیترهای سطح صفحه و لحظه‌های برند؛
         خوانا و رسمی، هم‌خانواده با متن آیات */
      .vodda-display {
        font-family: "VoddaQuran", "IRANYekanXFaNum", system-ui, sans-serif;
        font-weight: 700;
        line-height: 1.7;
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
        color: var(--v-inkFaint, #7a7463);
      }
      /* اسکلت لودینگ و لودر مداری — در حالت تاریک از زمینهٔ صفحه سیاه‌تر نشوند */
      [data-vodda-theme="dark"] .vodda-skeleton {
        background: #262d1b;
      }
      [data-vodda-theme="dark"] .vodda-skeleton::after {
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
      }
      [data-vodda-theme="dark"] .vodda-loader-orbit {
        border-color: #2c3420;
        border-top-color: #a4b485;
      }
      .vodda-card {
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .vodda-scroll-rail {
        scrollbar-width: none;
        overscroll-behavior-inline: contain;
        /* ریل افقی هرگز نباید عرض والدِ گرید را بیشتر از صفحه کند —
           min-content ریل چیپ‌ها بلند است و بدون این، صفحه در موبایل
           به‌صورت افقی بیرون می‌زند (باگ «همه‌چی به‌هم می‌ریزد»). */
        min-width: 0;
        max-width: 100%;
      }
      .vodda-scroll-rail::-webkit-scrollbar {
        display: none;
      }
      /* فرزندان کارت در گرید اجازهٔ جمع‌شدن داشته باشند تا محتوای پهن،
         کارت را عریض‌تر از صفحه نکند. */
      .vodda-card > * {
        min-width: 0;
      }
      /* کانتئنر صفحه هرگز اسکرول افقی نمی‌گیرد؛ سرریز احتمالی بریده می‌شود */
      .vodda-screen {
        min-width: 0;
        max-width: 100%;
        overflow-x: clip;
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
        border: 3px solid var(--v-olive100, #e8ecdb);
        border-top-color: var(--v-olive600, #5e6e43);
        animation: vodda-spin .75s linear infinite;
      }
      .vodda-overlay {
        animation: vodda-fade-in 140ms ease-out;
      }
      .vodda-skeleton {
        position: relative;
        overflow: hidden;
        background: var(--v-sand150, #ede8db);
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
      /* اعلان بالا-صفحه: متن کامل تا سه خط، بدون بریدگی */
      .vodda-toast {
        position: fixed;
        top: calc(12px + env(safe-area-inset-top));
        right: 50%;
        transform: translateX(50%);
        z-index: 220;
        width: max-content;
        max-width: min(92vw, 520px);
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 12px 17px;
        border-radius: 18px;
        color: #ffffff;
        background: linear-gradient(145deg, #3c472b, #4c5a36);
        border: 1px solid rgba(231, 213, 168, 0.28);
        box-shadow: 0 14px 34px rgba(42, 40, 32, 0.30), 0 2px 6px rgba(42, 40, 32, 0.14);
        font-size: 13.5px;
        font-weight: 700;
        overflow: hidden;
        animation: vodda-toast-in 300ms cubic-bezier(.2,.9,.3,1.1) both;
        pointer-events: none;
      }
      .vodda-toast svg { flex: 0 0 auto; margin-top: 2px; }
      .vodda-toast .vodda-toast-text {
        flex: 1 1 auto;
        min-width: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.9;
        overflow-wrap: anywhere;
      }
      @keyframes vodda-toast-in {
        from { opacity: 0; transform: translateX(50%) translateY(-14px) scale(.97); }
        to { opacity: 1; transform: translateX(50%) translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .vodda-toast { animation: none; opacity: 1; }
        .vodda-nav-cta-orb::before { animation: none; opacity: .7; }
      }
      /* نوار اعلان فراخوان برای اساتید — طلایی/زیتونی با زنگ لرزان */
      .vodda-call-alert {
        position: fixed;
        top: calc(10px + env(safe-area-inset-top));
        right: 50%;
        transform: translateX(50%);
        z-index: 230;
        width: min(92vw, 520px);
      }
      .vodda-call-alert-card {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 13px 16px;
        border-radius: 20px;
        color: #ffffff;
        text-align: right;
        cursor: pointer;
        position: relative;
        font-family: inherit;
        background: linear-gradient(140deg, #37422a 0%, #4c5a36 58%, #56653e 100%);
        border: 1px solid rgba(212, 175, 96, 0.5);
        box-shadow: 0 18px 40px rgba(42, 40, 32, 0.34), 0 0 0 1px rgba(42, 40, 32, 0.05), 0 4px 12px rgba(139, 104, 31, 0.18);
        animation: vodda-call-alert-in 460ms cubic-bezier(.18,.89,.28,1.14) both;
      }
      .vodda-call-alert-card:focus-visible {
        outline: 2px solid #e7d5a8;
        outline-offset: 2px;
      }
      @keyframes vodda-call-alert-in {
        from { opacity: 0; transform: translateY(-20px) scale(.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .vodda-call-alert-bell {
        animation: vodda-bell-shake 2.6s ease-in-out infinite;
        transform-origin: 50% 12%;
      }
      @keyframes vodda-bell-shake {
        0%, 82%, 100% { transform: rotate(0deg); }
        86% { transform: rotate(13deg); }
        90% { transform: rotate(-11deg); }
        94% { transform: rotate(7deg); }
        98% { transform: rotate(-4deg); }
      }
      .vodda-call-alert-halo {
        animation: vodda-call-halo 2.2s ease-in-out infinite;
      }
      @keyframes vodda-call-halo {
        0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 96, 0.45); }
        55% { box-shadow: 0 0 0 9px rgba(212, 175, 96, 0); }
      }
      .vodda-call-alert-close {
        position: absolute;
        insetInlineStart: 8px;
        top: 8px;
        width: 26px;
        height: 26px;
        display: grid;
        placeItems: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.85);
        cursor: pointer;
      }
      .vodda-call-alert-close:hover { background: rgba(255, 255, 255, 0.22); }
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
        .vodda-nav-cta-orb::before,
        .vodda-call-alert,
        .vodda-call-alert-bell,
        .vodda-call-alert-halo {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}
