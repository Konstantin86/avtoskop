'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { requestConfirmedAction } from '@/app/[locale]/request/actions';

const EVERY_MS = 3000;
const GIVE_UP_MS = 15 * 60 * 1000;

// While the buyer confirms in Telegram, checks every few seconds and refreshes the page once done.
export function ConfirmWatcher({ requestId }: { requestId: string }) {
  const router = useRouter();

  useEffect(() => {
    const started = Date.now();
    let busy = false;
    const timer = setInterval(async () => {
      if (Date.now() - started > GIVE_UP_MS) return clearInterval(timer);
      if (busy || document.hidden) return;
      busy = true;
      try {
        if (await requestConfirmedAction(requestId)) {
          clearInterval(timer);
          router.refresh();
        }
      } finally {
        busy = false;
      }
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [requestId, router]);

  return null;
}
