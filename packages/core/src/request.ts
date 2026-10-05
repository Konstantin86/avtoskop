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

// A request can accept several fuels; none chosen means any fuel.
export const FUELS = ['hybrid', 'petrol', 'diesel', 'electric'] as const;
export const GEARBOXES = ['any', 'automatic', 'manual'] as const;
export const WISHES = [
  'no_accidents',
  'one_owner',
  'service_history',
  'no_auction',
  'awd',
] as const;
export const SELLER_TYPES = ['importer', 'dealer', 'buyout', 'owner'] as const;

export const NOTIFY_CHANNELS = ['telegram', 'sms', 'email'] as const;

// Accepts the ways Ukrainians type a mobile number and returns +380XXXXXXXXX, or null.
// The part after +380 while someone types or pastes: drops the country code or the leading 0
// and keeps at most 9 digits.
export function uaNationalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('380')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return national.slice(0, 9);
}

// "959138819" → "95 913 88 19"
export function formatUaNational(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(' ');
}

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
    fuels: z.preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : (v ?? [])),
      z.array(z.enum(FUELS)).transform((f) => [...new Set(f)]),
    ),
    gearbox: z.enum(GEARBOXES).default('any'),
    // Checkbox values arrive as an array, or as a comma-separated string when re-submitted.
    wishes: z.preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : (v ?? [])),
      z.array(z.enum(WISHES)).transform((w) => [...new Set(w)]),
    ),
    // Seller types allowed to reply. Empty means everyone; ticking none or all means everyone too.
    sellerTypes: z.preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : (v ?? [])),
      z
        .array(z.enum(SELLER_TYPES))
        .transform((t) => [...new Set(t)])
        .transform((t) => (t.length === SELLER_TYPES.length ? [] : t)),
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

const modelKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Returns the official spelling when the typed model matches a known one ("land cruiser",
// "Land-Cruiser" → "Land Cruiser"); otherwise keeps what the buyer typed.
export function canonicalModel(typed: string, known: readonly string[]): string {
  const key = modelKey(typed);
  return known.find((name) => modelKey(name) === key) ?? typed;
}

export function sellerTypeAllowed(allowed: readonly string[], type: string): boolean {
  return allowed.length === 0 || allowed.includes(type);
}
