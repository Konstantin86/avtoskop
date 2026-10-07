'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { BrandOption } from '@/server/brands';
import { BrandLogo } from './BrandLogo';
import styles from './ModelInput.module.css';

interface Props {
  id: string;
  name?: string;
  brands: { popular: BrandOption[]; all: BrandOption[] };
  labels: { placeholder: string; popular: string; all: string; noMatches: string };
  defaultValue?: string | undefined;
  invalid?: boolean;
  onChange?: (brandId: string) => void;
  // Lets the field be emptied, e.g. "all brands" in a filter.
  allowEmpty?: boolean;
}

const MAX_SHOWN = 60;
const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}]/gu, '');

type Row = { kind: 'head'; label: string } | { kind: 'brand'; brand: BrandOption };

// Search-and-pick brand field (ARIA combobox) with brand logos; posts the brand id.
export function BrandPicker({
  id,
  name = 'brandId',
  brands,
  labels,
  defaultValue,
  invalid,
  onChange,
  allowEmpty,
}: Props) {
  const listId = useId();
  const byId = new Map(brands.all.map((b) => [String(b.id), b]));
  const [selected, setSelected] = useState(defaultValue ?? '');
  const [text, setText] = useState(byId.get(defaultValue ?? '')?.name ?? '');
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const rows: Row[] = (() => {
    const q = typing ? key(text) : '';
    if (!q) {
      const popularIds = new Set(brands.popular.map((b) => b.id));
      return [
        { kind: 'head', label: labels.popular },
        ...brands.popular.map((brand) => ({ kind: 'brand' as const, brand })),
        { kind: 'head', label: labels.all },
        ...brands.all
          .filter((b) => !popularIds.has(b.id))
          .map((brand) => ({ kind: 'brand' as const, brand })),
      ];
    }
    // Popular brands first among the matches, so "to" finds Toyota before Tofas.
    const popular = new Set(brands.popular.map((b) => b.id));
    const starts = brands.all
      .filter((b) => key(b.name).startsWith(q))
      .sort((a, b) => Number(popular.has(b.id)) - Number(popular.has(a.id)));
    const contains = brands.all.filter(
      (b) => !key(b.name).startsWith(q) && key(b.name).includes(q),
    );
    return [...starts, ...contains].slice(0, MAX_SHOWN).map((brand) => ({ kind: 'brand', brand }));
  })();
  const options = rows.flatMap((r) => (r.kind === 'brand' ? [r.brand] : []));

  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function choose(brand: BrandOption | null) {
    const value = brand ? String(brand.id) : '';
    setSelected(value);
    setText(brand?.name ?? '');
    setTyping(false);
    setOpen(false);
    setActive(-1);
    if (value !== selected) onChange?.(value);
  }

  function settle() {
    setOpen(false);
    setActive(-1);
    if (!typing) return;
    const exact = brands.all.find((b) => key(b.name) === key(text));
    if (exact) return choose(exact);
    if (allowEmpty && text.trim() === '') return choose(null);
    // Anything else goes back to the brand that was chosen before.
    setText(byId.get(selected)?.name ?? '');
    setTyping(false);
  }

  const current = byId.get(selected);
  let index = -1;

  return (
    <div className={styles.wrap}>
      <div className={styles.withLogo}>
        {current && !typing && (
          <BrandLogo name={current.name} size={26} className={styles.fieldLogo} />
        )}
        <input
          id={id}
          className={`field ${current && !typing ? styles.hasLogo : ''}`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={text}
          placeholder={labels.placeholder}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value);
            setTyping(true);
            setOpen(true);
            setActive(-1);
          }}
          // The field keeps focus after a pick, so a second click must reopen the list itself.
          onClick={() => setOpen(true)}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onBlur={settle}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && open) {
              const pick = options[active] ?? (options.length === 1 ? options[0] : undefined);
              if (pick) {
                e.preventDefault();
                choose(pick);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </div>
      <input type="hidden" name={name} value={selected} />
      {open && (
        <ul id={listId} ref={listRef} role="listbox" className={styles.list}>
          {options.length === 0 && <li className={styles.empty}>{labels.noMatches}</li>}
          {rows.map((row) => {
            if (row.kind === 'head') {
              return (
                <li key={`h-${row.label}`} role="presentation" className={styles.group}>
                  {row.label}
                </li>
              );
            }
            index += 1;
            const i = index;
            return (
              <li
                key={row.brand.id}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                className={`${styles.option} ${styles.brandOption}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(row.brand);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <BrandLogo name={row.brand.name} size={26} />
                {row.brand.name}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
