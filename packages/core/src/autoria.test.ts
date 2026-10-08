import { describe, expect, it } from 'vitest';
import { autoriaSearchUrl as encoded, type AutoriaSearch } from './autoria.ts';

const autoriaSearchUrl = (s: AutoriaSearch) => decodeURIComponent(encoded(s));

const base = {
  brandAutoriaId: 79,
  modelAutoriaId: 715,
  yearFrom: 2020,
  yearTo: null,
  budgetUsd: 26000,
  region: 'all',
  fuels: [],
  gearbox: 'any',
  mileageMaxKm: null,
};

describe('autoriaSearchUrl', () => {
  it('encodes brackets so chat apps keep the whole link', () => {
    expect(encoded(base)).toContain('brand.id%5B0%5D=79');
    expect(encoded(base)).not.toContain('[');
  });

  it('fills brand, model, years and budget', () => {
    expect(autoriaSearchUrl(base)).toBe(
      'https://auto.ria.com/uk/search/?indexName=auto&categories.main.id=1&brand.id[0]=79&model.id[0]=715&year[0].gte=2020&price.currency=1&price.USD.lte=26000',
    );
  });

  it('adds region, fuels, gearbox and mileage in thousands of km', () => {
    const url = autoriaSearchUrl({
      ...base,
      yearTo: 2022,
      region: 'kyiv-city',
      fuels: ['hybrid', 'petrol'],
      gearbox: 'automatic',
      mileageMaxKm: 120500,
    });
    expect(url).toContain('year[0].lte=2022');
    expect(url).toContain('region.id[0]=10');
    expect(url).toContain('fuel.id[0]=5&fuel.id[1]=10&fuel.id[2]=11&fuel.id[3]=12&fuel.id[4]=1');
    expect(url).toContain('gearbox.id[0]=2&gearbox.id[1]=3');
    expect(url).toContain('mileage.lte=120');
  });

  it('searches the whole brand when the model is unknown, and all of Ukraine for unmapped regions', () => {
    const url = autoriaSearchUrl({ ...base, modelAutoriaId: null, region: 'luhansk' });
    expect(url).not.toContain('model.id');
    expect(url).not.toContain('region.id');
  });
});
