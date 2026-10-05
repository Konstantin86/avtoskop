import { describe, expect, it } from 'vitest';
import { requestDetails } from './alerts.ts';

// Number formatting uses non-breaking spaces; compare with plain ones.
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('requestDetails', () => {
  it('describes the request in the seller alert', () => {
    const base = {
      budgetUsd: 28000,
      region: 'kyiv',
      fuel: 'hybrid',
      gearbox: 'automatic',
      importOk: true,
    };
    expect(plain(requestDetails('uk', base))).toBe(
      'до $28 000 · Київська обл. · Гібрид · Автомат · імпорт підходить',
    );
    expect(
      plain(requestDetails('en', { ...base, fuel: 'any', gearbox: 'any', importOk: false })),
    ).toBe('up to $28,000 · Kyiv region · only cars in Ukraine');
  });
});
