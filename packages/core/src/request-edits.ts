import type { AlertRequest } from './seller.ts';

// A buyer may edit a request a few times a day; each edit can reach sellers' Telegram.
export const REQUEST_EDITS_PER_DAY = 3;

export interface EditableRequest {
  yearFrom: number;
  yearTo: number | null;
  budgetUsd: number;
  region: string;
  importOk: boolean;
}

// Changes that matter to a seller who already sent an offer, in the order they're listed.
export type RequestChange =
  | { field: 'budget'; from: number; to: number }
  | { field: 'years'; from: [number, number | null]; to: [number, number | null] }
  | { field: 'region'; from: string; to: string }
  | { field: 'import'; from: boolean; to: boolean };

export function requestChanges(before: EditableRequest, after: EditableRequest): RequestChange[] {
  const out: RequestChange[] = [];
  if (before.budgetUsd !== after.budgetUsd) {
    out.push({ field: 'budget', from: before.budgetUsd, to: after.budgetUsd });
  }
  if (before.yearFrom !== after.yearFrom || before.yearTo !== after.yearTo) {
    out.push({
      field: 'years',
      from: [before.yearFrom, before.yearTo],
      to: [after.yearFrom, after.yearTo],
    });
  }
  if (before.region !== after.region) {
    out.push({ field: 'region', from: before.region, to: after.region });
  }
  if (before.importOk !== after.importOk) {
    out.push({ field: 'import', from: before.importOk, to: after.importOk });
  }
  return out;
}

// Whether an edit can change which sellers the request is sent to.
export function alertTargetsChanged(before: AlertRequest, after: AlertRequest): boolean {
  return (
    before.region !== after.region ||
    before.importOk !== after.importOk ||
    [...before.sellerTypes].sort().join() !== [...after.sellerTypes].sort().join()
  );
}

// Edits in the last day, given the times of earlier edits.
export function editsInLastDay(times: readonly Date[], now: Date): number {
  return times.filter((t) => now.getTime() - t.getTime() < 24 * 60 * 60 * 1000).length;
}
