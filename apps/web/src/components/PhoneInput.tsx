'use client';

import { useState } from 'react';
import { formatUaNational, uaNationalDigits } from '@avtoskop/core';
import styles from './PhoneInput.module.css';

interface Props {
  defaultValue?: string | undefined;
  invalid?: boolean;
}

// Ukrainian mobile number with a fixed +380; a leading 0 or a pasted country code is dropped.
// The field posts the 9 digits; normalizeUaPhone on the server adds +380.
export function PhoneInput({ defaultValue, invalid }: Props) {
  const [digits, setDigits] = useState(uaNationalDigits(defaultValue ?? ''));

  return (
    <div className={`field ${styles.wrap}`} aria-invalid={invalid || undefined}>
      <span className={styles.prefix} aria-hidden="true">
        +380
      </span>
      <input
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        className={styles.input}
        value={formatUaNational(digits)}
        placeholder="50 123 45 67"
        onChange={(e) => setDigits(uaNationalDigits(e.target.value))}
      />
    </div>
  );
}
