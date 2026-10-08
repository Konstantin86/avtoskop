import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import { PHOTO_LIMITS, photoFileNames } from '@avtoskop/core';
import { buyerRequests, offerPhotos, offers, type Db } from '@avtoskop/db';

const HOUR = 60 * 60 * 1000;

// Same folder as the website: PHOTO_DIR on the server, data/photos in the repo locally.
function photoDir(): string {
  return process.env['PHOTO_DIR'] || resolve(process.cwd(), '../../data/photos');
}

// Removes photos nobody will see again: uploads never sent with an offer, and photos of
// offers on requests closed long ago. Rows go first, then their files.
export async function cleanUpPhotos(db: Db, log: (m: string) => void): Promise<void> {
  const now = Date.now();
  const unattached = await db
    .delete(offerPhotos)
    .where(
      and(
        isNull(offerPhotos.offerId),
        lt(offerPhotos.createdAt, new Date(now - PHOTO_LIMITS.unattachedHours * HOUR)),
      ),
    )
    .returning({ key: offerPhotos.key });

  const oldOffers = db
    .select({ id: offers.id })
    .from(offers)
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .where(
      and(
        eq(buyerRequests.status, 'closed'),
        lt(buyerRequests.closedAt, new Date(now - PHOTO_LIMITS.closedRequestDays * 24 * HOUR)),
      ),
    );
  const closed = await db
    .delete(offerPhotos)
    .where(inArray(offerPhotos.offerId, oldOffers))
    .returning({ key: offerPhotos.key });

  const keys = [...unattached, ...closed].map((p) => p.key);
  await Promise.all(
    keys.flatMap((key) =>
      Object.values(photoFileNames(key)).map((name) => rm(join(photoDir(), name), { force: true })),
    ),
  );
  if (keys.length > 0) log(`Removed ${keys.length} photos`);
}
