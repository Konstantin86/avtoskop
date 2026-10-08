import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { PHOTO_KEY, PHOTO_LIMITS, photoFileNames } from '@avtoskop/core';
import { offerPhotos } from '@avtoskop/db';
import { db } from './db';

// Photos live on local disk for now (a Docker volume on the server). Moving to object
// storage later means replacing the three file functions below.
function photoDir(): string {
  return process.env['PHOTO_DIR'] || resolve(process.cwd(), '../../data/photos');
}

const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'heif']);

export type UploadError = 'notImage' | 'tooBig' | 'tooMany';

// Checks the file by its content, turns it upright, shrinks it and saves WebP copies.
// Re-encoding drops all metadata, including the GPS position phones store in photos.
async function processPhoto(input: Buffer) {
  const image = sharp(input, { failOn: 'error' });
  const meta = await image.metadata().catch(() => null);
  if (!meta?.format || !ACCEPTED.has(meta.format)) return null;
  const variant = (side: number, quality: number) =>
    sharp(input)
      .rotate()
      .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
  try {
    const [full, thumb] = await Promise.all([
      variant(PHOTO_LIMITS.fullSide, 80),
      variant(PHOTO_LIMITS.thumbSide, 70),
    ]);
    return { full, thumb };
  } catch {
    // Formats sharp can name but not decode, such as some iPhone HEIC files.
    return null;
  }
}

export async function uploadPhoto(
  sellerId: string,
  file: Blob,
): Promise<{ id: string; key: string } | { error: UploadError }> {
  if (file.size > PHOTO_LIMITS.maxUploadBytes) return { error: 'tooBig' };
  const [pending] = await db
    .select({ n: count() })
    .from(offerPhotos)
    .where(and(eq(offerPhotos.sellerId, sellerId), isNull(offerPhotos.offerId)));
  if ((pending?.n ?? 0) >= PHOTO_LIMITS.maxPendingPerSeller) return { error: 'tooMany' };

  const processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
  if (!processed) return { error: 'notImage' };
  const key = randomBytes(16).toString('hex');
  const names = photoFileNames(key);
  await mkdir(photoDir(), { recursive: true });
  await writeFile(join(photoDir(), names.full), processed.full.data);
  await writeFile(join(photoDir(), names.thumb), processed.thumb.data);
  const [row] = await db
    .insert(offerPhotos)
    .values({
      sellerId,
      key,
      width: processed.full.info.width,
      height: processed.full.info.height,
    })
    .returning({ id: offerPhotos.id });
  return { id: row!.id, key };
}

// A stored file by its public name (<key>.webp or <key>-s.webp), or null.
export async function readPhotoFile(name: string): Promise<Buffer | null> {
  const match = /^([0-9a-f]{32})(-s)?\.webp$/.exec(name);
  if (!match || !PHOTO_KEY.test(match[1]!)) return null;
  return readFile(join(photoDir(), name)).catch(() => null);
}

export async function deletePhotoFiles(keys: string[]): Promise<void> {
  await Promise.all(
    keys.flatMap((key) =>
      Object.values(photoFileNames(key)).map((name) => rm(join(photoDir(), name), { force: true })),
    ),
  );
}

export interface OfferPhoto {
  id: string;
  key: string;
  width: number;
  height: number;
}

export async function photosForOffers(offerIds: string[]): Promise<Map<string, OfferPhoto[]>> {
  const byOffer = new Map<string, OfferPhoto[]>();
  if (offerIds.length === 0) return byOffer;
  const rows = await db
    .select({
      offerId: offerPhotos.offerId,
      id: offerPhotos.id,
      key: offerPhotos.key,
      width: offerPhotos.width,
      height: offerPhotos.height,
    })
    .from(offerPhotos)
    .where(inArray(offerPhotos.offerId, offerIds))
    .orderBy(asc(offerPhotos.position));
  for (const { offerId, ...photo } of rows) {
    if (!offerId) continue;
    byOffer.set(offerId, [...(byOffer.get(offerId) ?? []), photo]);
  }
  return byOffer;
}

// Attaches the chosen photos to the offer in the given order and removes the ones the
// seller took out. Only the seller's own photos that are free or already on this offer count.
export async function setOfferPhotos(
  sellerId: string,
  offerId: string,
  photoIds: string[],
): Promise<void> {
  const owned = photoIds.length
    ? await db
        .select({ id: offerPhotos.id, offerId: offerPhotos.offerId })
        .from(offerPhotos)
        .where(and(eq(offerPhotos.sellerId, sellerId), inArray(offerPhotos.id, photoIds)))
    : [];
  const allowed = new Set(
    owned.filter((p) => p.offerId === null || p.offerId === offerId).map((p) => p.id),
  );
  const keep = photoIds.filter((id) => allowed.has(id)).slice(0, PHOTO_LIMITS.perOffer);

  const current = await db
    .select({ id: offerPhotos.id, key: offerPhotos.key })
    .from(offerPhotos)
    .where(eq(offerPhotos.offerId, offerId));
  const removed = current.filter((p) => !keep.includes(p.id));
  if (removed.length > 0) {
    await db.delete(offerPhotos).where(
      inArray(
        offerPhotos.id,
        removed.map((p) => p.id),
      ),
    );
    await deletePhotoFiles(removed.map((p) => p.key));
  }
  for (const [position, id] of keep.entries()) {
    await db.update(offerPhotos).set({ offerId, position }).where(eq(offerPhotos.id, id));
  }
}

export function photoUrl(key: string, size: 'full' | 'thumb' = 'full'): string {
  return `/photos/${photoFileNames(key)[size]}`;
}
