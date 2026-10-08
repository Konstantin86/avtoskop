import { describe, expect, it } from 'vitest';
import { alertTargetsChanged, editsInLastDay, requestChanges } from './request-edits.ts';

const before = { yearFrom: 2020, yearTo: null, budgetUsd: 15000, region: 'kyiv', importOk: true };

describe('requestChanges', () => {
  it('lists budget, years, region and import changes', () => {
    expect(
      requestChanges(before, {
        yearFrom: 2019,
        yearTo: 2022,
        budgetUsd: 17000,
        region: 'all',
        importOk: false,
      }),
    ).toEqual([
      { field: 'budget', from: 15000, to: 17000 },
      { field: 'years', from: [2020, null], to: [2019, 2022] },
      { field: 'region', from: 'kyiv', to: 'all' },
      { field: 'import', from: true, to: false },
    ]);
  });

  it('is empty when none of them changed', () => {
    expect(requestChanges(before, { ...before })).toEqual([]);
  });
});

describe('alertTargetsChanged', () => {
  const alert = { brandId: 1, sellerTypes: ['dealer', 'owner'], region: 'kyiv', importOk: false };

  it('sees region, import and seller type changes, ignoring order', () => {
    expect(alertTargetsChanged(alert, { ...alert, sellerTypes: ['owner', 'dealer'] })).toBe(false);
    expect(alertTargetsChanged(alert, { ...alert, importOk: true })).toBe(true);
    expect(alertTargetsChanged(alert, { ...alert, region: 'lviv' })).toBe(true);
    expect(alertTargetsChanged(alert, { ...alert, sellerTypes: [] })).toBe(true);
  });
});

describe('editsInLastDay', () => {
  it('counts only the last 24 hours', () => {
    const now = new Date('2026-10-08T12:00:00Z');
    const times = [new Date('2026-10-07T11:00:00Z'), new Date('2026-10-08T09:00:00Z')];
    expect(editsInLastDay(times, now)).toBe(1);
  });
});
