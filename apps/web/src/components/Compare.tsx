import type { ReactNode } from 'react';
import { CheckIcon } from './icons';
import styles from './Compare.module.css';

interface Props {
  title: string;
  lead: string;
  before: string;
  after: string;
  rows: Array<{ before: string; after: string }>;
  children?: ReactNode;
}

// "The usual way" vs "With Avtoskop": one pain and our answer per row.
export function Compare({ title, lead, before, after, rows, children }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.lead}>{lead}</p>
      </div>
      <div className={styles.table} role="table" aria-label={title}>
        <div className={styles.headerRow} role="row">
          <span role="columnheader" className={styles.beforeHead}>
            {before}
          </span>
          <span role="columnheader" className={styles.afterHead}>
            {after}
          </span>
        </div>
        {rows.map((row) => (
          <div key={row.after} className={styles.row} role="row">
            <span role="cell" className={styles.before}>
              <span className={styles.cross} aria-hidden="true">
                ✕
              </span>
              {row.before}
            </span>
            <span role="cell" className={styles.after}>
              <span className={styles.tick} aria-hidden="true">
                <CheckIcon size={14} />
              </span>
              {row.after}
            </span>
          </div>
        ))}
      </div>
      {children}
    </section>
  );
}
