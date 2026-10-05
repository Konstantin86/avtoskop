'use client';

import { useEffect, useState } from 'react';
import { canonicalModel } from '@avtoskop/core';

interface Props {
  brandId: string;
  listId?: string;
  defaultValue?: string | undefined;
  placeholder: string;
  invalid?: boolean;
  // Shown under the field when the typed model isn't on the brand's list.
  unknownLabel?: string;
}

// A free-text model field with the brand's known models as suggestions.
export function ModelInput({
  brandId,
  listId = 'model-options',
  defaultValue,
  placeholder,
  invalid,
  unknownLabel,
}: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [unknown, setUnknown] = useState(false);
  const check = (typed: string) =>
    setUnknown(
      typed.trim() !== '' &&
        options.length > 0 &&
        !options.includes(canonicalModel(typed.trim(), options)),
    );

  useEffect(() => {
    setUnknown(false);
    if (!brandId) return setOptions([]);
    let cancelled = false;
    fetch(`/api/models?brandId=${encodeURIComponent(brandId)}`)
      .then((res) => (res.ok ? (res.json() as Promise<string[]>) : []))
      .then((names) => !cancelled && setOptions(names))
      .catch(() => !cancelled && setOptions([]));
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  return (
    <>
      <input
        name="model"
        className="field"
        list={listId}
        autoComplete="off"
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={60}
        aria-invalid={invalid || unknown || undefined}
        onBlur={(e) => check(e.target.value)}
        onChange={(e) => unknown && check(e.target.value)}
      />
      {unknown && !invalid && unknownLabel && <span className="error-text">{unknownLabel}</span>}
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}
