'use client';

import { useState } from 'react';
import type { BrandOption } from '@/server/brands';
import { BrandSelect } from './BrandSelect';
import { ModelInput } from './ModelInput';

interface Props {
  idPrefix: string;
  brands: { popular: BrandOption[]; all: BrandOption[] };
  labels: {
    brand: string;
    model: string;
    brandPlaceholder: string;
    modelPlaceholder: string;
    popular: string;
    all: string;
  };
}

// Brand and model fields for simple forms; the model field suggests the chosen brand's models.
export function BrandModelFields({ idPrefix, brands, labels }: Props) {
  const [brandId, setBrandId] = useState('');
  return (
    <>
      <label className="label" htmlFor={`${idPrefix}-brand`}>
        {labels.brand}
        <BrandSelect
          id={`${idPrefix}-brand`}
          brands={brands}
          labels={{
            placeholder: labels.brandPlaceholder,
            popular: labels.popular,
            all: labels.all,
          }}
          onChange={setBrandId}
        />
      </label>
      <label className="label">
        {labels.model}
        <ModelInput
          brandId={brandId}
          listId={`${idPrefix}-models`}
          placeholder={labels.modelPlaceholder}
        />
      </label>
    </>
  );
}
