import type { Params } from './client.ts';

export const PAGE_SIZE = 100;

export interface SearchPage {
  count: number;
  ids: string[];
}

export type SearchFn = (filter: Params, page: number) => Promise<SearchPage>;

export interface Band {
  lo: number;
  hi: number;
}

async function collectIds(search: SearchFn, filter: Params, first: SearchPage): Promise<string[]> {
  const ids = [...first.ids];
  const pages = Math.ceil(first.count / PAGE_SIZE);
  for (let page = 1; page < pages; page++) {
    ids.push(...(await search(filter, page)).ids);
  }
  return ids;
}

export interface RangeDimension {
  lo: number;
  hi: number;
  toFilter: (lo: number, hi: number) => Params;
  isLeaf: (lo: number, hi: number) => boolean;
  split: (lo: number, hi: number) => number;
}

// Splits [lo, hi] until each band is narrow enough, skipping empty bands after one
// request, so every listing ends up tagged with the band it falls in.
export async function partitionRange(
  search: SearchFn,
  base: Params,
  dim: RangeDimension,
): Promise<Map<string, Band>> {
  const result = new Map<string, Band>();

  async function visit(lo: number, hi: number): Promise<void> {
    const filter = { ...base, ...dim.toFilter(lo, hi) };
    const first = await search(filter, 0);
    if (first.count === 0) return;
    if (dim.isLeaf(lo, hi)) {
      for (const id of await collectIds(search, filter, first)) result.set(id, { lo, hi });
      return;
    }
    const mid = dim.split(lo, hi);
    await visit(lo, mid);
    await visit(mid + 1, hi);
  }

  await visit(dim.lo, dim.hi);
  return result;
}

export async function partitionEnum(
  search: SearchFn,
  base: Params,
  values: number[],
  toFilter: (value: number) => Params,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const value of values) {
    const filter = { ...base, ...toFilter(value) };
    const first = await search(filter, 0);
    if (first.count === 0) continue;
    for (const id of await collectIds(search, filter, first)) result.set(id, value);
  }
  return result;
}

export async function listAllIds(search: SearchFn, filter: Params): Promise<string[]> {
  return collectIds(search, filter, await search(filter, 0));
}

const currentYear = new Date().getUTCFullYear();

export const yearDimension: RangeDimension = {
  lo: 1980,
  hi: currentYear,
  toFilter: (lo, hi) => ({ 's_yers[0]': lo, 'po_yers[0]': hi }),
  isLeaf: (lo, hi) => lo === hi,
  split: (lo, hi) => Math.floor((lo + hi) / 2),
};

// Bands about 5% wide, split on a log scale so cheap and expensive cars get similar precision.
export const priceUsdDimension: RangeDimension = {
  lo: 500,
  hi: 500_000,
  toFilter: (lo, hi) => ({ price_ot: lo, price_do: hi, currency: 1 }),
  isLeaf: (lo, hi) => hi <= lo * 1.05 || hi - lo <= 300,
  split: (lo, hi) => Math.max(lo, Math.min(hi - 1, Math.round(Math.sqrt(lo * hi)))),
};

// auto.ria filters mileage in thousands of km.
export const mileageThousandKmDimension: RangeDimension = {
  lo: 0,
  hi: 1000,
  toFilter: (lo, hi) => ({ raceFrom: lo, raceTo: hi }),
  isLeaf: (lo, hi) => hi - lo <= Math.max(5, lo * 0.1),
  split: (lo, hi) => Math.floor((lo + hi) / 2),
};
