'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AVAILABILITY, OFFER_FEATURES, SOURCE_COUNTRIES, WISHES } from '@avtoskop/core';
import { saveOfferAction, type FormState } from '../../../sellers/actions';
import styles from '../../../sellers/forms.module.css';

interface Props {
  requestId: string;
  defaults: Record<string, string>;
  isUpdate: boolean;
  buyerWishes: string[];
}

export function OfferForm({ requestId, defaults, isUpdate, buyerWishes }: Props) {
  const t = useTranslations('offer');
  const p = useTranslations('profile');
  const fields = useTranslations('fields');
  const [state, action, pending] = useActionState<FormState, FormData>(saveOfferAction, {
    errors: [],
    values: defaults,
  });
  const v = state.values;
  const [availability, setAvailability] = useState(v['availability'] ?? 'in_ukraine');
  const bad = (name: string) => state.errors.includes(name);
  const err = (name: string) =>
    bad(name) ? <span className="error-text">{t(`error_${name}` as 'error_car')}</span> : null;
  const invalid = (name: string) => (bad(name) ? { 'aria-invalid': true as const } : {});

  return (
    <form action={action} className={`card ${styles.formCard}`} key={JSON.stringify(v)} noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      {state.formError && (
        <div className={styles.alert} role="alert">
          {t(`error_${state.formError}` as 'error_generic')}
        </div>
      )}
      <label className="label">
        {t('car')}
        <input
          name="car"
          className="field"
          defaultValue={v['car']}
          maxLength={80}
          {...invalid('car')}
        />
        {err('car') ?? <span className="hint">{t('carHint')}</span>}
      </label>
      <div className={styles.triple}>
        <label className="label">
          {t('year')}
          <input
            name="year"
            className="field"
            inputMode="numeric"
            defaultValue={v['year']}
            {...invalid('year')}
          />
          {err('year')}
        </label>
        <label className="label">
          {t('mileage')}
          <input
            name="mileageKm"
            className="field"
            inputMode="numeric"
            defaultValue={v['mileageKm']}
            {...invalid('mileageKm')}
          />
          {err('mileageKm')}
        </label>
        <label className="label">
          {t('price')}
          <input
            name="priceUsd"
            className="field"
            inputMode="numeric"
            defaultValue={v['priceUsd']}
            {...invalid('priceUsd')}
          />
          {err('priceUsd')}
        </label>
      </div>
      <span className="hint">{t('priceHint')}</span>

      <div className="label">
        <span id="availability-label">{t('availability')}</span>
        <div className="segment" role="radiogroup" aria-labelledby="availability-label">
          {AVAILABILITY.map((a) => (
            <label key={a}>
              <input
                type="radio"
                name="availability"
                value={a}
                defaultChecked={availability === a}
                onChange={() => setAvailability(a)}
              />
              <span>{t(`availability_${a}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.pair}>
        {availability !== 'in_ukraine' && (
          <label className="label">
            {t('eta')}
            <input
              name="etaWeeks"
              className="field"
              inputMode="numeric"
              defaultValue={v['etaWeeks']}
              {...invalid('etaWeeks')}
            />
            {err('etaWeeks')}
          </label>
        )}
        <label className="label">
          {t('origin')}
          <select name="originCountry" className="field" defaultValue={v['originCountry'] ?? ''}>
            <option value="">{t('originNone')}</option>
            <option value="ua">{t('origin_ua')}</option>
            {SOURCE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {p(`country_${c}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="label">
        {t('link')}
        <input
          name="link"
          type="url"
          className="field"
          defaultValue={v['link']}
          placeholder="https://"
          {...invalid('link')}
        />
        {err('link') ?? <span className="hint">{t('linkHint')}</span>}
      </label>
      <fieldset className="label" style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ padding: 0, marginBottom: 6 }}>{t('features')}</legend>
        <div className="choices">
          {OFFER_FEATURES.map((feature) => (
            <label key={feature}>
              <input
                type="checkbox"
                name="features"
                value={feature}
                defaultChecked={(v['features'] ?? '').split(',').includes(feature)}
              />
              <span>
                {(WISHES as readonly string[]).includes(feature)
                  ? fields(`wish_${feature}` as 'wish_awd')
                  : t(`feature_${feature}` as 'feature_warranty')}
                {buyerWishes.includes(feature) && (
                  <small className={styles.asked}>{t('buyerAsked')}</small>
                )}
              </span>
            </label>
          ))}
        </div>
        <span className="hint">{t('featuresHint')}</span>
      </fieldset>
      <label className="label">
        {t('description')}
        <textarea
          name="description"
          className="field"
          defaultValue={v['description']}
          placeholder={t('descriptionPlaceholder')}
          maxLength={1000}
        />
      </label>
      <button type="submit" className="btn btn-yellow btn-lg btn-block" disabled={pending}>
        {pending ? t('submitting') : isUpdate ? t('update') : t('submit')}
      </button>
      <span className="hint" style={{ textAlign: 'center' }}>
        {t('rules')}
      </span>
    </form>
  );
}
