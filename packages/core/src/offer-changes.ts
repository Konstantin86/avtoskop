// What changed in an offer since the buyer last looked, shown as an "updated" note on the card.
export type OfferChange =
  | { kind: 'price'; from: number; to: number }
  | { kind: 'photos'; added: number }
  | { kind: 'arrived' }
  | { kind: 'details' };

// How long the buyer keeps seeing the "updated" note after first seeing it, so a reload
// right after (the page refreshes itself once for new offers) doesn't hide it.
export const UPDATE_NOTE_MINUTES = 10;

export interface OfferSnapshot {
  priceUsd: number;
  availability: string;
  etaWeeks: number | null;
  photoIds: readonly string[];
  // Every other field the buyer sees, in a fixed order, so any edit to them shows as "details".
  details: readonly unknown[];
}

export function diffOffer(before: OfferSnapshot, after: OfferSnapshot): OfferChange[] {
  const changes: OfferChange[] = [];
  if (before.priceUsd !== after.priceUsd) {
    changes.push({ kind: 'price', from: before.priceUsd, to: after.priceUsd });
  }
  const added = after.photoIds.filter((id) => !before.photoIds.includes(id)).length;
  if (added > 0) changes.push({ kind: 'photos', added });
  const arrived = before.availability !== 'in_ukraine' && after.availability === 'in_ukraine';
  if (arrived) changes.push({ kind: 'arrived' });
  const otherAvailability = before.availability !== after.availability && !arrived;
  // A car that arrived has no "weeks to Ukraine" any more; that is part of the arrival.
  const etaChanged = !arrived && before.etaWeeks !== after.etaWeeks;
  const detailsChanged = JSON.stringify(before.details) !== JSON.stringify(after.details);
  if (otherAvailability || etaChanged || detailsChanged) {
    changes.push({ kind: 'details' });
  }
  return changes;
}

// Adds new changes to the ones the buyer hasn't seen yet: a price keeps its first "from",
// photo counts add up, and a price that came back to where it was disappears.
export function mergeChanges(
  seen: readonly OfferChange[],
  next: readonly OfferChange[],
): OfferChange[] {
  const out = [...seen];
  for (const change of next) {
    const i = out.findIndex((c) => c.kind === change.kind);
    if (i === -1) {
      out.push(change);
      continue;
    }
    const prev = out[i]!;
    if (prev.kind === 'price' && change.kind === 'price') {
      out[i] = { kind: 'price', from: prev.from, to: change.to };
    } else if (prev.kind === 'photos' && change.kind === 'photos') {
      out[i] = { kind: 'photos', added: prev.added + change.added };
    }
  }
  return out.filter((c) => c.kind !== 'price' || c.from !== c.to);
}

// Changes worth a Telegram message besides a price drop, which has its own rule.
export function changesWorthAMessage(
  changes: readonly OfferChange[],
  photosBefore: number,
): Array<'arrived' | 'firstPhotos'> {
  const out: Array<'arrived' | 'firstPhotos'> = [];
  if (changes.some((c) => c.kind === 'arrived')) out.push('arrived');
  if (photosBefore === 0 && changes.some((c) => c.kind === 'photos')) out.push('firstPhotos');
  return out;
}
