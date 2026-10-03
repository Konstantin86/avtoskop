import { z } from 'zod';

export const namedValueList = z.array(z.object({ name: z.string(), value: z.number() }));

export const searchResponse = z.object({
  result: z.object({
    search_result: z.object({
      ids: z.array(z.coerce.string()),
      count: z.number(),
    }),
  }),
});

// Only the fields we use; the rest of the payload is kept as raw details.
export const infoResponse = z
  .object({
    USD: z.number().optional(),
    VIN: z.string().optional(),
    linkToView: z.string().optional(),
    stateData: z.object({ stateId: z.number() }).partial().optional(),
    autoData: z
      .object({
        autoId: z.number(),
        year: z.number(),
        raceInt: z.number(),
        fuelId: z.number(),
        gearBoxId: z.number(),
        isSold: z.boolean(),
        active: z.boolean(),
      })
      .partial(),
  })
  .loose();

export type InfoResponse = z.infer<typeof infoResponse>;

// Seller identity and auto.ria internals we must not or need not store.
const DROPPED_KEYS = ['userPhoneData', 'userId', 'codedVin', 'secureKey', 'vinSvg', 'dealer'];

export function sanitizeDetails(raw: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...raw };
  for (const key of DROPPED_KEYS) delete copy[key];
  return copy;
}
