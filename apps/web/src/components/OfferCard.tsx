'use client';

import { createContext, useContext, useOptimistic, type ReactNode } from 'react';

const Declined = createContext<{ declined: boolean; set: (value: boolean) => void }>({
  declined: false,
  set: () => {},
});

interface CardProps {
  declined: boolean;
  className: string;
  declinedClassName: string;
  children: ReactNode;
}

// The offer card on the buyer's page; declining or restoring shows at once, before the server
// confirms, and React rolls it back if the request fails.
export function OfferCard({ declined, className, declinedClassName, children }: CardProps) {
  const [shown, set] = useOptimistic(declined);
  return (
    <Declined.Provider value={{ declined: shown, set }}>
      <article className={`${className} ${shown ? declinedClassName : ''}`}>{children}</article>
    </Declined.Provider>
  );
}

interface ActionsProps {
  fields: Record<string, string>;
  decline: (formData: FormData) => Promise<void>;
  restore: (formData: FormData) => Promise<void>;
  share: ReactNode;
  labels: { decline: string; declined: string; restore: string };
  inlineClassName: string;
  noteClassName: string;
}

export function OfferDeclineActions({
  fields,
  decline,
  restore,
  share,
  labels,
  inlineClassName,
  noteClassName,
}: ActionsProps) {
  const { declined, set } = useContext(Declined);
  const hidden = Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

  if (declined) {
    return (
      <form
        className={inlineClassName}
        action={async (formData) => {
          set(false);
          await restore(formData);
        }}
      >
        <span className={noteClassName}>{labels.declined}</span>
        {hidden}
        <button type="submit" className="btn btn-secondary btn-sm">
          {labels.restore}
        </button>
      </form>
    );
  }
  return (
    <>
      {share}
      <form
        action={async (formData) => {
          set(true);
          await decline(formData);
        }}
      >
        {hidden}
        <button type="submit" className="btn btn-secondary">
          {labels.decline}
        </button>
      </form>
    </>
  );
}
