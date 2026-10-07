'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFocusFirstError } from '@/components/useFocusFirstError';
import { FUELS, GEARBOXES, localePath, WISHES } from '@avtoskop/core';
import { BrandPicker } from '@/components/BrandPicker';
import { ModelInput } from '@/components/ModelInput';
import { PhoneInput } from '@/components/PhoneInput';
import { TelegramIcon } from '@/components/icons';
import { RegionSelect } from '@/components/RegionSelect';
import type { BrandOption } from '@/server/brands';
import { submitRequest, type RequestFormState } from './actions';
import styles from './request.module.css';

interface Props {
  locale: string;
  brands: { popular: BrandOption[]; all: BrandOption[] };
  regionNames: Record<string, string>;
  defaults: Record<string, string>;
}

export function RequestForm({ locale, brands, regionNames, defaults }: Props) {
  const f = useTranslations('fields');
  const t = useTranslations('request');
  const [state, action, pending] = useActionState<RequestFormState, FormData>(submitRequest, {
    errors: [],
    values: defaults,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state, Boolean(state.formError) || state.errors.length > 0);

  const v = state.values;
  const [brandId, setBrandId] = useState(v['brandId'] ?? '');
  const bad = (name: string) => state.errors.includes(name);
  const err = (name: string) =>
    bad(name) ? (
      <span className="error-text" id={`${name}-error`}>
        {t(`error_${name}` as 'error_phone')}
      </span>
    ) : null;
  const invalid = (name: string) =>
    bad(name) ? { 'aria-invalid': true as const, 'aria-describedby': `${name}-error` } : {};

  return (
    <form
      ref={formRef}
      id="request-form"
      action={action}
      className={`card ${styles.form}`}
      key={JSON.stringify(v)}
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />
      {state.formError && (
        <div className={styles.alert} role="alert">
          {t(`error_${state.formError}`)}
        </div>
      )}

      <fieldset className={styles.section}>
        <legend className="section-label">{t('sectionCar')}</legend>
        <div className={styles.pair}>
          <label className="label" htmlFor="brandId">
            {f('brand')}
            <BrandPicker
              id="brandId"
              brands={brands}
              labels={{
                placeholder: f('brandPlaceholder'),
                popular: f('popularBrands'),
                all: f('allBrands'),
                noMatches: f('brandNoMatches'),
              }}
              defaultValue={v['brandId']}
              invalid={bad('brandId')}
              onChange={setBrandId}
            />
            {err('brandId')}
          </label>
          <label className="label">
            {f('model')}
            <ModelInput
              brandId={brandId}
              defaultValue={v['model']}
              placeholder={f('modelPlaceholder')}
              invalid={bad('model') || bad('modelUnknown')}
              unknownLabel={t('error_modelUnknown')}
              noMatchesLabel={f('modelNoMatches')}
            />
            {err('model') ?? err('modelUnknown')}
          </label>
        </div>
        <div className={styles.pair}>
          <label className="label">
            {f('yearFrom')}
            <input
              name="yearFrom"
              className="field"
              inputMode="numeric"
              defaultValue={v['yearFrom']}
              {...invalid('yearFrom')}
            />
            {err('yearFrom')}
          </label>
          <label className="label">
            {f('yearTo')}
            <input
              name="yearTo"
              className="field"
              inputMode="numeric"
              defaultValue={v['yearTo']}
              placeholder={f('any')}
              {...invalid('yearTo')}
            />
            {err('yearTo')}
          </label>
        </div>
        <fieldset className="label" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ padding: 0, marginBottom: 6 }}>{f('fuel')}</legend>
          <div className="choices">
            {FUELS.map((fuel) => (
              <label key={fuel}>
                <input
                  type="checkbox"
                  name="fuels"
                  value={fuel}
                  defaultChecked={(v['fuels'] ?? '').split(',').includes(fuel)}
                />
                <span>{f(`fuel_${fuel}`)}</span>
              </label>
            ))}
          </div>
          {err('fuels') ?? <span className="hint">{f('fuelsHint')}</span>}
        </fieldset>
        <div className="label">
          <span id="gearbox-label">{f('gearbox')}</span>
          <div className="segment" role="radiogroup" aria-labelledby="gearbox-label">
            {GEARBOXES.map((g) => (
              <label key={g}>
                <input
                  type="radio"
                  name="gearbox"
                  value={g}
                  defaultChecked={(v['gearbox'] ?? 'any') === g}
                />
                <span>{f(`gearbox_${g}`)}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className="section-label">{t('sectionBudget')}</legend>
        <div className={styles.pair}>
          <label className="label">
            {f('budget')}
            <input
              name="budgetUsd"
              className="field"
              inputMode="numeric"
              defaultValue={v['budgetUsd']}
              placeholder="28000"
              {...invalid('budgetUsd')}
            />
            {err('budgetUsd')}
          </label>
          <label className="label">
            {f('mileageMax')}
            <input
              name="mileageMaxKm"
              className="field"
              inputMode="numeric"
              defaultValue={v['mileageMaxKm']}
              placeholder="100000"
              {...invalid('mileageMaxKm')}
            />
            {err('mileageMaxKm')}
          </label>
        </div>
        <label className="label" htmlFor="region">
          {f('region')}
          <RegionSelect
            id="region"
            names={regionNames}
            defaultValue={v['region']}
            invalid={bad('region')}
          />
          {err('region')}
        </label>
        <div className="label">
          <span id="import-label">{f('import')}</span>
          <div className="segment" role="radiogroup" aria-labelledby="import-label">
            <label>
              <input
                type="radio"
                name="importOk"
                value="true"
                defaultChecked={v['importOk'] !== 'false'}
              />
              <span>{f('importYes')}</span>
            </label>
            <label>
              <input
                type="radio"
                name="importOk"
                value="false"
                defaultChecked={v['importOk'] === 'false'}
              />
              <span>{f('importNo')}</span>
            </label>
          </div>
        </div>
        <fieldset className="label" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ padding: 0, marginBottom: 6 }}>{f('wishes')}</legend>
          <div className="choices">
            {WISHES.map((w) => (
              <label key={w}>
                <input
                  type="checkbox"
                  name="wishes"
                  value={w}
                  defaultChecked={(v['wishes'] ?? '').split(',').includes(w)}
                />
                <span>{f(`wish_${w}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="label">
          {f('notes')}
          <textarea
            name="notes"
            className="field"
            defaultValue={v['notes']}
            placeholder={f('notesPlaceholder')}
            maxLength={500}
          />
        </label>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className="section-label">{t('sectionContact')}</legend>
        <label className="label">
          {f('phone')}
          <PhoneInput defaultValue={v['phone']} invalid={bad('phone')} />
          {err('phone') ?? <span className="hint">{f('phoneHint')}</span>}
        </label>
        {/* Telegram is the only channel for now: the buyer confirms the phone through our bot. */}
        <input type="hidden" name="notifyVia" value="telegram" />
        <p className={styles.notifyNote}>
          <TelegramIcon />
          <span>{f('notifyNote')}</span>
        </p>
        <label className={styles.consent}>
          <input
            type="checkbox"
            name="consent"
            defaultChecked={v['consent'] === 'on'}
            {...invalid('consent')}
          />
          <span>
            {f.rich('consent', {
              terms: (c) => (
                <a href={localePath(locale, '/terms')} target="_blank" rel="noopener">
                  {c}
                </a>
              ),
              privacy: (c) => (
                <a href={localePath(locale, '/privacy')} target="_blank" rel="noopener">
                  {c}
                </a>
              ),
            })}
          </span>
        </label>
        {err('consent')}
      </fieldset>

      <button type="submit" className="btn btn-yellow btn-lg btn-block" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
