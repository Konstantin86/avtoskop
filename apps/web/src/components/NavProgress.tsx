'use client';

import { useEffect, useRef, useState } from 'react';
// The full path including the language prefix, so a language switch also completes the bar.
import { usePathname } from 'next/navigation';
import styles from './NavProgress.module.css';

// A thin bar at the top that starts on click, so a slow page change never feels frozen.
export function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const link = (e.target as HTMLElement).closest('a');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      // Same page with other query parameters: too quick and too frequent to need a bar.
      if (url.pathname === location.pathname) return;
      setWidth(12);
      if (timer.current) clearInterval(timer.current);
      // Creeps towards 90% while waiting; the new page completes it.
      timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w)), 200);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setWidth((w) => (w > 0 ? 100 : 0));
    const reset = setTimeout(() => setWidth(0), 250);
    return () => clearTimeout(reset);
  }, [pathname]);

  return (
    <div
      className={styles.bar}
      style={{ width: `${width}%`, opacity: width > 0 && width < 100 ? 1 : 0 }}
      aria-hidden="true"
    />
  );
}
