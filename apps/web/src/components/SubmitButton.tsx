'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

// A submit button that shows it's working while its form is being sent.
export function SubmitButton({ className, children }: { className: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending || undefined}>
      {children}
    </button>
  );
}
