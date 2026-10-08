import 'server-only';
import { and, eq, gt, ne } from 'drizzle-orm';
import { requestMatchesSeller, type AlertRequest } from '@avtoskop/core';
import { sellers, users } from '@avtoskop/db';
import { db } from './db';

// How many sellers would get this request in Telegram, the same rule the bot uses.
export async function countReachableSellers(request: AlertRequest): Promise<number> {
  const rows = await db
    .select({
      type: sellers.type,
      status: sellers.status,
      alerts: sellers.alerts,
      brandIds: sellers.brandIds,
      serviceRegions: sellers.serviceRegions,
    })
    .from(sellers)
    .innerJoin(users, eq(sellers.userId, users.id))
    .where(and(eq(sellers.alerts, true), ne(sellers.status, 'banned'), gt(users.telegramId, 0)));
  return rows.filter((s) => requestMatchesSeller(request, s)).length;
}
