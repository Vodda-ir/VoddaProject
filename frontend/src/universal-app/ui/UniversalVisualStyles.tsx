export function UniversalVisualStyles() {
  return (
    <style>{`
      [data-universal-app="vodda"],
      [data-app-shell] {
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
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
      .vodda-button:not(:disabled):active,
      .vodda-tappable:active {
        transform: scale(.975);
      }
      .vodda-button:not(:disabled):hover {
        filter: brightness(.985);
      }
      .vodda-button--primary:not(:disabled):hover {
        box-shadow: 0 8px 22px rgba(76,90,54,.2);
      }
      .vodda-input:focus,
      .vodda-textarea:focus {
        border-color: #728350 !important;
        box-shadow: 0 0 0 3px rgba(114,131,80,.12) !important;
      }
      .vodda-input::placeholder,
      .vodda-textarea::placeholder {
        color: #aba593;
      }
      .vodda-card {
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      button.vodda-card:hover,
      a.vodda-card:hover,
      .vodda-card--interactive:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 28px rgba(46,54,34,.08) !important;
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
      .vodda-bottom-nav a:active {
        transform: scale(.94);
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
      .vodda-dialog {
        animation: vodda-dialog-in 170ms ease-out;
      }
      .vodda-sheet {
        animation: vodda-sheet-in 190ms ease-out;
      }
      .vodda-enter {
        animation: vodda-rise-in 220ms ease-out both;
      }
      .vodda-enter-delay-1 { animation-delay: 35ms; }
      .vodda-enter-delay-2 { animation-delay: 70ms; }
      .vodda-enter-delay-3 { animation-delay: 105ms; }
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
      @keyframes vodda-rise-in {
        from { opacity: 0; transform: translateY(7px); }
        to { opacity: 1; transform: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .vodda-button,
        .vodda-card,
        .vodda-enter,
        .vodda-dialog,
        .vodda-sheet,
        .vodda-overlay,
        .vodda-spinner,
        .vodda-loader-orbit {
          animation: none !important;
          transition: none !important;
        }
      }
      @media (min-width: 760px) {
        [data-app-shell] [data-vodda-frame] {
          min-height: calc(100dvh - 32px);
          margin-block: 16px;
          border-radius: 34px;
          overflow: clip;
        }
      }
    `}</style>
  );
}
