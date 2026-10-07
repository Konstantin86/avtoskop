import styles from './Faq.module.css';

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

// Questions as expandable rows; each has an id so other pages can link to an answer.
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <details key={item.id} id={item.id} className={styles.item}>
          <summary className={styles.q}>{item.q}</summary>
          <p className={styles.a}>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
