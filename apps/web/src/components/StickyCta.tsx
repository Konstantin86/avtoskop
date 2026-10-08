'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './StickyCta.module.css';

interface Props {
  href: string;
  label: string;
  // The page's own main button; the bar appears only while it and the footer are out of view.
  watchId: string;
}

// The page's main action pinned to the bottom of phone screens. It steps aside at the end of
// the page so it never covers the footer links.
export function StickyCta({ href, label, watchId }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = [document.getElementById(watchId), document.querySelector('footer')].filter(
      (el): el is HTMLElement => el !== null,
    );
    const inView = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target);
        else inView.delete(e.target);
      }
      setVisible(inView.size === 0);
    });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div className={`${styles.bar} ${visible ? styles.shown : ''}`} aria-hidden={!visible}>
      <Link href={href} className="btn btn-yellow btn-block" tabIndex={visible ? 0 : -1}>
        {label}
      </Link>
    </div>
  );
}
