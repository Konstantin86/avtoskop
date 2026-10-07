import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

// A grey placeholder block shown while a page's content is on its way.
export function Skeleton({
  w = '100%',
  h = 16,
  r = 8,
  style,
}: {
  w?: number | string;
  h?: number;
  r?: number;
  style?: CSSProperties;
}) {
  return (
    <span className={styles.block} style={{ width: w, height: h, borderRadius: r, ...style }} />
  );
}

export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return <div className={`card ${styles.card}`}>{children}</div>;
}

// The shared page frame: title, lead line and the content below.
export function SkeletonPage({
  children,
  narrow,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className={`container ${styles.page}`} aria-busy="true" aria-live="polite">
      <div className={narrow ? styles.narrow : undefined}>
        <Skeleton w="55%" h={40} r={10} />
        <Skeleton w="80%" h={16} style={{ marginTop: 14 }} />
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
