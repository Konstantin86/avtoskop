'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { pollLoginAction } from './actions';

export function LoginPoller({ returnTo }: { returnTo: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setInterval(async () => {
      const result = await pollLoginAction();
      if (!active) return;
      if (result.status === 'done') {
        clearInterval(timer);
        router.replace({ pathname: '/login', query: { return: result.next || returnTo } });
      } else if (result.status === 'expired') {
        clearInterval(timer);
        setExpired(true);
      }
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [router, returnTo]);

  return (
    <p
      role="status"
      aria-live="polite"
      style={{ fontSize: 15, fontWeight: 600, color: expired ? 'var(--danger)' : 'var(--muted)' }}
    >
      {expired ? t('expired') : t('waiting')}
    </p>
  );
}
