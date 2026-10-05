import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { models } from '@avtoskop/db';
import { db } from './db';

export async function modelNames(brandId: number): Promise<string[]> {
  const rows = await db
    .select({ name: models.name })
    .from(models)
    .where(eq(models.brandId, brandId))
    .orderBy(asc(models.name));
  return rows.map((r) => r.name);
}
