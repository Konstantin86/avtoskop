import { z } from 'zod';
import { REGION_CODES, SELLER_TYPES, sellerTypeAllowed, WISHES } from './request.ts';
import { normalizeVin, vinProblem } from './vin.ts';

export const SOURCE_COUNTRIES = ['us', 'eu', 'kr', 'cn', 'jp', 'ca'] as const;
export const AVAILABILITY = ['in_ukraine', 'in_transit', 'to_order'] as const;
// Features a seller can claim for an offer: the buyer wishes first, then offer-only ones.
export const OFFER_EXTRAS = ['customs_cleared', 'inspection_ok', 'warranty', 'negotiable'] as const;
export const OFFER_FEATURES = [...WISHES, ...OFFER_EXTRAS] as const;

const asArray = (v: unknown) => (typeof v === 'string' ? v.split(',').filter(Boolean) : (v ?? []));
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional(),
  );

export const sellerProfileInput = z
  .object({
    type: z.enum(SELLER_TYPES),
    name: z.string().trim().min(2).max(80),
    region: z.enum(REGION_CODES),
    countries: z.preprocess(asArray, z.array(z.enum(SOURCE_COUNTRIES))),
    about: z.string().trim().max(500).optional().default(''),
    brandIds: z.preprocess(asArray, z.array(z.coerce.number().int().positive()).max(40)),
    serviceRegions: z.preprocess(asArray, z.array(z.enum(REGION_CODES)).max(30)),
    alerts: z.preprocess((v) => v === true || v === 'on', z.boolean()),
  })
  .transform((s) => ({
    ...s,
    countries: s.type === 'importer' ? [...new Set(s.countries)] : [],
    brandIds: [...new Set(s.brandIds)],
    // Choosing "all of Ukraine" is the same as choosing nothing.
    serviceRegions: s.serviceRegions.includes('all') ? [] : [...new Set(s.serviceRegions)],
  }));

export type SellerProfileInput = z.infer<typeof sellerProfileInput>;

const currentYear = new Date().getUTCFullYear();

export const offerInput = z
  .object({
    car: z.string().trim().min(2).max(80),
    year: z.coerce
      .number()
      .int()
      .min(1990)
      .max(currentYear + 1),
    // Optional on the short form; for an order it means "up to this mileage".
    mileageKm: optionalInt(0, 1_000_000),
    priceUsd: z.coerce.number().int().min(500).max(1_000_000),
    // Orders ('to_order') can quote a price range and the seller's service fee within it.
    priceMaxUsd: optionalInt(500, 1_000_000),
    serviceFeeUsd: optionalInt(0, 100_000),
    availability: z.enum(AVAILABILITY),
    etaWeeks: optionalInt(1, 52),
    originCountry: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.enum([...SOURCE_COUNTRIES, 'ua']).optional(),
    ),
    link: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .url({ protocol: /^https?$/ })
        .max(300)
        .optional(),
    ),
    description: z.string().trim().max(1000).optional().default(''),
    vin: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() !== '' ? normalizeVin(v) : undefined),
      z
        .string()
        .refine((v) => vinProblem(v) === null)
        .optional(),
    ),
    features: z.preprocess(
      (v) => [...new Set(asArray(v) as unknown[])],
      z.array(z.enum(OFFER_FEATURES)),
    ),
  })
  .refine((o) => o.availability === 'in_ukraine' || o.etaWeeks !== undefined, {
    path: ['etaWeeks'],
    message: 'etaWeeks',
  })
  .refine((o) => o.priceMaxUsd === undefined || o.priceMaxUsd >= o.priceUsd, {
    path: ['priceMaxUsd'],
    message: 'priceMaxUsd',
  })
  .refine((o) => o.serviceFeeUsd === undefined || o.serviceFeeUsd < o.priceUsd, {
    path: ['serviceFeeUsd'],
    message: 'serviceFeeUsd',
  })
  // A car still to be found has no VIN, and a range or a fee only makes sense for an order.
  .transform((o) =>
    o.availability === 'to_order'
      ? { ...o, vin: undefined }
      : { ...o, priceMaxUsd: undefined, serviceFeeUsd: undefined },
  );

export type OfferInput = z.infer<typeof offerInput>;

export const REPORT_REASONS = ['deposit', 'price', 'not_real', 'spam', 'rude', 'other'] as const;

export const reportInput = z.object({
  reason: z.enum(REPORT_REASONS),
  comment: z.string().trim().max(500).optional().default(''),
});

// New sellers get a small daily allowance until an admin verifies them.
export const OFFER_LIMITS_PER_DAY = { pending: 5, verified: 50 } as const;

export function offerLimitPerDay(status: string): number {
  return status === 'verified'
    ? OFFER_LIMITS_PER_DAY.verified
    : status === 'pending'
      ? OFFER_LIMITS_PER_DAY.pending
      : 0;
}

export { SELLER_TYPES };

export interface AlertRequest {
  brandId: number;
  sellerTypes: string[];
  region: string;
  importOk: boolean;
}

export interface AlertSeller {
  type: string;
  status: string;
  alerts: boolean;
  brandIds: number[];
  serviceRegions: string[];
}

// Whether a newly published request should be sent to this seller in Telegram.
export function requestMatchesSeller(request: AlertRequest, seller: AlertSeller): boolean {
  if (!seller.alerts || seller.status === 'banned') return false;
  if (!sellerTypeAllowed(request.sellerTypes, seller.type)) return false;
  if (seller.type === 'importer' && !request.importOk) return false;
  if (seller.brandIds.length > 0 && !seller.brandIds.includes(request.brandId)) return false;
  // A buyer who accepts any region can be served from anywhere.
  if (request.region === 'all' || seller.serviceRegions.length === 0) return true;
  return seller.serviceRegions.includes(request.region);
}

// The buyer's wishes that the seller says this offer meets.
export function matchedWishes(wishes: readonly string[], features: readonly string[]): string[] {
  return wishes.filter((w) => features.includes(w));
}
