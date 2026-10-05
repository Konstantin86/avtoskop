import { describe, expect, it } from 'vitest';
import { normalizeVin, vinCheckDigit, vinMismatches, vinProblem } from './vin.ts';

describe('vinProblem', () => {
  it('accepts valid VINs, with and without a control digit', () => {
    expect(vinProblem('1M8GDM9AXKP042788')).toBeNull(); // US, control digit X
    expect(vinProblem('1HGCM82633A004352')).toBeNull(); // US, control digit 3
    expect(vinProblem('WVWZZZ1KZAW000001')).toBeNull(); // German, no control digit
  });

  it('rejects wrong length, banned letters and a wrong control digit', () => {
    expect(vinProblem('1HGCM82633A00435')).toBe('format');
    expect(vinProblem('1HGCM82633A0O4352')).toBe('format');
    expect(vinProblem('1HGCM82643A004352')).toBe('checkDigit');
  });

  it('computes the control digit', () => {
    expect(vinCheckDigit('1M8GDM9AXKP042788')).toBe('X');
  });
});

describe('normalizeVin', () => {
  it('removes spaces and dashes and uppercases', () => {
    expect(normalizeVin(' 1hgcm-82633 a004352 ')).toBe('1HGCM82633A004352');
  });
});

describe('vinMismatches', () => {
  const decoded = { make: 'TOYOTA', model: 'RAV4', year: 2021 };

  it('finds nothing when the offer matches the VIN', () => {
    expect(vinMismatches({ car: 'Toyota RAV4 Hybrid XLE', year: 2021 }, decoded)).toEqual([]);
    expect(vinMismatches({ car: 'Toyota RAV 4', year: 2022 }, decoded)).toEqual([]);
  });

  it('reports a different make, model or year', () => {
    expect(vinMismatches({ car: 'Toyota Camry', year: 2019 }, decoded)).toEqual(['model', 'year']);
    expect(vinMismatches({ car: 'Lexus NX', year: 2021 }, decoded)).toEqual(['make', 'model']);
  });
});
