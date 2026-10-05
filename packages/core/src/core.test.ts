import { describe, expect, it } from 'vitest';
import {
  buyerRequestInput,
  canonicalModel,
  formatUaNational,
  localePath,
  normalizeUaPhone,
  sellerTypeAllowed,
  slugify,
  uaNationalDigits,
} from './index.ts';

describe('slugify', () => {
  it.each([
    ['Toyota', 'toyota'],
    ['Mercedes-Benz', 'mercedes-benz'],
    ['ВАЗ / Lada', 'vaz-lada'],
    ['ЗАЗ', 'zaz'],
    ['Богдан', 'bohdan'],
    ['ЄРАЗ', 'yeraz'],
    ['Житомир', 'zhytomyr'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('normalizeUaPhone', () => {
  it.each([
    ['+380 50 123 45 67', '+380501234567'],
    ['0501234567', '+380501234567'],
    ['380501234567', '+380501234567'],
    ['(050) 123-45-67', '+380501234567'],
    ['501234567', '+380501234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeUaPhone(input)).toBe(expected);
  });

  it.each(['12345', '+48 501 234 567', '0001234567', ''])('rejects %s', (input) => {
    expect(normalizeUaPhone(input)).toBeNull();
  });
});

describe('buyerRequestInput', () => {
  const valid = {
    brandId: '79',
    model: ' RAV4 ',
    yearFrom: '2019',
    yearTo: '',
    budgetUsd: '28000',
    mileageMaxKm: '',
    fuels: 'hybrid,diesel',
    gearbox: 'automatic',
    wishes: ['no_accidents', 'one_owner', 'no_accidents'],
    importOk: 'on',
    region: 'kyiv',
    notes: '',
    phone: '050 123 45 67',
    notifyVia: 'telegram',
    consent: 'on',
  };

  it('accepts form data and normalizes it', () => {
    const r = buyerRequestInput.parse(valid);
    expect(r).toMatchObject({
      brandId: 79,
      model: 'RAV4',
      yearFrom: 2019,
      budgetUsd: 28000,
      importOk: true,
    });
    expect(r.yearTo).toBeUndefined();
    expect(r.phone).toBe('+380501234567');
    expect(r.gearbox).toBe('automatic');
    expect(r.wishes).toEqual(['no_accidents', 'one_owner']);
  });

  it('rejects a bad phone, missing consent and reversed years', () => {
    const r = buyerRequestInput.safeParse({
      ...valid,
      phone: '123',
      consent: undefined,
      yearTo: '2015',
    });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['phone', 'consent']));
  });

  it('accepts wishes as a comma-separated string and defaults gearbox', () => {
    const { gearbox, ...rest } = valid;
    const r = buyerRequestInput.parse({ ...rest, wishes: 'awd,service_history' });
    expect(r.gearbox).toBe('any');
    expect(r.wishes).toEqual(['awd', 'service_history']);
  });

  it('rejects unknown wishes', () => {
    expect(buyerRequestInput.safeParse({ ...valid, wishes: ['cheap'] }).success).toBe(false);
  });

  it('rejects reversed years', () => {
    expect(buyerRequestInput.safeParse({ ...valid, yearTo: '2015' }).success).toBe(false);
  });
});

describe('canonicalModel', () => {
  const known = ['Land Cruiser', 'Land Cruiser Prado', 'RAV4', 'C-HR'];

  it('fixes case, spaces and hyphens to the official name', () => {
    expect(canonicalModel('land cruiser', known)).toBe('Land Cruiser');
    expect(canonicalModel('Land-Cruiser', known)).toBe('Land Cruiser');
    expect(canonicalModel('rav 4', known)).toBe('RAV4');
    expect(canonicalModel('chr', known)).toBe('C-HR');
  });

  it('keeps unknown or partial names as typed', () => {
    expect(canonicalModel('Prado', known)).toBe('Prado');
    expect(canonicalModel('Sequoia', known)).toBe('Sequoia');
  });
});

describe('localePath', () => {
  it('uses /ua for Ukrainian and /en for English', () => {
    expect(localePath('uk', '/my/abc')).toBe('/ua/my/abc');
    expect(localePath('en', '/terms')).toBe('/en/terms');
    expect(localePath('de', '/')).toBe('/ua/');
  });
});

describe('phone typing helpers', () => {
  it('keeps only the part after +380, however the number is typed or pasted', () => {
    expect(uaNationalDigits('0959138819')).toBe('959138819');
    expect(uaNationalDigits('+380 95 913-88-19')).toBe('959138819');
    expect(uaNationalDigits('380959138819')).toBe('959138819');
    expect(uaNationalDigits('95913')).toBe('95913');
    expect(uaNationalDigits('09591388199999')).toBe('959138819');
  });

  it('spaces the number as it grows', () => {
    expect(formatUaNational('95')).toBe('95');
    expect(formatUaNational('95913')).toBe('95 913');
    expect(formatUaNational('959138819')).toBe('95 913 88 19');
  });
});

describe('buyerRequestInput fuels', () => {
  it('accepts several fuels, none meaning any', () => {
    const base = {
      brandId: '1',
      model: 'RAV4',
      yearFrom: '2019',
      budgetUsd: '28000',
      region: 'kyiv',
      importOk: 'on',
      phone: '0501234567',
      notifyVia: 'telegram',
      consent: 'on',
    };
    expect(buyerRequestInput.parse({ ...base, fuels: 'diesel,hybrid,diesel' }).fuels).toEqual([
      'diesel',
      'hybrid',
    ]);
    expect(buyerRequestInput.parse(base).fuels).toEqual([]);
    expect(buyerRequestInput.safeParse({ ...base, fuels: 'any' }).success).toBe(false);
  });
});

describe('buyerRequestInput seller types', () => {
  const base = {
    brandId: '1',
    model: 'RAV4',
    yearFrom: '2019',
    budgetUsd: '28000',
    region: 'kyiv',
    importOk: 'on',
    phone: '0501234567',
    notifyVia: 'telegram',
    consent: 'on',
  };

  it('keeps a limited choice and treats none or all as everyone', () => {
    expect(buyerRequestInput.parse({ ...base, sellerTypes: 'owner,dealer' }).sellerTypes).toEqual([
      'owner',
      'dealer',
    ]);
    expect(buyerRequestInput.parse(base).sellerTypes).toEqual([]);
    expect(
      buyerRequestInput.parse({ ...base, sellerTypes: 'importer,dealer,buyout,owner' }).sellerTypes,
    ).toEqual([]);
  });

  it('checks a seller type against the choice', () => {
    expect(sellerTypeAllowed([], 'buyout')).toBe(true);
    expect(sellerTypeAllowed(['owner'], 'buyout')).toBe(false);
  });
});
