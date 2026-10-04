import 'server-only';
import { asc } from 'drizzle-orm';
import { brands } from '@avtoskop/db';
import { db } from './db';

export interface BrandOption {
  id: number;
  name: string;
}

const POPULAR = [
  'Toyota',
  'Volkswagen',
  'Skoda',
  'Renault',
  'Hyundai',
  'Kia',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Nissan',
  'Ford',
  'Mazda',
  'Honda',
  'Mitsubishi',
  'Chevrolet',
  'Tesla',
];

let cache: { popular: BrandOption[]; all: BrandOption[] } | null = null;

export async function getBrandOptions() {
  if (cache) return cache;
  const all = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .orderBy(asc(brands.name));
  const byName = new Map(all.map((b) => [b.name, b]));
  const popular = POPULAR.flatMap((n) => byName.get(n) ?? []);
  cache = { popular, all };
  return cache;
}
