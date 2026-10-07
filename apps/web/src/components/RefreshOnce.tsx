'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The header stays mounted across client navigation, so a page that changes what the header
// shows (e.g. the new-offer badge) asks for one fresh render after it loads.
export function RefreshOnce() {
  const router = useRouter();
  useEffect(() => router.refresh(), [router]);
  return null;
}
