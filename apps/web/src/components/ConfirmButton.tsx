'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

interface Props {
  confirm: string;
  className?: string;
  children: ReactNode;
}

export function ConfirmButton({ confirm, className, children }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
