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
      .vodda-input:focus,
      .vodda-textarea:focus {
        border-color: #728350 !important;
      }
      .vodda-input::placeholder,
      .vodda-textarea::placeholder {
        color: #aba593;
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
      .vodda-bottom-nav a {
        transition: color 150ms ease, background 150ms ease, transform 150ms ease;
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
      .vodda-dialog {
        animation: vodda-dialog-in 170ms ease-out;
      }
      .vodda-sheet {
        animation: vodda-sheet-in 190ms ease-out;
      }
      /* فراخوان — live broadcast animations */
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
        .vodda-dispatch-radar {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}
