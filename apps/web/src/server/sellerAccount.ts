import 'server-only';
import { and, count, desc, eq, gt, inArray } from 'drizzle-orm';
import { brands, buyerRequests, offers, reports, sellerReviews } from '@avtoskop/db';
import { db } from './db';

// Open complaints about this seller's offers, so they can give their side.
export async function listSellerReports(sellerId: string) {
  return db
    .select({
      id: reports.id,
      reason: reports.reason,
      comment: reports.comment,
      sellerReply: reports.sellerReply,
      createdAt: reports.createdAt,
      car: offers.car,
      year: offers.year,
      requestBrand: brands.name,
      requestModel: buyerRequests.model,
    })
    .from(reports)
    .innerJoin(offers, eq(reports.offerId, offers.id))
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(and(eq(offers.sellerId, sellerId), eq(reports.status, 'open')))
    .orderBy(desc(reports.createdAt));
}

export async function listSellerReviews(sellerId: string) {
  return db
    .select({
      id: sellerReviews.id,
      rating: sellerReviews.rating,
      comment: sellerReviews.comment,
      sellerReply: sellerReviews.sellerReply,
      createdAt: sellerReviews.createdAt,
    })
    .from(sellerReviews)
    .where(eq(sellerReviews.sellerId, sellerId))
    .orderBy(desc(sellerReviews.createdAt))
    .limit(20);
}

// What happened to the seller's offers in the last 30 days.
export async function sellerStats(sellerId: string) {
  const since = new Date(Date.now() - 30 * 24 * 3_600_000);
  const recent = and(eq(offers.sellerId, sellerId), gt(offers.createdAt, since));
  const [sent] = await db.select({ n: count() }).from(offers).where(recent);
  const [viewed] = await db
    .select({ n: count() })
    .from(offers)
    .where(and(recent, inArray(offers.status, ['shown', 'contact_shared', 'declined'])));
  const [shared] = await db
    .select({ n: count() })
    .from(offers)
    .where(and(recent, eq(offers.status, 'contact_shared')));
  return { sent: sent?.n ?? 0, viewed: viewed?.n ?? 0, shared: shared?.n ?? 0 };
}
