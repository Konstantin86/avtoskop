import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { brands, listings, listingSnapshots, models, type Db } from '@avtoskop/db';
import type { AutoriaClient, Params } from './client.ts';
import {
  listAllIds,
  mileageThousandKmDimension,
  partitionEnum,
  partitionRange,
  priceUsdDimension,
  yearDimension,
  PAGE_SIZE,
  type Band,
  type SearchFn,
} from './partition.ts';
import { infoResponse, namedValueList, sanitizeDetails, searchResponse } from './schemas.ts';
import type { TrackedModel } from './tracked-models.ts';

const SOURCE = 'autoria';
const DAY = 24 * 60 * 60 * 1000;
const TTL = {
  reference: 30 * DAY,
  partition: 20 * 60 * 60 * 1000,
  recent: 30 * 60 * 1000,
  details: 3 * DAY,
};

export const DIMENSIONS = ['year', 'price', 'mileage', 'fuel', 'gearbox', 'region'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createCollector(client: AutoriaClient, db: Db, log: (m: string) => void) {
  const searchFor =
    (ttlMs: number): SearchFn =>
    async (filter, page) => {
      const body = await client.get(
        '/auto/search',
        { ...filter, page, countpage: PAGE_SIZE },
        ttlMs,
      );
      return searchResponse.parse(body).result.search_result;
    };

  function baseFilter(m: TrackedModel): Params {
    return { category_id: 1, 'marka_id[0]': m.brandAutoriaId, 'model_id[0]': m.modelAutoriaId };
  }

  async function referenceCodes(endpoint: string): Promise<number[]> {
    const list = namedValueList.parse(await client.get(endpoint, {}, TTL.reference));
    return list.map((x) => x.value);
  }

  async function ensureModel(m: TrackedModel): Promise<number> {
    const [brand] = await db
      .insert(brands)
      .values({ name: m.brand, slug: slugify(m.brand), autoriaId: m.brandAutoriaId })
      .onConflictDoUpdate({ target: brands.autoriaId, set: { name: m.brand } })
      .returning({ id: brands.id });
    const [model] = await db
      .insert(models)
      .values({
        brandId: brand!.id,
        name: m.model,
        slug: slugify(m.model),
        autoriaId: m.modelAutoriaId,
      })
      .onConflictDoUpdate({ target: models.autoriaId, set: { name: m.model } })
      .returning({ id: models.id });
    return model!.id;
  }

  async function upsertSeen(modelId: number, ids: string[], seenAt: Date): Promise<void> {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await db
        .insert(listings)
        .values(
          chunk.map((id) => ({
            source: SOURCE,
            sourceId: id,
            modelId,
            url: `https://auto.ria.com/uk/auto___${id}.html`,
            firstSeenAt: seenAt,
            lastSeenAt: seenAt,
          })),
        )
        .onConflictDoUpdate({
          target: [listings.source, listings.sourceId],
          set: { lastSeenAt: seenAt, isActive: true },
        });
    }
  }

  async function applyBands(
    modelId: number,
    bands: Map<string, Band>,
    kind: 'price' | 'mileage',
  ): Promise<number> {
    const existing = await db
      .select({
        id: listings.id,
        sourceId: listings.sourceId,
        priceUsdMin: listings.priceUsdMin,
        priceUsdMax: listings.priceUsdMax,
        mileageKmMin: listings.mileageKmMin,
        mileageKmMax: listings.mileageKmMax,
      })
      .from(listings)
      .where(and(eq(listings.source, SOURCE), eq(listings.modelId, modelId)));

    let changed = 0;
    for (const row of existing) {
      const band = bands.get(row.sourceId);
      if (!band) continue;
      const min = kind === 'price' ? band.lo : band.lo * 1000;
      const max = kind === 'price' ? band.hi : band.hi * 1000;
      const oldMin = kind === 'price' ? row.priceUsdMin : row.mileageKmMin;
      const oldMax = kind === 'price' ? row.priceUsdMax : row.mileageKmMax;
      if (oldMin === min && oldMax === max) continue;

      const set =
        kind === 'price'
          ? { priceUsdMin: min, priceUsdMax: max }
          : { mileageKmMin: min, mileageKmMax: max };
      await db.update(listings).set(set).where(eq(listings.id, row.id));
      if (oldMin !== null) {
        await db.insert(listingSnapshots).values({ listingId: row.id, ...set });
      }
      changed++;
    }
    return changed;
  }

  async function applyCodes(
    modelId: number,
    codes: Map<string, number>,
    column: 'year' | 'fuelCode' | 'gearboxCode' | 'regionCode',
  ): Promise<void> {
    const byCode = new Map<number, string[]>();
    for (const [id, code] of codes) byCode.set(code, [...(byCode.get(code) ?? []), id]);
    for (const [code, ids] of byCode) {
      await db
        .update(listings)
        .set({ [column]: code })
        .where(
          and(
            eq(listings.source, SOURCE),
            eq(listings.modelId, modelId),
            inArray(listings.sourceId, ids),
          ),
        );
    }
  }

  // The year pass sees every listing of the model, so it also decides which are still active.
  async function runYear(m: TrackedModel, modelId: number): Promise<void> {
    const bands = await partitionRange(searchFor(TTL.partition), baseFilter(m), yearDimension);
    const seenAt = new Date();
    const ids = [...bands.keys()];
    await upsertSeen(modelId, ids, seenAt);
    await applyCodes(modelId, new Map([...bands].map(([id, b]) => [id, b.lo])), 'year');
    if (ids.length > 0) {
      const gone = await db
        .update(listings)
        .set({ isActive: false })
        .where(
          and(
            eq(listings.source, SOURCE),
            eq(listings.modelId, modelId),
            eq(listings.isActive, true),
            notInArray(listings.sourceId, ids),
          ),
        )
        .returning({ id: listings.id });
      log(`year: ${ids.length} active, ${gone.length} marked inactive`);
    }
  }

  async function partition(m: TrackedModel, dims: readonly Dimension[]): Promise<void> {
    const modelId = await ensureModel(m);
    const search = searchFor(TTL.partition);
    const base = baseFilter(m);
    for (const dim of dims) {
      const before = await client.requestsSince(0);
      if (dim === 'year') {
        await runYear(m, modelId);
      } else if (dim === 'price') {
        const changed = await applyBands(
          modelId,
          await partitionRange(search, base, priceUsdDimension),
          'price',
        );
        log(`price: ${changed} listings got a new band`);
      } else if (dim === 'mileage') {
        const bands = await partitionRange(search, base, mileageThousandKmDimension);
        log(`mileage: ${await applyBands(modelId, bands, 'mileage')} listings got a new band`);
      } else {
        const [endpoint, param, column] = {
          fuel: ['/auto/type', 'type[0]', 'fuelCode'],
          gearbox: ['/auto/categories/1/gearboxes', 'gearbox[0]', 'gearboxCode'],
          region: ['/auto/states', 'state[0]', 'regionCode'],
        }[dim] as [string, string, 'fuelCode' | 'gearboxCode' | 'regionCode'];
        const codes = await partitionEnum(search, base, await referenceCodes(endpoint), (v) => ({
          [param]: v,
        }));
        await applyCodes(modelId, codes, column);
        log(`${dim}: ${codes.size} listings tagged`);
      }
      log(`${dim}: ${(await client.requestsSince(0)) - before} new requests`);
    }
  }

  async function recent(m: TrackedModel): Promise<string[]> {
    const modelId = await ensureModel(m);
    const ids = await listAllIds(searchFor(TTL.recent), { ...baseFilter(m), top: 2 });
    await upsertSeen(modelId, ids, new Date());
    return ids;
  }

  async function details(sourceId: string): Promise<void> {
    const raw = await client.get('/auto/info', { auto_id: sourceId }, TTL.details);
    const info = infoResponse.parse(raw);
    const row = {
      ...(info.USD !== undefined && { priceUsd: info.USD }),
      ...(info.VIN && { vin: info.VIN }),
      ...(info.linkToView && { url: `https://auto.ria.com/uk${info.linkToView}` }),
      ...(info.autoData.year !== undefined && { year: info.autoData.year }),
      ...(info.autoData.raceInt !== undefined && { mileageKm: info.autoData.raceInt * 1000 }),
      ...(info.autoData.fuelId !== undefined && { fuelCode: info.autoData.fuelId }),
      ...(info.autoData.gearBoxId !== undefined && { gearboxCode: info.autoData.gearBoxId }),
      ...(info.stateData?.stateId !== undefined && { regionCode: info.stateData.stateId }),
      details: sanitizeDetails(raw as Record<string, unknown>),
      detailsFetchedAt: new Date(),
    };
    const updated = await db
      .update(listings)
      .set(row)
      .where(and(eq(listings.source, SOURCE), eq(listings.sourceId, sourceId)))
      .returning({ id: listings.id });
    if (updated.length === 0) throw new Error(`Listing ${sourceId} is not in the database yet`);
  }

  async function summary(m: TrackedModel) {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${listings.isActive})::int`,
        withYear: sql<number>`count(${listings.year})::int`,
        withPrice: sql<number>`count(${listings.priceUsdMin})::int`,
        withMileage: sql<number>`count(${listings.mileageKmMin})::int`,
        withFuel: sql<number>`count(${listings.fuelCode})::int`,
        withGearbox: sql<number>`count(${listings.gearboxCode})::int`,
        withRegion: sql<number>`count(${listings.regionCode})::int`,
        withDetails: sql<number>`count(${listings.detailsFetchedAt})::int`,
      })
      .from(listings)
      .innerJoin(models, eq(listings.modelId, models.id))
      .where(eq(models.autoriaId, m.modelAutoriaId));
    return row;
  }

  return { partition, recent, details, summary };
}
