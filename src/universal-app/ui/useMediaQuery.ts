import { useEffect, useState } from "react";

/** باگ قاعدهٔ ریسپانسیو — تشخیص عرض برای گریدهای داشبورد (تک‌ستون تا ۶۴۰px، دو ستون بالاتر). */
export function useMinWidth(px: number): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(`(min-width: ${px}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(`(min-width: ${px}px)`);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [px]);

  return matches;
}
