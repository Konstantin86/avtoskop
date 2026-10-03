import { describe, expect, it } from 'vitest';
import type { Params } from './client.ts';
import {
  partitionEnum,
  partitionRange,
  priceUsdDimension,
  yearDimension,
  PAGE_SIZE,
  type SearchFn,
} from './partition.ts';

interface Car {
  id: string;
  year: number;
  price: number;
  fuel: number;
}

function fakeSearch(cars: Car[]): { search: SearchFn; calls: () => number } {
  let calls = 0;
  const search: SearchFn = async (filter: Params, page: number) => {
    calls++;
    const n = (k: string) => (filter[k] === undefined ? undefined : Number(filter[k]));
    const hits = cars.filter(
      (c) =>
        (n('s_yers[0]') === undefined || c.year >= n('s_yers[0]')!) &&
        (n('po_yers[0]') === undefined || c.year <= n('po_yers[0]')!) &&
        (n('price_ot') === undefined || c.price >= n('price_ot')!) &&
        (n('price_do') === undefined || c.price <= n('price_do')!) &&
        (n('type[0]') === undefined || c.fuel === n('type[0]')),
    );
    return {
      count: hits.length,
      ids: hits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((c) => c.id),
    };
  };
  return { search, calls: () => calls };
}

const cars: Car[] = Array.from({ length: 250 }, (_, i) => ({
  id: String(i),
  year: 2015 + (i % 8),
  price: 9000 + i * 97,
  fuel: (i % 3) + 1,
}));

describe('partitionRange', () => {
  it('tags every listing with its exact year, paging through big years', async () => {
    const { search } = fakeSearch(cars);
    const result = await partitionRange(search, {}, yearDimension);
    expect(result.size).toBe(cars.length);
    for (const car of cars) expect(result.get(car.id)).toEqual({ lo: car.year, hi: car.year });
  });

  it('puts every price inside a band about 5% wide', async () => {
    const { search } = fakeSearch(cars);
    const result = await partitionRange(search, {}, priceUsdDimension);
    expect(result.size).toBe(cars.length);
    for (const car of cars) {
      const band = result.get(car.id)!;
      expect(car.price).toBeGreaterThanOrEqual(band.lo);
      expect(car.price).toBeLessThanOrEqual(band.hi);
      expect(band.hi <= band.lo * 1.05 || band.hi - band.lo <= 300).toBe(true);
    }
  });

  it('costs far fewer requests than one per listing', async () => {
    const { search, calls } = fakeSearch(cars);
    await partitionRange(search, {}, priceUsdDimension);
    expect(calls()).toBeLessThan(cars.length / 2);
  });
});

describe('partitionEnum', () => {
  it('tags listings with each value and skips empty values', async () => {
    const { search, calls } = fakeSearch(cars);
    const result = await partitionEnum(search, {}, [1, 2, 3, 9], (v) => ({ 'type[0]': v }));
    expect(result.size).toBe(cars.length);
    for (const car of cars) expect(result.get(car.id)).toBe(car.fuel);
    expect(calls()).toBe(4);
  });
});
