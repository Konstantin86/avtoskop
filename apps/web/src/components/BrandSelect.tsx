import type { BrandOption } from '@/server/brands';

interface Props {
  id: string;
  brands: { popular: BrandOption[]; all: BrandOption[] };
  labels: { placeholder: string; popular: string; all: string };
  defaultValue?: string | undefined;
  invalid?: boolean;
}

export function BrandSelect({ id, brands, labels, defaultValue, invalid }: Props) {
  return (
    <select
      id={id}
      name="brandId"
      className="field"
      defaultValue={defaultValue ?? ''}
      aria-invalid={invalid || undefined}
      required
    >
      <option value="" disabled>
        {labels.placeholder}
      </option>
      <optgroup label={labels.popular}>
        {brands.popular.map((b) => (
          <option key={`p${b.id}`} value={b.id}>
            {b.name}
          </option>
        ))}
      </optgroup>
      <optgroup label={labels.all}>
        {brands.all.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
