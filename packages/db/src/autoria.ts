import { and, eq } from 'drizzle-orm';
import type { Db } from './client.ts';
import { brands, models } from './schema.ts';

// AUTO.RIA's own numbers for a brand and, when we know it, the model (matched by slug).
export async function findAutoriaIds(
  db: Db,
  brandId: number,
  modelSlug: string,
): Promise<{ brand: number; model: number | null } | null> {
  const [brand] = await db
    .select({ id: brands.autoriaId })
    .from(brands)
    .where(eq(brands.id, brandId));
  if (!brand?.id) return null;
  const [model] = await db
    .select({ id: models.autoriaId })
    .from(models)
    .where(and(eq(models.brandId, brandId), eq(models.slug, modelSlug)));
  return { brand: brand.id, model: model?.id ?? null };
}
