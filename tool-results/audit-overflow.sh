#!/bin/bash
# باگ responsive-overflow — ممیزی سرریز افقی در عرض‌های ۳۲۰ تا ۱۴۴۰
BASE=http://localhost:3421
PAGES=("/" "/search" "/teachers" "/blog" "/dispatch" "/app" "/panel/user" "/panel/teacher" "/panel/admin")
WIDTHS=(320 375 480 768 1024 1440)

for W in "${WIDTHS[@]}"; do
  agent-browser set viewport "$W" 900 >/dev/null 2>&1
  for P in "${PAGES[@]}"; do
    agent-browser open "$BASE$P" >/dev/null 2>&1
    sleep 1.2
    RESULT=$(agent-browser eval "
(() => {
  const doc = document.documentElement;
  const over = doc.scrollWidth - window.innerWidth;
  if (over <= 1) return 'OK';
  const seen = new Set();
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 4 && (r.right > window.innerWidth + 2 || r.left < -2)) {
      const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '';
      const key = el.tagName.toLowerCase() + cls;
      seen.add(key + '=' + Math.round(r.width) + 'w@' + Math.round(r.right) + 'r');
    }
  });
  return 'OVER' + over + 'px :: ' + Array.from(seen).slice(0, 6).join(', ');
})()" 2>/dev/null)
    echo "$W $P -> $RESULT"
  done
done
