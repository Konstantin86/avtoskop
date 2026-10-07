'use client';

import { useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './ShareNumberButton.module.css';

interface Labels {
  open: string;
  title: string;
  text: string;
  safety: string;
  confirm: string;
  cancel: string;
}

interface Props {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  labels: Labels;
}

function ConfirmSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-yellow" disabled={pending}>
      {label}
    </button>
  );
}

// Sharing the number can't be undone, so it asks first in a calm panel instead of a browser pop-up.
export function ShareNumberButton({ action, fields, labels }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button type="button" className="btn btn-yellow" onClick={() => dialog.current?.showModal()}>
        {labels.open}
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(e) => {
          // A click on the dimmed backdrop lands on the dialog itself and closes it.
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <form action={action} className={styles.panel}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className={styles.title}>
            {labels.title}
          </h2>
          <p className={styles.text}>{labels.text}</p>
          <p className={styles.safety}>{labels.safety}</p>
          <div className={styles.buttons}>
            <ConfirmSubmit label={labels.confirm} />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => dialog.current?.close()}
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
