import 'server-only';
import { avg, count, eq, inArray } from 'drizzle-orm';
import { sellerReviews } from '@avtoskop/db';
import { db } from './db';

export interface SellerRating {
  average: number;
  count: number;
}

// Average rating and number of reviews for each seller that has any.
export async function sellerRatings(sellerIds: string[]): Promise<Map<string, SellerRating>> {
  const out = new Map<string, SellerRating>();
  if (sellerIds.length === 0) return out;
  const rows = await db
    .select({
      sellerId: sellerReviews.sellerId,
      average: avg(sellerReviews.rating).mapWith(Number),
      count: count(),
    })
    .from(sellerReviews)
    .where(inArray(sellerReviews.sellerId, [...new Set(sellerIds)]))
    .groupBy(sellerReviews.sellerId);
  for (const r of rows) out.set(r.sellerId, { average: r.average, count: r.count });
  return out;
}

export async function hasReview(requestId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: sellerReviews.id })
    .from(sellerReviews)
    .where(eq(sellerReviews.requestId, requestId));
  return Boolean(row);
}
