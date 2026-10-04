import { describe, expect, it } from 'vitest';
import {
  contactKey,
  decryptContact,
  encryptContact,
  hashContact,
  hashSecret,
  newSecret,
} from './contact-crypto.ts';
import { offerInput, offerLimitPerDay, reportInput, sellerProfileInput } from './seller.ts';

describe('sellerProfileInput', () => {
  it('keeps countries only for importers', () => {
    const importer = sellerProfileInput.parse({
      type: 'importer',
      name: 'AutoBridge',
      region: 'kyiv',
      countries: 'us,eu,us',
    });
    expect(importer.countries).toEqual(['us', 'eu']);
    const dealer = sellerProfileInput.parse({
      type: 'dealer',
      name: 'Дилер',
      region: 'lviv',
      countries: ['us'],
    });
    expect(dealer.countries).toEqual([]);
  });

  it('rejects a too-short name and unknown type', () => {
    expect(
      sellerProfileInput.safeParse({ type: 'importer', name: 'A', region: 'kyiv' }).success,
    ).toBe(false);
    expect(
      sellerProfileInput.safeParse({ type: 'broker', name: 'Abc', region: 'kyiv' }).success,
    ).toBe(false);
  });
});

describe('offerInput', () => {
  const base = {
    car: 'Toyota RAV4 2.5 Hybrid',
    year: '2020',
    mileageKm: '61000',
    priceUsd: '25900',
    availability: 'in_ukraine',
  };

  it('accepts a car already in Ukraine without delivery time', () => {
    const o = offerInput.parse({ ...base, etaWeeks: '', link: '', originCountry: '' });
    expect(o).toMatchObject({ year: 2020, priceUsd: 25900, availability: 'in_ukraine' });
    expect(o.link).toBeUndefined();
  });

  it('requires delivery time for cars in transit', () => {
    const r = offerInput.safeParse({ ...base, availability: 'in_transit' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(['etaWeeks']);
    expect(
      offerInput.safeParse({
        ...base,
        availability: 'in_transit',
        etaWeeks: '5',
        originCountry: 'us',
      }).success,
    ).toBe(true);
  });

  it('accepts only http(s) links', () => {
    expect(
      offerInput.safeParse({ ...base, link: 'https://auto.ria.com/uk/auto_1.html' }).success,
    ).toBe(true);
    expect(offerInput.safeParse({ ...base, link: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('contact crypto', () => {
  const key = contactKey(Buffer.alloc(32, 7).toString('base64'));

  it('round-trips and hashes stably', () => {
    const enc = encryptContact('+380501234567', key);
    expect(enc).not.toContain('380501234567');
    expect(decryptContact(enc, key)).toBe('+380501234567');
    expect(hashContact('+380501234567', key)).toBe(hashContact('+380501234567', key));
  });

  it('rejects a key of the wrong size', () => {
    expect(() => contactKey('c2hvcnQ=')).toThrow();
  });

  it('creates unguessable secrets and stores only their hash', () => {
    const a = newSecret();
    expect(a).not.toBe(newSecret());
    expect(hashSecret(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('offerLimitPerDay', () => {
  it('gives new sellers a small allowance and banned sellers none', () => {
    expect(offerLimitPerDay('pending')).toBe(5);
    expect(offerLimitPerDay('verified')).toBe(50);
    expect(offerLimitPerDay('banned')).toBe(0);
  });
});

describe('reportInput', () => {
  it('accepts a known reason and trims the comment', () => {
    expect(reportInput.parse({ reason: 'deposit', comment: '  asked $500 upfront ' })).toEqual({
      reason: 'deposit',
      comment: 'asked $500 upfront',
    });
    expect(reportInput.safeParse({ reason: 'boring' }).success).toBe(false);
  });
});
