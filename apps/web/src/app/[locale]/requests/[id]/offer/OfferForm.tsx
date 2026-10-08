'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFocusFirstError } from '@/components/useFocusFirstError';
import { AVAILABILITY, OFFER_FEATURES, SOURCE_COUNTRIES, WISHES } from '@avtoskop/core';
import { PhotoPicker, type PickedPhoto } from '@/components/PhotoPicker';
import type { OfferTemplate } from '@/server/offers';
import { saveOfferAction, type FormState } from '../../../sellers/actions';
import styles from '../../../sellers/forms.module.css';

const PRICE_PARTS = [
  'priceCarUsd',
  'priceDeliveryUsd',
  'priceCustomsUsd',
  'priceRepairUsd',
  'serviceFeeUsd',
] as const;

interface Props {
  requestId: string;
  defaults: Record<string, string>;
  isUpdate: boolean;
  buyerWishes: string[];
  templates: OfferTemplate[];
  initialPhotos: { id: string; thumb: string }[];
}

export function OfferForm({
  requestId,
  defaults,
  isUpdate,
  buyerWishes,
  templates,
  initialPhotos,
}: Props) {
  const t = useTranslations('offer');
  const fields = useTranslations('fields');
  const [state, action, pending] = useActionState<FormState, FormData>(saveOfferAction, {
    errors: [],
    values: defaults,
  });
  const formRef = useRef<HTMLFormElement>(null);
  // Kept outside the form element, which is re-created after each submit.
  const [photos, setPhotos] = useState<PickedPhoto[]>(() =>
    initialPhotos.map((p) => ({ ...p, progress: 1, error: null })),
  );
  const uploading = photos.some((p) => !p.thumb && !p.error);
  useFocusFirstError(formRef, state, Boolean(state.formError) || state.errors.length > 0);
  // A copied offer fills the form until the next submit; after that the server's values win.
  const [copied, setCopied] = useState<{ values: Record<string, string>; for: FormState } | null>(
    null,
  );
  const v = copied && copied.for === state ? copied.values : state.values;
  const [availability, setAvailability] = useState(v['availability'] ?? 'in_ukraine');
  const order = availability === 'to_order';
  const bad = (name: string) => state.errors.includes(name);
  const details = ['mileageKm', 'originCountry', 'link', 'features', 'vin', 'description'];
  const detailsOpen = details.some((name) => bad(name) || Boolean(v[name]));
  // The price split stays a single link until the seller asks for it or already filled it in.
  const [splitAsked, setSplitAsked] = useState(false);
  const splitOpen = splitAsked || bad('breakdown') || PRICE_PARTS.some((name) => Boolean(v[name]));
  const err = (name: string) =>
    bad(name) ? <span className="error-text">{t(`error_${name}` as 'error_car')}</span> : null;
  const invalid = (name: string) => (bad(name) ? { 'aria-invalid': true as const } : {});

  return (
    <form
      ref={formRef}
      action={action}
      className={`card ${styles.formCard}`}
      key={JSON.stringify(v)}
      noValidate
    >
      <input type="hidden" name="requestId" value={requestId} />
      {templates.length > 0 && (
        <label className="label">
          {t('copyFrom')}
          <select
            className="field"
            value=""
            onChange={(e) => {
              const template = templates[Number(e.target.value)];
              if (!template) return;
              setCopied({ values: template.values, for: state });
              setAvailability(template.values['availability'] ?? 'in_ukraine');
            }}
          >
            <option value="">{t('copyPick')}</option>
            {templates.map((template, i) => (
              <option key={template.label} value={i}>
                {template.label}
              </option>
            ))}
          </select>
          <span className="hint">{t('copyHint')}</span>
        </label>
      )}
      <input type="hidden" name="vinConfirmed" value={v['vinConfirmed'] ?? ''} />
      {state.formError && (
        <div className={styles.alert} role="alert">
          {state.formError === 'vinMismatch'
            ? t('error_vinMismatch', { car: v['vinCar'] ?? '' })
            : t(`error_${state.formError}` as 'error_generic')}
        </div>
      )}
      <div className="label">
        <span id="kind-label">{t('kind')}</span>
        <div className="segment" role="radiogroup" aria-labelledby="kind-label">
          <label>
            <input
              type="radio"
              name="kind"
              checked={!order}
              onChange={() => setAvailability('in_ukraine')}
            />
            <span>{t('kind_car')}</span>
          </label>
          <label>
            <input
              type="radio"
              name="kind"
              checked={order}
              onChange={() => setAvailability('to_order')}
            />
            <span>{t('kind_order')}</span>
          </label>
        </div>
        <span className="hint">{order ? t('kindHint_order') : t('kindHint_car')}</span>
      </div>
      {order && <input type="hidden" name="availability" value="to_order" />}

      <label className="label">
        {order ? t('carOrder') : t('car')}
        <input
          name="car"
          className="field"
          defaultValue={v['car']}
          maxLength={80}
          {...invalid('car')}
        />
        {err('car') ?? <span className="hint">{t('carHint')}</span>}
      </label>
      <div className={order ? styles.triple : styles.pair}>
        <label className="label">
          {order ? t('yearOrder') : t('year')}
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
          {order ? t('priceFrom') : t('price')}
          <input
            name="priceUsd"
            className="field"
            inputMode="numeric"
            defaultValue={v['priceUsd']}
            {...invalid('priceUsd')}
          />
          {err('priceUsd')}
        </label>
        {order && (
          <label className="label">
            {t('priceTo')}
            <input
              name="priceMaxUsd"
              className="field"
              inputMode="numeric"
              defaultValue={v['priceMaxUsd']}
              placeholder={t('optional')}
              {...invalid('priceMaxUsd')}
            />
            {err('priceMaxUsd')}
          </label>
        )}
      </div>
      <span className="hint">{order ? t('priceHintOrder') : t('priceHint')}</span>
      {splitOpen ? (
        <fieldset className={styles.split}>
          <legend className={styles.splitLegend}>{t('splitTitle')}</legend>
          <div className={styles.splitGrid}>
            {PRICE_PARTS.map((name) => (
              <label key={name} className="label">
                {t(`split_${name}`)}
                <input
                  name={name}
                  className="field"
                  inputMode="numeric"
                  defaultValue={v[name]}
                  {...invalid('breakdown')}
                />
              </label>
            ))}
          </div>
          {err('breakdown') ?? <span className="hint">{t('splitHint')}</span>}
        </fieldset>
      ) : (
        <button type="button" className={styles.splitToggle} onClick={() => setSplitAsked(true)}>
          + {t('splitAdd')}
        </button>
      )}

      {!order && (
        <div className="label">
          <span id="availability-label">{t('availability')}</span>
          <div className="segment" role="radiogroup" aria-labelledby="availability-label">
            {AVAILABILITY.filter((a) => a !== 'to_order').map((a) => (
              <label key={a}>
                <input
                  type="radio"
                  name="availability"
                  value={a}
                  checked={availability === a}
                  onChange={() => setAvailability(a)}
                />
                <span>{t(`availability_${a}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {availability !== 'in_ukraine' && (
        <label className="label">
          {order ? t('etaOrder') : t('eta')}
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

      <PhotoPicker
        photos={photos}
        onChange={setPhotos}
        labels={{
          title: t('photos'),
          hint: t('photosHint'),
          add: t('photosAdd'),
          drop: t('photosDrop'),
          main: t('photosMain'),
          makeMain: t('photosMakeMain'),
          remove: t('photosRemove'),
          errors: {
            notImage: t('photoError_notImage'),
            tooBig: t('photoError_tooBig'),
            tooMany: t('photoError_tooMany'),
            failed: t('photoError_failed'),
            auth: t('photoError_failed'),
          },
        }}
      />

      {/* Only the fields above are required; the rest stays folded so an offer takes a minute. */}
      <details className={styles.more} open={detailsOpen}>
        <summary className={styles.moreSummary}>
          <span>{t('more')}</span>
          <span className="hint">{order ? t('moreHintOrder') : t('moreHint')}</span>
        </summary>
        <div className={styles.moreBody}>
          <div className={styles.pair}>
            <label className="label">
              {order ? t('mileageMax') : t('mileage')}
              <input
                name="mileageKm"
                className="field"
                inputMode="numeric"
                defaultValue={v['mileageKm']}
                {...invalid('mileageKm')}
              />
              {err('mileageKm')}
            </label>
            <OriginSelect value={v['originCountry']} />
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
            {err('link') ?? (
              <span className="hint">{order ? t('linkHintOrder') : t('linkHint')}</span>
            )}
          </label>
          <fieldset className="label" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend style={{ padding: 0, marginBottom: 6 }}>
              {order ? t('featuresOrder') : t('features')}
            </legend>
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
          {!order && (
            <label className="label">
              {t('vin')}
              <input
                name="vin"
                className="field"
                defaultValue={v['vin']}
                maxLength={25}
                autoCapitalize="characters"
                spellCheck={false}
                {...invalid('vin')}
              />
              {err('vin') ?? <span className="hint">{t('vinHint')}</span>}
            </label>
          )}
          <label className="label">
            {t('description')}
            <textarea
              name="description"
              className="field"
              defaultValue={v['description']}
              placeholder={order ? t('descriptionPlaceholderOrder') : t('descriptionPlaceholder')}
              maxLength={1000}
            />
          </label>
        </div>
      </details>

      {isUpdate && <p className={styles.updateNote}>{t('updateNote')}</p>}
      <button
        type="submit"
        className="btn btn-yellow btn-lg btn-block"
        disabled={pending || uploading}
      >
        {uploading
          ? t('photosUploading')
          : pending
            ? t('submitting')
            : isUpdate
              ? t('update')
              : t('submit')}
      </button>
      <span className="hint" style={{ textAlign: 'center' }}>
        {t('rules')}
      </span>
    </form>
  );
}

function OriginSelect({ value }: { value: string | undefined }) {
  const t = useTranslations('offer');
  const p = useTranslations('profile');
  return (
    <label className="label">
      {t('origin')}
      <select name="originCountry" className="field" defaultValue={value ?? ''}>
        <option value="">{t('originNone')}</option>
        <option value="ua">{t('origin_ua')}</option>
        {SOURCE_COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {p(`country_${c}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
