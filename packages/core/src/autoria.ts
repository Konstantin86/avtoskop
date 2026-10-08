// Links to AUTO.RIA's public search with a buyer's request already filled in. Only a link:
// we neither fetch nor show AUTO.RIA data, which their terms limit (service agreement 2.19).
// The filter numbers are AUTO.RIA's own, read from their search page in October 2026.

const REGIONS: Record<string, number> = {
  vinnytsia: 1,
  zhytomyr: 2,
  ternopil: 3,
  khmelnytskyi: 4,
  lviv: 5,
  chernihiv: 6,
  kharkiv: 7,
  sumy: 8,
  rivne: 9,
  kyiv: 10,
  'kyiv-city': 10,
  dnipro: 11,
  odesa: 12,
  donetsk: 13,
  zaporizhzhia: 14,
  'ivano-frankivsk': 15,
  kirovohrad: 16,
  volyn: 18,
  mykolaiv: 19,
  poltava: 20,
  zakarpattia: 22,
  kherson: 23,
  cherkasy: 24,
  chernivtsi: 25,
};

const FUELS: Record<string, number[]> = {
  petrol: [1],
  diesel: [2],
  hybrid: [5, 10, 11, 12],
  electric: [6],
};

const GEARBOXES: Record<string, number[]> = {
  manual: [1],
  automatic: [2, 3, 4, 5],
};

export interface AutoriaSearch {
  brandAutoriaId: number;
  modelAutoriaId: number | null;
  yearFrom: number;
  yearTo: number | null;
  budgetUsd: number;
  region: string;
  fuels: readonly string[];
  gearbox: string;
  mileageMaxKm: number | null;
}

export function autoriaSearchUrl(s: AutoriaSearch): string {
  const q: [string, string | number][] = [
    ['indexName', 'auto'],
    ['categories.main.id', 1],
    ['brand.id[0]', s.brandAutoriaId],
  ];
  if (s.modelAutoriaId !== null) q.push(['model.id[0]', s.modelAutoriaId]);
  q.push(['year[0].gte', s.yearFrom]);
  if (s.yearTo !== null) q.push(['year[0].lte', s.yearTo]);
  q.push(['price.currency', 1], ['price.USD.lte', s.budgetUsd]);
  const region = REGIONS[s.region];
  if (region !== undefined) q.push(['region.id[0]', region]);
  s.fuels.flatMap((f) => FUELS[f] ?? []).forEach((id, i) => q.push([`fuel.id[${i}]`, id]));
  (GEARBOXES[s.gearbox] ?? []).forEach((id, i) => q.push([`gearbox.id[${i}]`, id]));
  // AUTO.RIA counts mileage in thousands of km.
  if (s.mileageMaxKm !== null) q.push(['mileage.lte', Math.floor(s.mileageMaxKm / 1000)]);
  // Brackets are encoded so chat apps don't cut the link short; AUTO.RIA reads both forms.
  const pair = ([k, v]: [string, string | number]) =>
    `${k.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}=${encodeURIComponent(v)}`;
  return `https://auto.ria.com/uk/search/?${q.map(pair).join('&')}`;
}
