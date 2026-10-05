import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { normalizeVin, vinProblem } from '@avtoskop/core';
import { dataSnapshots, wantedVehicles, type Db } from '@avtoskop/db';

// MVS open data: vehicles wanted after illegal seizure (data.gov.ua, CC BY).
export const WANTED_URL =
  'https://data.gov.ua/dataset/9b0e87e0-eaa3-4f14-9547-03d61b70abb6/resource/e43a82da-89e1-4bbb-820c-bd04ab7a0c89/download/carswanted.json';
const SOURCE = 'mvs_wanted';
const BATCH = 2000;

const record = z.object({
  brandmodel: z.string(),
  color: z.string().optional().default(''),
  bodynumber: z.string().optional().default(''),
  illegalseizuredate: z.string().optional(),
  insertdate: z.string().optional(),
});

const date = (s: string | undefined) => {
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// Downloads the list again only when the file changed; returns the number of rows loaded.
export async function importWanted(
  db: Db,
  log: (m: string) => void,
  fetchFn: typeof fetch = fetch,
): Promise<number | null> {
  const head = await fetchFn(WANTED_URL, { method: 'HEAD' });
  const modified = head.headers.get('last-modified');
  const [snapshot] = await db
    .select()
    .from(dataSnapshots)
    .where(sql`${dataSnapshots.source} = ${SOURCE}`);
  if (modified && snapshot?.fileModified === modified) {
    log(`Wanted list unchanged since ${modified}`);
    return null;
  }

  const res = await fetchFn(WANTED_URL);
  if (!res.ok) throw new Error(`Wanted list download failed: HTTP ${res.status}`);
  const raw = z.array(z.unknown()).parse(JSON.parse((await res.text()).replace(/^﻿/, '')));

  let asOf: Date | null = null;
  const rows = raw.flatMap((item) => {
    const parsed = record.safeParse(item);
    if (!parsed.success) return [];
    const r = parsed.data;
    const inserted = date(r.insertdate);
    if (inserted && (!asOf || inserted > asOf)) asOf = inserted;
    const vin = normalizeVin(r.bodynumber);
    // Only well-formed VINs can match an offer; the control digit is not required here.
    if (vinProblem(vin) === 'format') return [];
    return [
      {
        vin,
        brandModel: r.brandmodel.trim(),
        color: r.color.trim(),
        seizedAt: date(r.illegalseizuredate),
      },
    ];
  });

  await db.transaction(async (tx) => {
    await tx.delete(wantedVehicles);
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx.insert(wantedVehicles).values(rows.slice(i, i + BATCH));
    }
    const values = { asOf, fileModified: modified, rows: rows.length, importedAt: new Date() };
    await tx
      .insert(dataSnapshots)
      .values({ source: SOURCE, ...values })
      .onConflictDoUpdate({ target: dataSnapshots.source, set: values });
  });
  log(`Wanted list: ${rows.length} vehicles with a VIN (of ${raw.length})`);
  return rows.length;
}
