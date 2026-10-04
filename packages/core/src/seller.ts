import { z } from 'zod';
import { REGION_CODES } from './request.ts';

export const SELLER_TYPES = ['importer', 'dealer', 'buyout', 'owner'] as const;
export const SOURCE_COUNTRIES = ['us', 'eu', 'kr', 'cn', 'jp', 'ca'] as const;
export const AVAILABILITY = ['in_ukraine', 'in_transit', 'to_order'] as const;

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
  })
  .transform((s) => ({
    ...s,
    countries: s.type === 'importer' ? [...new Set(s.countries)] : [],
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
    mileageKm: z.coerce.number().int().min(0).max(1_000_000),
    priceUsd: z.coerce.number().int().min(500).max(1_000_000),
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
  })
  .refine((o) => o.availability === 'in_ukraine' || o.etaWeeks !== undefined, {
    path: ['etaWeeks'],
    message: 'etaWeeks',
  });

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
