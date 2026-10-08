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
// Why a buyer closed a request; optional, and passed on to sellers who sent offers.
export const CLOSE_REASONS = ['found_here', 'found_elsewhere', 'not_looking'] as const;

// New, used, or either; a new car has no mileage limit.
export const CONDITIONS = ['any', 'new', 'used'] as const;
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

// The phone from a contact shared in Telegram, as +digits. Telegram sends it with or without "+".
export function telegramPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
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
    condition: z.enum(CONDITIONS).default('any'),
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
    notifyVia: z.enum(NOTIFY_CHANNELS),
    consent: z.preprocess((v) => v === true || v === 'on', z.literal(true)),
  })
  .refine((r) => r.yearTo === undefined || r.yearTo >= r.yearFrom, {
    path: ['yearTo'],
    message: 'yearTo',
  })
  .transform((r) => (r.condition === 'new' ? { ...r, mileageMaxKm: undefined } : r));

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

// "Your request reached N sellers" is shown only from this many; a small number would discourage.
export const MIN_SELLERS_TO_SHOW = 3;

// Ukrainian noun form after a number: 1 продавець, 3 продавці, 7 продавців.
export function pluralUk(n: number, forms: readonly [string, string, string]): string {
  const ten = n % 10;
  const hundred = n % 100;
  if (ten === 1 && hundred !== 11) return forms[0];
  if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return forms[1];
  return forms[2];
}

// A confirmed request stays open this long; the buyer can extend it.
export const REQUEST_LIFETIME_DAYS = 30;
export const EXPIRY_REMINDER_DAYS = 3;

export function requestExpiry(from: Date): Date {
  return new Date(from.getTime() + REQUEST_LIFETIME_DAYS * 86_400_000);
}

// Public activity numbers ("12 requests this week") appear only from this value; small ones discourage.
export const LIVE_STATS_MIN = 10;

const ID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A page address reduced to its page type for visit counts: no request ids, never a private key.
export function pageKind(path: string): string | null {
  const parts = path.split('?')[0]!.split('/').filter(Boolean);
  if (parts[0] === 'ua' || parts[0] === 'en' || parts[0] === 'uk') parts.shift();
  if (parts[0] === 'my') return '/my';
  const kind = parts.map((p) => (ID_SEGMENT.test(p) ? ':id' : p)).join('/');
  return /^[a-z:/-]{0,40}$/.test(kind) ? `/${kind}` : null;
}
