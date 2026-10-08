import 'server-only';
import { autoriaSearchUrl, slugify } from '@avtoskop/core';
import { findAutoriaIds } from '@avtoskop/db';
import { db } from './db';

interface RequestFilters {
  brandId: number;
  model: string;
  yearFrom: number;
  yearTo: number | null;
  budgetUsd: number;
  region: string;
  fuels: string[];
  gearbox: string;
  mileageMaxKm: number | null;
}

// A link to AUTO.RIA's own search with the request filled in, or null for brands they don't list.
export async function autoriaLinkFor(r: RequestFilters): Promise<string | null> {
  const ids = await findAutoriaIds(db, r.brandId, slugify(r.model));
  if (!ids) return null;
  return autoriaSearchUrl({ ...r, brandAutoriaId: ids.brand, modelAutoriaId: ids.model });
}
