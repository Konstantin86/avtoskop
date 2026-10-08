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
        onClick={async (e) => {
          // navigator.clipboard exists only on HTTPS or localhost; plain http falls back to
          // copying the selected text of the field.
          const ok = await navigator.clipboard?.writeText(url).then(
            () => true,
            () => false,
          );
          if (!ok) {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement | null;
            input?.select();
            if (!document.execCommand('copy')) return;
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
