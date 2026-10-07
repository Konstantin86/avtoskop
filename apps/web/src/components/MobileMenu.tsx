'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

interface Props {
  label: string;
  icon: ReactNode;
  className?: string | undefined;
  panelClassName?: string | undefined;
  children: ReactNode;
}

// The header stays mounted between pages, so the open menu must be closed by hand.
export function MobileMenu({ label, icon, className, panelClassName, children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className={className}>
      <summary aria-label={label}>{icon}</summary>
      <nav
        className={panelClassName}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a') && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </nav>
    </details>
  );
}
