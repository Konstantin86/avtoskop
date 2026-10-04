'use client';

import { useEffect, useState } from 'react';
import styles from './CopyLink.module.css';

interface Props {
  path: string;
  copyLabel: string;
  copiedLabel: string;
}

export function CopyLink({ path, copyLabel, copiedLabel }: Props) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + path), [path]);

  return (
    <div className={styles.row}>
      <input
        className={`field ${styles.input}`}
        value={url}
        readOnly
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        className="btn btn-blue"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
