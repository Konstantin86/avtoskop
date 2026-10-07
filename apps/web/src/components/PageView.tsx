'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

// Counts a page view without cookies; browsers that ask not to be tracked are skipped.
export function PageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      navigator.doNotTrack === '1' ||
      (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl
    ) {
      return;
    }
    let ref = '';
    try {
      const host = document.referrer ? new URL(document.referrer).host : '';
      ref = host && host !== location.host ? host : '';
    } catch {
      ref = '';
    }
    const body = JSON.stringify({
      path: location.pathname,
      ref,
      utm: new URLSearchParams(location.search).get('utm_source') ?? '',
    });
    navigator.sendBeacon?.('/api/hit', new Blob([body], { type: 'application/json' }));
  }, [pathname]);

  return null;
}
