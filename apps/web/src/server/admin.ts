import 'server-only';
import { count, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { makeMatchesBrand, vinMismatches } from '@avtoskop/core';
import { buyerRequests, brands, offers, reports, sellers, users } from '@avtoskop/db';
import { getCurrentUser } from './auth';
import { db } from './db';
import { wantedByVin } from './vin';

// Admins are listed by Telegram ID in ADMIN_TELEGRAM_IDS (comma-separated).
export async function getAdmin() {
  const user = await getCurrentUser();
  const ids = (process.env['ADMIN_TELEGRAM_IDS'] ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return user && ids.includes(user.telegramId) ? user : null;
}

export async function listSellersForAdmin() {
  return (
    db
      .select({
        id: sellers.id,
        name: sellers.name,
        type: sellers.type,
        region: sellers.region,
        about: sellers.about,
        status: sellers.status,
        createdAt: sellers.createdAt,
        telegramUsername: users.telegramUsername,
        offerCount: count(offers.id),
        reportCount: sql<number>`count(${reports.id})`.mapWith(Number),
      })
      .from(sellers)
      .innerJoin(users, eq(sellers.userId, users.id))
      .leftJoin(offers, eq(offers.sellerId, sellers.id))
      .leftJoin(reports, eq(reports.offerId, offers.id))
      .groupBy(sellers.id, users.telegramUsername)
      // Sellers waiting for review first, then the newest.
      .orderBy(sql`${sellers.status} = 'pending' desc`, desc(sellers.createdAt))
  );
}

export async function listOpenReports() {
  return db
    .select({
      id: reports.id,
      reason: reports.reason,
      comment: reports.comment,
      createdAt: reports.createdAt,
      sellerId: sellers.id,
      sellerName: sellers.name,
      car: offers.car,
      priceUsd: offers.priceUsd,
      description: offers.description,
      requestBrand: brands.name,
      requestModel: buyerRequests.model,
    })
    .from(reports)
    .innerJoin(offers, eq(reports.offerId, offers.id))
    .innerJoin(sellers, eq(offers.sellerId, sellers.id))
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(reports.status, 'open'))
    .orderBy(desc(reports.createdAt));
}

export type VinFlag = 'wanted' | 'otherBrand' | 'mismatch';

// Offers whose VIN is on the wanted list or doesn't fit the offer or the requested brand.
export async function listVinFlags() {
  const rows = await db
    .select({
      offerId: offers.id,
      vin: offers.vin,
      vinDecoded: offers.vinDecoded,
      car: offers.car,
      year: offers.year,
      priceUsd: offers.priceUsd,
      updatedAt: offers.updatedAt,
      sellerId: sellers.id,
      sellerName: sellers.name,
      sellerStatus: sellers.status,
      requestBrand: brands.name,
      requestModel: buyerRequests.model,
    })
    .from(offers)
    .innerJoin(sellers, eq(offers.sellerId, sellers.id))
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(isNotNull(offers.vin))
    .orderBy(desc(offers.updatedAt));
  const wanted = await wantedByVin(rows.flatMap((r) => (r.vin ? [r.vin] : [])));
  return rows.flatMap((r) => {
    const flags: VinFlag[] = [];
    if (r.vin && wanted.has(r.vin)) flags.push('wanted');
    if (r.vinDecoded && !makeMatchesBrand(r.vinDecoded.make, r.requestBrand))
      flags.push('otherBrand');
    if (r.vinDecoded && vinMismatches(r, r.vinDecoded).length > 0) flags.push('mismatch');
    return flags.length > 0 ? [{ ...r, flags }] : [];
  });
}
