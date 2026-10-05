'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SELLER_TYPES, SOURCE_COUNTRIES } from '@avtoskop/core';
import { MultiSelect, type Option } from '@/components/MultiSelect';
import { RegionSelect } from '@/components/RegionSelect';
import { saveProfileAction, type FormState } from '../actions';
import styles from '../forms.module.css';

interface Props {
  defaults: Record<string, string>;
  regionNames: Record<string, string>;
  returnTo: string;
  brands: Option[];
}

export function ProfileForm({ defaults, regionNames, returnTo, brands }: Props) {
  const t = useTranslations('profile');
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfileAction, {
    errors: [],
    values: defaults,
  });
  const v = state.values;
  const [type, setType] = useState(v['type'] ?? 'importer');
  const bad = (name: string) => state.errors.includes(name);
  const list = (name: string) => (v[name] ?? '').split(',').filter(Boolean);
  const regionOptions = Object.entries(regionNames)
    .filter(([code]) => code !== 'all')
    .map(([value, label]) => ({ value, label }));
  const err = (name: string) =>
    bad(name) ? <span className="error-text">{t(`error_${name}` as 'error_name')}</span> : null;

  return (
    <form action={action} className={`card ${styles.formCard}`} key={JSON.stringify(v)} noValidate>
      <input type="hidden" name="return" value={returnTo} />
      {state.formError && (
        <div className={styles.alert} role="alert">
          {t('error_generic')}
        </div>
      )}
      <div className="label">
        <span id="type-label">{t('type')}</span>
        <div className="segment" role="radiogroup" aria-labelledby="type-label">
          {SELLER_TYPES.map((st) => (
            <label key={st}>
              <input
                type="radio"
                name="type"
                value={st}
                defaultChecked={type === st}
                onChange={() => setType(st)}
              />
              <span>{t(`type_${st}`)}</span>
            </label>
          ))}
        </div>
        {err('type')}
      </div>
      <label className="label">
        {t('name')}
        <input
          name="name"
          className="field"
          defaultValue={v['name']}
          placeholder={t('namePlaceholder')}
          maxLength={80}
          aria-invalid={bad('name') || undefined}
        />
        {err('name')}
      </label>
      <label className="label" htmlFor="region">
        {t('region')}
        <RegionSelect
          id="region"
          names={regionNames}
          defaultValue={v['region']}
          invalid={bad('region')}
        />
        {err('region')}
      </label>
      {type === 'importer' && (
        <fieldset className="label" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ padding: 0, marginBottom: 6 }}>{t('countries')}</legend>
          <div className="choices">
            {SOURCE_COUNTRIES.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  name="countries"
                  value={c}
                  defaultChecked={(v['countries'] ?? '').split(',').includes(c)}
                />
                <span>{t(`country_${c}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="label">
        {t('about')}
        <textarea
          name="about"
          className="field"
          defaultValue={v['about']}
          placeholder={t('aboutPlaceholder')}
          maxLength={500}
        />
      </label>
      <fieldset className={styles.alertsBox}>
        <legend>{t('alertsTitle')}</legend>
        <p className="hint">{t('alertsLead')}</p>
        <label className="label" htmlFor="brandIds">
          {t('alertBrands')}
          <MultiSelect
            id="brandIds"
            name="brandIds"
            options={brands}
            defaultValues={list('brandIds')}
            placeholder={t('addBrand')}
            emptyLabel={t('allBrands')}
            removeLabel={t('remove')}
          />
        </label>
        <label className="label" htmlFor="serviceRegions">
          {t('alertRegions')}
          <MultiSelect
            id="serviceRegions"
            name="serviceRegions"
            options={regionOptions}
            defaultValues={list('serviceRegions')}
            placeholder={t('addRegion')}
            emptyLabel={t('allRegions')}
            removeLabel={t('remove')}
          />
        </label>
        <label className={styles.checkRow}>
          <input type="checkbox" name="alerts" defaultChecked={v['alerts'] === 'on'} />
          <span>{t('alertsOn')}</span>
        </label>
      </fieldset>
      <button type="submit" className="btn btn-yellow btn-lg btn-block" disabled={pending}>
        {pending ? t('saving') : t('save')}
      </button>
    </form>
  );
}
