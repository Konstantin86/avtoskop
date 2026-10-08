import 'server-only';
import { inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { usesCheckDigit, type DecodedVin } from '@avtoskop/core';
import { dataSnapshots, wantedVehicles } from '@avtoskop/db';
import { db } from './db';

const nhtsa = z.object({
  Results: z.array(
    z.object({
      Make: z.string().default(''),
      Model: z.string().default(''),
      ModelYear: z.string().default(''),
    }),
  ),
});

// US government decoder (NHTSA vPIC), free and keyless. Full data for US-market cars;
// for others usually only the make, and their model year isn't reliable.
export async function decodeVin(vin: string): Promise<DecodedVin | null> {
  try {
    const res = await fetch(
      // VIN_DECODER_URL points at a stand-in in end-to-end tests.
      `${process.env['VIN_DECODER_URL'] || 'https://vpic.nhtsa.dot.gov'}/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const r = nhtsa.parse(await res.json()).Results[0];
    if (!r || (!r.Make && !r.Model)) return null;
    const year = Number(r.ModelYear);
    return {
      make: r.Make.trim(),
      model: r.Model.trim(),
      year: usesCheckDigit(vin) && Number.isInteger(year) && year > 1980 ? year : null,
    };
  } catch {
    return null;
  }
}

export async function wantedByVin(vins: string[]) {
  if (vins.length === 0) return new Map<string, { brandModel: string; seizedAt: Date | null }>();
  const rows = await db
    .select({
      vin: wantedVehicles.vin,
      brandModel: wantedVehicles.brandModel,
      seizedAt: wantedVehicles.seizedAt,
    })
    .from(wantedVehicles)
    .where(inArray(wantedVehicles.vin, vins));
  return new Map(rows.map((r) => [r.vin, r]));
}

// How fresh the wanted list is; null if it was never loaded.
export async function wantedListDate(): Promise<Date | null> {
  const [row] = await db
    .select({ asOf: dataSnapshots.asOf })
    .from(dataSnapshots)
    .where(sql`${dataSnapshots.source} = 'mvs_wanted'`);
  return row?.asOf ?? null;
}
