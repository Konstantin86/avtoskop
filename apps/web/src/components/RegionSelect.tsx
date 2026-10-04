import { REGION_CODES } from '@avtoskop/core';

interface Props {
  id: string;
  names: Record<string, string>;
  defaultValue?: string | undefined;
  invalid?: boolean;
}

export function RegionSelect({ id, names, defaultValue, invalid }: Props) {
  const ordered = [
    'all',
    'kyiv-city',
    ...REGION_CODES.filter((c) => c !== 'all' && c !== 'kyiv-city'),
  ];
  return (
    <select
      id={id}
      name="region"
      className="field"
      defaultValue={defaultValue ?? 'kyiv'}
      aria-invalid={invalid || undefined}
    >
      {ordered.map((code) => (
        <option key={code} value={code}>
          {names[code]}
        </option>
      ))}
    </select>
  );
}
