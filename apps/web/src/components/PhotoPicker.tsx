'use client';

import { useId, useRef } from 'react';
import { PHOTO_LIMITS } from '@avtoskop/core';
import styles from './PhotoPicker.module.css';

export interface PickedPhoto {
  // Uploaded photo id, or a temporary id while the upload runs.
  id: string;
  thumb: string | null;
  progress: number;
  error: string | null;
}

interface Props {
  photos: PickedPhoto[];
  onChange: (update: (photos: PickedPhoto[]) => PickedPhoto[]) => void;
  labels: {
    title: string;
    hint: string;
    add: string;
    main: string;
    makeMain: string;
    remove: string;
    errors: Record<string, string>;
  };
}

// Phones send 5–12 MB photos; shrinking them first makes uploads fast on mobile data.
// Decoding also turns iPhone HEIC into JPEG where the browser can read it.
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

function upload(blob: Blob, onProgress: (p: number) => void) {
  return new Promise<{ id: string; thumb: string } | { error: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/photos');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText) as { id: string; thumb: string } | { error: string });
      } catch {
        resolve({ error: 'failed' });
      }
    };
    xhr.onerror = () => resolve({ error: 'failed' });
    const form = new FormData();
    form.set('photo', blob, 'photo.jpg');
    xhr.send(form);
  });
}

// Temporary ids for photos still uploading. Not crypto.randomUUID: browsers allow it only on
// HTTPS or localhost, and the site may run on plain http on a local network.
let nextTempId = 0;

// Photos upload as soon as they're picked; the form sends only their ids, first one is main.
export function PhotoPicker({ photos, onChange, labels }: Props) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const free = PHOTO_LIMITS.perOffer - photos.length;
  const ready = photos.filter((p) => p.thumb && !p.error);

  async function add(files: FileList) {
    const picked = [...files].slice(0, Math.max(0, free));
    const temp = picked.map((file) => ({ file, id: `tmp-${(nextTempId += 1)}` }));
    onChange((list) => [
      ...list,
      ...temp.map(({ id }) => ({ id, thumb: null, progress: 0, error: null })),
    ]);
    for (const { file, id } of temp) {
      const set = (patch: Partial<PickedPhoto>) =>
        onChange((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      if (file.size > PHOTO_LIMITS.maxUploadBytes * 2) {
        set({ error: labels.errors['tooBig'] ?? '' });
        continue;
      }
      const result = await upload(await shrink(file), (progress) => set({ progress })).catch(
        () => ({ error: 'failed' }) as const,
      );
      if ('error' in result)
        set({ error: labels.errors[result.error] ?? labels.errors['failed'] ?? '' });
      else set({ id: result.id, thumb: result.thumb, progress: 1 });
    }
  }

  return (
    <div className="label">
      <span>{labels.title}</span>
      <input type="hidden" name="photos" value={ready.map((p) => p.id).join(',')} />
      <ul className={styles.grid}>
        {photos.map((photo, i) => (
          <li key={photo.id} className={styles.tile}>
            {photo.thumb ? (
              <img src={photo.thumb} alt="" className={styles.img} />
            ) : photo.error ? (
              <span className={styles.error}>{photo.error}</span>
            ) : (
              <span className={styles.progress}>
                <span style={{ width: `${Math.round(photo.progress * 100)}%` }} />
              </span>
            )}
            {i === 0 && photo.thumb && <span className={styles.main}>{labels.main}</span>}
            {i > 0 && photo.thumb && (
              <button
                type="button"
                className={styles.makeMain}
                onClick={() =>
                  onChange((list) => [photo, ...list.filter((p) => p.id !== photo.id)])
                }
              >
                {labels.makeMain}
              </button>
            )}
            {(photo.thumb || photo.error) && (
              <button
                type="button"
                className={styles.remove}
                aria-label={labels.remove}
                onClick={() => onChange((list) => list.filter((p) => p.id !== photo.id))}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {free > 0 && (
          <li>
            <label htmlFor={inputId} className={styles.add}>
              <span aria-hidden="true">+</span>
              {labels.add}
            </label>
            <input
              ref={input}
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              className={styles.file}
              onChange={(e) => {
                if (e.target.files) void add(e.target.files);
                e.target.value = '';
              }}
            />
          </li>
        )}
      </ul>
      <span className="hint">{labels.hint}</span>
    </div>
  );
}
