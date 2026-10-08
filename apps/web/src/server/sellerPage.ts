import 'server-only';
import { and, desc, eq, ne } from 'drizzle-orm';
import { sellerReviews, sellers } from '@avtoskop/db';
import { db } from './db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A seller's profile and reviews for buyers; banned sellers have no page.
export async function getSellerPage(id: string) {
  if (!UUID.test(id)) return null;
  const [seller] = await db
    .select({
      id: sellers.id,
      name: sellers.name,
      type: sellers.type,
      region: sellers.region,
      countries: sellers.countries,
      about: sellers.about,
      status: sellers.status,
      createdAt: sellers.createdAt,
    })
    .from(sellers)
    .where(and(eq(sellers.id, id), ne(sellers.status, 'banned')));
  if (!seller) return null;
  const reviews = await db
    .select({
      rating: sellerReviews.rating,
      comment: sellerReviews.comment,
      sellerReply: sellerReviews.sellerReply,
      createdAt: sellerReviews.createdAt,
    })
    .from(sellerReviews)
    .where(eq(sellerReviews.sellerId, id))
    .orderBy(desc(sellerReviews.createdAt))
    .limit(50);
  return { seller, reviews };
}
