'use client';

import { Link, usePathname } from '@/i18n/navigation';

interface Props {
  locale: 'uk' | 'en';
  label: string;
  ariaLabel: string;
  className?: string | undefined;
}

// Switches language on the same page instead of going back to the home page.
export function LocaleSwitch({ locale, label, ariaLabel, className }: Props) {
  const pathname = usePathname();
  return (
    <Link href={pathname} locale={locale} className={className} aria-label={ariaLabel}>
      {label}
    </Link>
  );
}
