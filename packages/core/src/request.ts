import { z } from 'zod';

export const REGION_CODES = [
  'kyiv-city',
  'vinnytsia',
  'volyn',
  'dnipro',
  'donetsk',
  'zhytomyr',
  'zakarpattia',
  'zaporizhzhia',
  'ivano-frankivsk',
  'kyiv',
  'kirovohrad',
  'luhansk',
  'lviv',
  'mykolaiv',
  'odesa',
  'poltava',
  'rivne',
  'sumy',
  'ternopil',
  'kharkiv',
  'kherson',
  'khmelnytskyi',
  'cherkasy',
  'chernivtsi',
  'chernihiv',
  'all',
] as const;

export const FUELS = ['any', 'hybrid', 'petrol', 'diesel', 'electric'] as const;
export const GEARBOXES = ['any', 'automatic', 'manual'] as const;
export const WISHES = [
  'no_accidents',
  'one_owner',
  'service_history',
  'no_auction',
  'awd',
] as const;
export const NOTIFY_CHANNELS = ['telegram', 'sms', 'email'] as const;

// Accepts the ways Ukrainians type a mobile number and returns +380XXXXXXXXX, or null.
export function normalizeUaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('380')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits.length === 9
        ? digits
        : '';
  return /^[3-9]\d{8}$/.test(national) ? `+380${national}` : null;
}

const currentYear = new Date().getUTCFullYear();
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional(),
  );

export const buyerRequestInput = z
  .object({
    brandId: z.coerce.number().int().positive(),
    model: z.string().trim().min(1).max(60),
    yearFrom: z.coerce.number().int().min(1990).max(currentYear),
    yearTo: optionalInt(1990, currentYear),
    budgetUsd: z.coerce.number().int().min(1000).max(500_000),
    mileageMaxKm: optionalInt(1000, 1_000_000),
    fuel: z.enum(FUELS),
    gearbox: z.enum(GEARBOXES).default('any'),
    // Checkbox values arrive as an array, or as a comma-separated string when re-submitted.
    wishes: z.preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : (v ?? [])),
      z.array(z.enum(WISHES)).transform((w) => [...new Set(w)]),
    ),
    importOk: z.preprocess((v) => v === true || v === 'on' || v === 'true', z.boolean()),
    region: z.enum(REGION_CODES),
    notes: z.string().trim().max(500).optional().default(''),
    phone: z.string().transform((v, ctx) => {
      const phone = normalizeUaPhone(v);
      if (!phone) ctx.addIssue({ code: 'custom', message: 'phone' });
      return phone ?? '';
    }),
    notifyVia: z.enum(NOTIFY_CHANNELS),
    consent: z.preprocess((v) => v === true || v === 'on', z.literal(true)),
  })
  .refine((r) => r.yearTo === undefined || r.yearTo >= r.yearFrom, {
    path: ['yearTo'],
    message: 'yearTo',
  });

export type BuyerRequestInput = z.infer<typeof buyerRequestInput>;
