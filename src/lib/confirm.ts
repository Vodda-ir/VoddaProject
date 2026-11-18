/**
 * confirmDialog — جایگزین مطمئن window.confirm برای پنل‌ها.
 *
 * مرورگرها (به‌ویژه Chrome اندروید و WebView اپ) پس از چند تأیید پشت‌سرهم
 * دیالوگ‌های window.confirm را بی‌صدا رد می‌کنند و دکمه‌های «تأیید/رد» پنل
 * عملاً از کار می‌افتند. این نسخه یک دیالوگ درون‌صفحهٔ Promise-محور می‌سازد
 * که در همهٔ محیط‌ها — مرورگر دسکتاپ، موبایل و WebView — همیشه نمایش داده
 * می‌شود و نتیجهٔ واقعی کاربر را برمی‌گرداند.
 */

let activeDialog: HTMLElement | null = null;

export function confirmDialog(message: string, options: { confirmLabel?: string; cancelLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  const { confirmLabel = 'تأیید', cancelLabel = 'انصراف', danger = false } = options;

  return new Promise((resolve) => {
    // اگر دیالوگ دیگری باز است، همان لحظه رد می‌شود تا صف بسته نشود.
    if (activeDialog) {
      cleanup(false);
    }

    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };

    function cleanup(result: boolean) {
      finish(result);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (activeDialog === overlay) activeDialog = null;
    }

    const overlay = document.createElement('div');
    activeDialog = overlay;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'display:grid', 'place-items:center', 'padding:20px',
      'background:rgba(24,28,17,.46)', 'backdrop-filter:blur(2px)',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(400px,100%)', 'padding:22px 22px 18px',
      'border:1px solid #e4dcc6', 'border-radius:18px',
      'background:#fff', 'box-shadow:0 24px 60px rgba(31,38,22,.25)',
      'font-family:inherit', 'text-align:right', 'direction:rtl',
    ].join(';');

    const icon = document.createElement('div');
    icon.textContent = danger ? '⚠️' : '❔';
    icon.style.cssText = 'font-size:22px;line-height:1;margin-bottom:10px';

    const text = document.createElement('p');
    text.textContent = message;
    text.style.cssText = [
      'margin:0 0 18px', 'font-size:14px', 'font-weight:700',
      'line-height:2', 'color:#2a2f22', 'white-space:pre-line',
    ].join(';');

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:9px;justify-content:flex-start';

    const no = document.createElement('button');
    no.type = 'button';
    no.textContent = cancelLabel;
    no.style.cssText = [
      'min-height:42px', 'padding:0 18px', 'border-radius:12px',
      'border:1px solid #ddd5c0', 'background:#f7f5ee',
      'color:#4c513f', 'font-size:13.5px', 'font-weight:800',
      'font-family:inherit', 'cursor:pointer',
    ].join(';');
    no.onclick = () => cleanup(false);

    const yes = document.createElement('button');
    yes.type = 'button';
    yes.textContent = confirmLabel;
    yes.style.cssText = [
      'min-height:42px', 'padding:0 22px', 'border-radius:12px', 'border:0',
      'background:' + (danger ? '#b3403a' : '#5e6e43'),
      'color:#fff', 'font-size:13.5px', 'font-weight:800',
      'font-family:inherit', 'cursor:pointer',
    ].join(';');
    yes.onclick = () => cleanup(true);

    row.appendChild(no);
    row.appendChild(yes);
    card.appendChild(icon);
    card.appendChild(text);
    card.appendChild(row);
    overlay.appendChild(card);

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        cleanup(false);
      } else if (event.key === 'Enter') {
        event.stopPropagation();
        cleanup(true);
      }
    }
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) cleanup(false);
    });

    document.body.appendChild(overlay);
    yes.focus();
  });
}
