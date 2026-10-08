import styles from './my.module.css';

export interface CompareColumn {
  id: string;
  title: string;
  cells: string[];
}

// The open offers side by side; one column per offer, one row per fact.
export function OfferCompare({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: string[];
  columns: CompareColumn[];
}) {
  return (
    <details className={`card ${styles.compare}`}>
      <summary className={styles.compareSummary}>{title}</summary>
      <div className={styles.compareScroll}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th scope="col" />
              {columns.map((c) => (
                <th key={c.id} scope="col">
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row}>
                <th scope="row">{row}</th>
                {columns.map((c) => (
                  <td key={c.id}>{c.cells[i]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
