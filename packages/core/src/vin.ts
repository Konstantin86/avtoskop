// VIN: the car's 17-character ID. Letters I, O and Q are never used.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLIT: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isVinFormatValid(vin: string): boolean {
  return VIN_RE.test(vin);
}

// The 9th character is a control digit only for cars built for North America
// (first character 1–5); European and Asian makers often don't use it.
export function usesCheckDigit(vin: string): boolean {
  return /^[1-5]/.test(vin);
}

export function vinCheckDigit(vin: string): string {
  const sum = [...vin].reduce((acc, ch, i) => {
    const value = /\d/.test(ch) ? Number(ch) : (TRANSLIT[ch] ?? 0);
    return acc + value * WEIGHTS[i]!;
  }, 0);
  const rest = sum % 11;
  return rest === 10 ? 'X' : String(rest);
}

export type VinProblem = 'format' | 'checkDigit';

export function vinProblem(vin: string): VinProblem | null {
  if (!isVinFormatValid(vin)) return 'format';
  if (usesCheckDigit(vin) && vinCheckDigit(vin) !== vin[8]) return 'checkDigit';
  return null;
}

export interface DecodedVin {
  make: string;
  model: string;
  year: number | null;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// Differences between what the seller wrote and what the VIN says.
export function vinMismatches(
  offer: { car: string; year: number },
  decoded: DecodedVin,
): Array<'make' | 'model' | 'year'> {
  const car = ` ${words(offer.car)} `;
  const found: Array<'make' | 'model' | 'year'> = [];
  if (decoded.make && !car.includes(` ${words(decoded.make).split(' ')[0]} `)) found.push('make');
  // Decoded models are often longer ("RAV4 Hybrid"); the first word is enough to compare.
  const model = words(decoded.model).split(' ')[0];
  if (model && !car.replace(/ /g, '').includes(model.replace(/ /g, ''))) found.push('model');
  if (decoded.year && Math.abs(decoded.year - offer.year) > 1) found.push('year');
  return found;
}

// Whether the make decoded from a VIN is the brand the buyer asked for. Brand names in our
// list can differ in form ("ВАЗ / Lada" vs "LADA"), so any shared word is enough.
export function makeMatchesBrand(make: string, brand: string): boolean {
  const makeWords = words(make).split(' ').filter(Boolean);
  if (makeWords.length === 0) return true;
  const brandWords = new Set(words(brand).split(' '));
  return (
    makeWords.some((w) => brandWords.has(w)) ||
    words(brand).replace(/ /g, '') === makeWords.join('')
  );
}
