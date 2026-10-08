'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PhotoGallery.module.css';

interface Photo {
  full: string;
  thumb: string;
}

interface Props {
  photos: Photo[];
  alt: string;
  labels: { open: string; close: string; prev: string; next: string };
}

const SHOWN_THUMBS = 5;

// The main photo and a row of previews; tapping opens a full-screen view to swipe through.
export function PhotoGallery({ photos, alt, labels }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function open(i: number) {
    setIndex(i);
    dialog.current?.showModal();
    requestAnimationFrame(() => {
      const el = strip.current;
      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'instant' });
    });
  }

  function go(step: number) {
    const el = strip.current;
    if (!el) return;
    const next = Math.min(photos.length - 1, Math.max(0, index + step));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (photos.length === 0) return null;
  const more = photos.length - 1 - SHOWN_THUMBS;

  return (
    <div className={styles.gallery}>
      <button
        type="button"
        className={styles.main}
        onClick={() => open(0)}
        aria-label={labels.open}
      >
        <img src={photos[0]!.full} alt={alt} loading="lazy" />
      </button>
      {photos.length > 1 && (
        <div className={styles.thumbs}>
          {photos.slice(1, SHOWN_THUMBS + 1).map((photo, i) => (
            <button
              key={photo.thumb}
              type="button"
              className={styles.thumb}
              onClick={() => open(i + 1)}
              aria-label={labels.open}
            >
              <img src={photo.thumb} alt="" loading="lazy" />
              {i === SHOWN_THUMBS - 1 && more > 0 && <span className={styles.more}>+{more}</span>}
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialog}
        className={styles.dialog}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div ref={strip} className={styles.strip}>
          {photos.map((photo) => (
            <div key={photo.full} className={styles.slide}>
              <img src={photo.full} alt={alt} loading="lazy" />
            </div>
          ))}
        </div>
        <div className={styles.bar}>
          <span>
            {index + 1} / {photos.length}
          </span>
          <button type="button" onClick={() => dialog.current?.close()} className={styles.close}>
            {labels.close} ✕
          </button>
        </div>
        {index > 0 && (
          <button
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            onClick={() => go(-1)}
            aria-label={labels.prev}
          >
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            className={`${styles.nav} ${styles.next}`}
            onClick={() => go(1)}
            aria-label={labels.next}
          >
            ›
          </button>
        )}
      </dialog>
    </div>
  );
}
