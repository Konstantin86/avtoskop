'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { canonicalModel } from '@avtoskop/core';
import styles from './ModelInput.module.css';

interface Props {
  brandId: string;
  defaultValue?: string | undefined;
  placeholder: string;
  invalid?: boolean;
  // Shown under the field when the typed model isn't on the brand's list.
  unknownLabel?: string;
  noMatchesLabel: string;
}

const MAX_SHOWN = 60;
const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Models that start with the query come first, then the ones that contain it.
function filterModels(options: string[], query: string): string[] {
  const q = key(query);
  if (!q) return options.slice(0, MAX_SHOWN);
  const starts = options.filter((o) => key(o).startsWith(q));
  const contains = options.filter((o) => !key(o).startsWith(q) && key(o).includes(q));
  return [...starts, ...contains].slice(0, MAX_SHOWN);
}

// Search-and-pick model field (ARIA combobox). For brands with a known model list the buyer
// picks from it; for other brands it is a plain text field.
export function ModelInput({
  brandId,
  defaultValue,
  placeholder,
  invalid,
  unknownLabel,
  noMatchesLabel,
}: Props) {
  const listId = useId();
  const [options, setOptions] = useState<string[]>([]);
  const [text, setText] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [unknown, setUnknown] = useState(false);
  const loadedBrand = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setUnknown(false);
    if (!brandId) return setOptions([]);
    let cancelled = false;
    fetch(`/api/models?brandId=${encodeURIComponent(brandId)}`)
      .then((res) => (res.ok ? (res.json() as Promise<string[]>) : []))
      .then((names) => {
        if (cancelled) return;
        // After the buyer switches brand, a model from the old brand no longer fits.
        if (loadedBrand.current !== null && loadedBrand.current !== brandId) {
          setText((t) => (names.length > 0 && !names.includes(canonicalModel(t, names)) ? '' : t));
        }
        loadedBrand.current = brandId;
        setOptions(names);
      })
      .catch(() => !cancelled && setOptions([]));
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const strict = options.length > 0;
  const shown = strict ? filterModels(options, text) : [];
  const expanded = open && strict;

  useEffect(() => {
    if (active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function choose(name: string) {
    setText(name);
    setUnknown(false);
    setOpen(false);
    setActive(-1);
  }

  function settle() {
    setOpen(false);
    setActive(-1);
    const typed = text.trim();
    if (!strict || typed === '') return setUnknown(false);
    const canonical = canonicalModel(typed, options);
    if (options.includes(canonical)) {
      setText(canonical);
      setUnknown(false);
    } else {
      setUnknown(true);
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        name="model"
        className="field"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        maxLength={60}
        aria-invalid={invalid || unknown || undefined}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
          setUnknown(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={settle}
        onKeyDown={(e) => {
          if (!strict) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, shown.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && expanded) {
            // Enter picks the highlighted model instead of sending the form.
            const pick = shown[active] ?? (shown.length === 1 ? shown[0] : undefined);
            if (pick) {
              e.preventDefault();
              choose(pick);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {expanded && (
        <ul id={listId} ref={listRef} role="listbox" className={styles.list}>
          {shown.length === 0 && <li className={styles.empty}>{noMatchesLabel}</li>}
          {shown.map((name, i) => (
            <li
              key={name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={styles.option}
              // mousedown runs before the input's blur, so the click isn't lost.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(name);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
      {unknown && !invalid && unknownLabel && <span className="error-text">{unknownLabel}</span>}
    </div>
  );
}
