import { describe, expect, it } from 'vitest';
import {
  changesWorthAMessage,
  diffOffer,
  mergeChanges,
  type OfferSnapshot,
} from './offer-changes.ts';

const base: OfferSnapshot = {
  priceUsd: 25000,
  availability: 'in_transit',
  etaWeeks: 6,
  photoIds: ['a'],
  details: ['Toyota RAV4', 2021],
};

describe('diffOffer', () => {
  it('sees nothing when nothing changed, even if photos were reordered', () => {
    expect(diffOffer(base, { ...base })).toEqual([]);
  });

  it('names price, new photos, arrival and other edits', () => {
    const after = {
      priceUsd: 24000,
      availability: 'in_ukraine',
      etaWeeks: null,
      photoIds: ['a', 'b', 'c'],
      details: ['Toyota RAV4 Hybrid', 2021],
    };
    expect(diffOffer(base, after)).toEqual([
      { kind: 'price', from: 25000, to: 24000 },
      { kind: 'photos', added: 2 },
      { kind: 'arrived' },
      { kind: 'details' },
    ]);
  });

  it('treats the cleared weeks-to-Ukraine of an arrival as part of the arrival', () => {
    const after = { ...base, availability: 'in_ukraine', etaWeeks: null };
    expect(diffOffer(base, after)).toEqual([{ kind: 'arrived' }]);
    expect(diffOffer(base, { ...base, etaWeeks: 8 })).toEqual([{ kind: 'details' }]);
  });

  it('counts a move away from "in Ukraine" as a detail, not an arrival', () => {
    const before = { ...base, availability: 'in_ukraine' };
    expect(diffOffer(before, { ...base, availability: 'in_transit' })).toEqual([
      { kind: 'details' },
    ]);
  });
});

describe('mergeChanges', () => {
  it('keeps the first old price, adds up photos and keeps one details note', () => {
    const merged = mergeChanges(
      [
        { kind: 'price', from: 25000, to: 24000 },
        { kind: 'photos', added: 1 },
        { kind: 'details' },
      ],
      [
        { kind: 'price', from: 24000, to: 23500 },
        { kind: 'photos', added: 2 },
        { kind: 'details' },
      ],
    );
    expect(merged).toEqual([
      { kind: 'price', from: 25000, to: 23500 },
      { kind: 'photos', added: 3 },
      { kind: 'details' },
    ]);
  });

  it('drops a price that went back to where the buyer last saw it', () => {
    expect(
      mergeChanges(
        [{ kind: 'price', from: 25000, to: 24000 }],
        [{ kind: 'price', from: 24000, to: 25000 }],
      ),
    ).toEqual([]);
  });
});

describe('changesWorthAMessage', () => {
  it('flags an arrival and the first photos only', () => {
    expect(changesWorthAMessage([{ kind: 'arrived' }, { kind: 'photos', added: 2 }], 0)).toEqual([
      'arrived',
      'firstPhotos',
    ]);
    expect(changesWorthAMessage([{ kind: 'photos', added: 2 }, { kind: 'details' }], 3)).toEqual(
      [],
    );
  });
});
