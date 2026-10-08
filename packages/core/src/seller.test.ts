import { describe, expect, it } from 'vitest';
import {
  contactKey,
  decryptContact,
  encryptContact,
  hashContact,
  hashSecret,
  newSecret,
} from './contact-crypto.ts';
import {
  matchedWishes,
  offerInput,
  offerLimitPerDay,
  reportInput,
  requestMatchesSeller,
  sellerProfileInput,
} from './seller.ts';

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

describe('sellerProfileInput alert settings', () => {
  const base = { type: 'dealer', name: 'Авто Плюс', region: 'lviv' };

  it('reads brands, regions and the alerts checkbox from form values', () => {
    const p = sellerProfileInput.parse({
      ...base,
      brandIds: '5,9,5',
      serviceRegions: 'lviv,volyn',
      alerts: 'on',
    });
    expect(p.brandIds).toEqual([5, 9]);
    expect(p.serviceRegions).toEqual(['lviv', 'volyn']);
    expect(p.alerts).toBe(true);
  });

  it('treats "all of Ukraine" as no region filter, and a missing checkbox as off', () => {
    const p = sellerProfileInput.parse({ ...base, serviceRegions: 'all,lviv' });
    expect(p.serviceRegions).toEqual([]);
    expect(p.brandIds).toEqual([]);
    expect(p.alerts).toBe(false);
  });
});

describe('requestMatchesSeller', () => {
  const seller = {
    type: 'dealer',
    status: 'pending',
    alerts: true,
    brandIds: [],
    serviceRegions: [],
  };
  const request = { brandId: 5, region: 'lviv', importOk: true, sellerTypes: [] as string[] };

  it('matches everything when the seller set no filters', () => {
    expect(requestMatchesSeller(request, seller)).toBe(true);
  });

  it('filters by brand and region', () => {
    expect(requestMatchesSeller(request, { ...seller, brandIds: [5] })).toBe(true);
    expect(requestMatchesSeller(request, { ...seller, brandIds: [7] })).toBe(false);
    expect(requestMatchesSeller(request, { ...seller, serviceRegions: ['kyiv'] })).toBe(false);
    expect(
      requestMatchesSeller({ ...request, region: 'all' }, { ...seller, serviceRegions: ['kyiv'] }),
    ).toBe(true);
  });

  it('skips importers when the buyer does not want an imported car', () => {
    expect(
      requestMatchesSeller({ ...request, importOk: false }, { ...seller, type: 'importer' }),
    ).toBe(false);
    expect(requestMatchesSeller({ ...request, importOk: false }, seller)).toBe(true);
  });

  it('skips seller types the buyer did not allow', () => {
    expect(requestMatchesSeller({ ...request, sellerTypes: ['owner'] }, seller)).toBe(false);
    expect(requestMatchesSeller({ ...request, sellerTypes: ['owner', 'dealer'] }, seller)).toBe(
      true,
    );
  });

  it('never alerts banned sellers or sellers who turned alerts off', () => {
    expect(requestMatchesSeller(request, { ...seller, status: 'banned' })).toBe(false);
    expect(requestMatchesSeller(request, { ...seller, alerts: false })).toBe(false);
  });
});

describe('offer features', () => {
  const base = {
    car: 'Toyota RAV4',
    year: '2021',
    mileageKm: '40000',
    priceUsd: '25000',
    availability: 'in_ukraine',
  };

  it('reads checkbox values, drops duplicates and rejects unknown ones', () => {
    expect(
      offerInput.parse({ ...base, features: 'no_accidents,warranty,warranty' }).features,
    ).toEqual(['no_accidents', 'warranty']);
    expect(offerInput.parse(base).features).toEqual([]);
    expect(offerInput.safeParse({ ...base, features: 'like_new' }).success).toBe(false);
  });

  it('counts which buyer wishes the offer meets', () => {
    expect(matchedWishes(['no_accidents', 'awd'], ['awd', 'warranty'])).toEqual(['awd']);
    expect(matchedWishes([], ['awd'])).toEqual([]);
  });
});

describe('offer VIN', () => {
  const base = {
    car: 'Toyota RAV4',
    year: '2021',
    mileageKm: '40000',
    priceUsd: '25000',
    availability: 'in_ukraine',
  };

  it('is optional and normalised', () => {
    expect(offerInput.parse(base).vin).toBeUndefined();
    expect(offerInput.parse({ ...base, vin: ' ' }).vin).toBeUndefined();
    expect(offerInput.parse({ ...base, vin: '1hgcm82633a004352' }).vin).toBe('1HGCM82633A004352');
  });

  it('rejects a VIN with a typo', () => {
    const result = offerInput.safeParse({ ...base, vin: '1HGCM82643A004352' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['vin']);
  });
});

describe('offerInput for orders and the short form', () => {
  const base = { car: 'Toyota RAV4 Hybrid', year: '2021', priceUsd: '22000' };

  it('needs only car, year, price and availability', () => {
    const o = offerInput.parse({ ...base, availability: 'in_ukraine', mileageKm: '' });
    expect(o.mileageKm).toBeUndefined();
  });

  it('keeps a price range and fee for an order, and drops the VIN', () => {
    const o = offerInput.parse({
      ...base,
      availability: 'to_order',
      etaWeeks: '8',
      priceMaxUsd: '25000',
      serviceFeeUsd: '1000',
      vin: 'JTMWRREV0JD123456',
    });
    expect(o).toMatchObject({ priceUsd: 22000, priceMaxUsd: 25000, serviceFeeUsd: 1000 });
    expect(o.vin).toBeUndefined();
  });

  it('rejects a range that goes down and a fee above the price', () => {
    const order = { ...base, availability: 'to_order', etaWeeks: '8' };
    const low = offerInput.safeParse({ ...order, priceMaxUsd: '20000' });
    expect(low.error!.issues[0]!.path).toEqual(['priceMaxUsd']);
    const fee = offerInput.safeParse({ ...order, serviceFeeUsd: '30000' });
    expect(fee.error!.issues[0]!.path).toEqual(['serviceFeeUsd']);
  });

  it('ignores a range and fee on a car that already exists', () => {
    const o = offerInput.parse({
      ...base,
      availability: 'in_ukraine',
      priceMaxUsd: '25000',
      serviceFeeUsd: '1000',
    });
    expect(o.priceMaxUsd).toBeUndefined();
    expect(o.serviceFeeUsd).toBeUndefined();
  });
});

describe('offerInput photos', () => {
  const base = { car: 'Toyota RAV4', year: '2021', priceUsd: '22000', availability: 'in_ukraine' };
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

  it('keeps photo ids in order without repeats', () => {
    const o = offerInput.parse({ ...base, photos: `${id(2)},${id(1)},${id(2)}` });
    expect(o.photos).toEqual([id(2), id(1)]);
    expect(offerInput.parse(base).photos).toEqual([]);
  });

  it('allows at most 10 photos and only real ids', () => {
    const eleven = Array.from({ length: 11 }, (_, i) => id(i)).join(',');
    expect(offerInput.safeParse({ ...base, photos: eleven }).success).toBe(false);
    expect(offerInput.safeParse({ ...base, photos: '../../etc/passwd' }).success).toBe(false);
  });
});
