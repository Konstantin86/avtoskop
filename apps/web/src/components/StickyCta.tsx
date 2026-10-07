'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './StickyCta.module.css';

interface Props {
  href: string;
  label: string;
  // The page's own main button; the bar appears only while it is out of view.
  watchId: string;
}

// The page's main action pinned to the bottom of phone screens.
export function StickyCta({ href, label, watchId }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return setVisible(true);
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <>
      {/* Keeps the end of the page clear of the bar on phones. */}
      <div className={styles.spacer} />
      <div className={`${styles.bar} ${visible ? styles.shown : ''}`} aria-hidden={!visible}>
        <Link href={href} className="btn btn-yellow btn-block" tabIndex={visible ? 0 : -1}>
          {label}
        </Link>
      </div>
    </>
  );
}
