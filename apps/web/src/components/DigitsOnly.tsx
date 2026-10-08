'use client';

import { useEffect } from 'react';

// Every field marked inputMode="numeric" on the site holds a whole number (years, prices,
// mileage, weeks), so anything that isn't a digit is dropped as it's typed or pasted.
// One listener covers all forms, including ones rendered on the server.
export function DigitsOnly() {
  useEffect(() => {
    function onInput(e: Event) {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.inputMode !== 'numeric') return;
      const digits = el.value.replace(/\D/g, '');
      if (digits === el.value) return;
      const cursor = Math.max(
        0,
        (el.selectionStart ?? digits.length) - (el.value.length - digits.length),
      );
      el.value = digits;
      el.setSelectionRange(cursor, cursor);
    }
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, []);
  return null;
}
