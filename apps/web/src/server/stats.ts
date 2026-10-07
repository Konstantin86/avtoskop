import 'server-only';
import { count, desc, gte, sql, sum } from 'drizzle-orm';
import { buyerRequests, offers, pageViews, sellers } from '@avtoskop/db';
import { db } from './db';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

async function countWhere(query: Promise<Array<{ n: number }>>) {
  return (await query)[0]?.n ?? 0;
}

// The launch-test funnel for a period: visits, requests, confirmations, offers, shared numbers.
export async function funnel(days: number) {
  const since = daysAgo(days);
  const sinceDay = since.toISOString().slice(0, 10);
  const [views, requests, confirmed, offersSent, shared, newSellers] = await Promise.all([
    db
      .select({ n: sum(pageViews.views).mapWith(Number) })
      .from(pageViews)
      .where(gte(pageViews.day, sinceDay))
      .then((r) => r[0]?.n ?? 0),
    countWhere(
      db.select({ n: count() }).from(buyerRequests).where(gte(buyerRequests.createdAt, since)),
    ),
    countWhere(
      db.select({ n: count() }).from(buyerRequests).where(gte(buyerRequests.confirmedAt, since)),
    ),
    countWhere(db.select({ n: count() }).from(offers).where(gte(offers.createdAt, since))),
    countWhere(db.select({ n: count() }).from(offers).where(gte(offers.contactSharedAt, since))),
    countWhere(db.select({ n: count() }).from(sellers).where(gte(sellers.createdAt, since))),
  ]);
  return { views, requests, confirmed, offersSent, shared, newSellers };
}

export async function topViews(days: number, by: 'source' | 'page', limit = 6) {
  const column = by === 'source' ? pageViews.source : pageViews.page;
  return db
    .select({ name: column, views: sum(pageViews.views).mapWith(Number) })
    .from(pageViews)
    .where(gte(pageViews.day, daysAgo(days).toISOString().slice(0, 10)))
    .groupBy(column)
    .orderBy(desc(sql`sum(${pageViews.views})`))
    .limit(limit);
}

// Public activity numbers for the home and seller pages.
export async function liveNumbers() {
  const week = daysAgo(7);
  const [requestsWeek, offersWeek] = await Promise.all([
    countWhere(
      db.select({ n: count() }).from(buyerRequests).where(gte(buyerRequests.confirmedAt, week)),
    ),
    countWhere(db.select({ n: count() }).from(offers).where(gte(offers.createdAt, week))),
  ]);
  return { requestsWeek, offersWeek };
}
