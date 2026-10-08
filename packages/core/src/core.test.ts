import { describe, expect, it } from 'vitest';
import {
  buyerRequestInput,
  canonicalModel,
  formatUaNational,
  localePath,
  normalizeUaPhone,
  telegramPhone,
  pageKind,
  pluralUk,
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
    expect(r.gearbox).toBe('automatic');
    expect(r.wishes).toEqual(['no_accidents', 'one_owner']);
  });

  it('rejects missing consent', () => {
    const r = buyerRequestInput.safeParse({
      ...valid,
      consent: undefined,
      yearTo: '2015',
    });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('consent');
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

describe('pluralUk', () => {
  const forms = ['продавець', 'продавці', 'продавців'] as const;
  it('picks the Ukrainian form for a number', () => {
    expect([1, 3, 5, 11, 12, 21, 22, 25, 101, 112].map((n) => pluralUk(n, forms))).toEqual([
      'продавець',
      'продавці',
      'продавців',
      'продавців',
      'продавців',
      'продавець',
      'продавці',
      'продавців',
      'продавець',
      'продавців',
    ]);
  });
});

describe('pageKind', () => {
  it('drops the language, ids and private keys', () => {
    expect(pageKind('/ua')).toBe('/');
    expect(pageKind('/en/requests')).toBe('/requests');
    expect(pageKind('/ua/requests/3a466e90-163c-43d3-997d-6203ee87a306/offer')).toBe(
      '/requests/:id/offer',
    );
    expect(pageKind('/ua/my/f7IaOcpRtiCz9qkAwgQV3-dT51jrO1VI')).toBe('/my');
    expect(pageKind('/ua/request/sent?id=1&key=secret')).toBe('/request/sent');
  });

  it('ignores odd addresses', () => {
    expect(pageKind('/ua/<script>')).toBeNull();
  });
});

describe('telegramPhone', () => {
  it('adds the plus and keeps foreign numbers', () => {
    expect(telegramPhone('380501234567')).toBe('+380501234567');
    expect(telegramPhone('+48 512 345 678')).toBe('+48512345678');
  });

  it('rejects anything too short or too long', () => {
    expect(telegramPhone('12345')).toBeNull();
    expect(telegramPhone('1234567890123456')).toBeNull();
  });
});
