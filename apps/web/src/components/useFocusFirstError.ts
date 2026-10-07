'use client';

import { useEffect, type RefObject } from 'react';

// After a failed submit, brings the first problem into view and puts the cursor there,
// so on a long form on a phone the person doesn't have to hunt for it.
export function useFocusFirstError(
  form: RefObject<HTMLFormElement | null>,
  state: unknown,
  failed: boolean,
) {
  useEffect(() => {
    if (!failed || !form.current) return;
    const invalid = form.current.querySelector<HTMLElement>('[aria-invalid="true"]');
    const target = invalid ?? form.current.querySelector<HTMLElement>('[role="alert"]');
    if (!target) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    const focusable = target.matches('input, select, textarea, button')
      ? target
      : target.querySelector<HTMLElement>('input, select, textarea');
    focusable?.focus({ preventScroll: true });
    // Runs once per server response; the state object changes on every submit.
  }, [state, failed, form]);
}
