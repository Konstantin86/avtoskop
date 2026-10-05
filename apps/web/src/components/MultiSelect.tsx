'use client';

import { useState } from 'react';
import styles from './MultiSelect.module.css';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  id: string;
  name: string;
  options: Option[];
  defaultValues: string[];
  placeholder: string;
  emptyLabel: string;
  removeLabel: string;
  max?: number;
}

// A select that adds chips; each chosen value is posted as a hidden input with the same name.
export function MultiSelect({
  id,
  name,
  options,
  defaultValues,
  placeholder,
  emptyLabel,
  removeLabel,
  max = 40,
}: Props) {
  const [selected, setSelected] = useState(defaultValues);
  const labels = new Map(options.map((o) => [o.value, o.label]));

  return (
    <div className={styles.wrap}>
      <div className={styles.chips}>
        {selected.length === 0 && <span className={styles.empty}>{emptyLabel}</span>}
        {selected.map((v) => (
          <span key={v} className={styles.chip}>
            {labels.get(v) ?? v}
            <button
              type="button"
              aria-label={`${removeLabel}: ${labels.get(v) ?? v}`}
              onClick={() => setSelected((s) => s.filter((x) => x !== v))}
            >
              ×
            </button>
            <input type="hidden" name={name} value={v} />
          </span>
        ))}
      </div>
      {selected.length < max && (
        <select
          id={id}
          className="field"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) setSelected((s) => (s.includes(v) ? s : [...s, v]));
          }}
        >
          <option value="">{placeholder}</option>
          {options
            .filter((o) => !selected.includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
