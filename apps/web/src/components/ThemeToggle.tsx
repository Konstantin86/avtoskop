'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { THEME_COOKIE, THEMES, type Theme } from './theme';
import styles from './Header.module.css';

const icons: Record<Theme, React.ReactNode> = {
  system: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  light: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  ),
};

// Cycles device → light → dark. The choice lives in a cookie so the server renders it without a flash.
export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations('header');
  const [theme, setTheme] = useState<Theme>(initial);

  function next() {
    const value = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!;
    setTheme(value);
    const apply = () => {
      if (value === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = value;
    };
    // A soft cross-fade where the browser supports it, instead of a hard flash.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(apply);
    else apply();
    document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      className={styles.theme}
      onClick={next}
      aria-label={t(`theme_${theme}`)}
      title={t(`theme_${theme}`)}
    >
      {icons[theme]}
    </button>
  );
}
