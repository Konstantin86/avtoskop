'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFocusFirstError } from '@/components/useFocusFirstError';
import { CONDITIONS, FUELS, GEARBOXES, localePath, WISHES } from '@avtoskop/core';
import { BrandPicker } from '@/components/BrandPicker';
import { ModelInput } from '@/components/ModelInput';
import { CheckIcon, TelegramIcon } from '@/components/icons';
import { RegionSelect } from '@/components/RegionSelect';
import type { BrandOption } from '@/server/brands';
import { submitRequest, updateRequestAction, type RequestFormState } from './actions';
import styles from './request.module.css';

interface Props {
  locale: string;
  brands: { popular: BrandOption[]; all: BrandOption[] };
  regionNames: Record<string, string>;
  defaults: Record<string, string>;
  // Editing an existing request: its private key and the car, which can't change.
  edit?: { key: string; car: string };
}

export function RequestForm({ locale, brands, regionNames, defaults, edit }: Props) {
  const f = useTranslations('fields');
  const t = useTranslations('request');
  const [state, action, pending] = useActionState<RequestFormState, FormData>(
    edit ? updateRequestAction : submitRequest,
    {
      errors: [],
      values: defaults,
    },
  );
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state, Boolean(state.formError) || state.errors.length > 0);

  const v = state.values;
  const [brandId, setBrandId] = useState(v['brandId'] ?? '');
  const reach = useSellerReach(formRef, brandId);
  const brandName = brands.all.find((b) => String(b.id) === brandId)?.name;
  const [condition, setCondition] = useState(v['condition'] ?? 'any');
  // A new car usually comes from an importer or a dealer, and is from this year: preset both,
  // but the buyer can still change them. The seller-type boxes sit outside the form element.
  function chooseCondition(c: string) {
    setCondition(c);
    if (c !== 'new' || !formRef.current) return;
    for (const box of document.querySelectorAll<HTMLInputElement>(
      'input[name="sellerTypes"][form="request-form"]',
    )) {
      const want = box.value === 'importer' || box.value === 'dealer';
      if (box.checked !== want) {
        box.checked = want;
        box.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const yearFrom = formRef.current.elements.namedItem('yearFrom') as HTMLInputElement | null;
    if (yearFrom && !yearFrom.value) yearFrom.value = String(new Date().getFullYear());
  }
  const bad = (name: string) => state.errors.includes(name);
  const optional = ['fuels', 'gearbox', 'mileageMaxKm', 'wishes', 'notes'];
  const moreOpen =
    optional.some((name) => bad(name)) ||
    Boolean(v['fuels'] || v['mileageMaxKm'] || v['wishes'] || v['notes']) ||
    (v['gearbox'] ?? 'any') !== 'any';
  const err = (name: string) =>
    bad(name) ? (
      <span className="error-text" id={`${name}-error`}>
        {t(`error_${name}` as 'error_brandId')}
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
      {edit && <input type="hidden" name="key" value={edit.key} />}
      {state.formError && (
        <div className={styles.alert} role="alert">
          {t(`error_${state.formError}`)}
        </div>
      )}

      <fieldset className={styles.section}>
        <legend className="section-label">{t('sectionCar')}</legend>
        {edit ? (
          <div className={styles.lockedCar}>
            <strong>{edit.car}</strong>
            <span className="hint">{t('editCarHint')}</span>
          </div>
        ) : (
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
                placeholders={{
                  none: f('modelPlaceholder'),
                  pick: f('modelPick'),
                  type: f('modelType'),
                }}
                invalid={bad('model') || bad('modelUnknown')}
                unknownLabel={t('error_modelUnknown')}
                noMatchesLabel={f('modelNoMatches')}
              />
              {err('model') ?? err('modelUnknown')}
            </label>
          </div>
        )}
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
        <div className="label">
          <span id="condition-label">{f('condition')}</span>
          <div className="segment" role="radiogroup" aria-labelledby="condition-label">
            {CONDITIONS.map((c) => (
              <label key={c}>
                <input
                  type="radio"
                  name="condition"
                  value={c}
                  checked={condition === c}
                  onChange={() => chooseCondition(c)}
                />
                <span>{f(`condition_${c}`)}</span>
              </label>
            ))}
          </div>
          {condition === 'new' && <span className="hint">{t('conditionNewHint')}</span>}
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
        </div>
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
      </fieldset>

      {/* Optional details stay folded so the form looks short; they open when filled or invalid. */}
      <details className={styles.more} open={moreOpen}>
        <summary className={styles.moreSummary}>
          <span>{t('moreParams')}</span>
          <span className="hint">{t('moreHint')}</span>
        </summary>
        <div className={styles.moreBody}>
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
          {condition !== 'new' && (
            <div className={styles.pair}>
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
          )}
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
        </div>
      </details>

      {!edit && (
        <fieldset className={styles.section}>
          <legend className="section-label">{t('sectionContact')}</legend>
          {/* Telegram is the only channel for now: the buyer confirms the phone through our bot. */}
          <input type="hidden" name="notifyVia" value="telegram" />
          <p className={styles.notifyNote}>
            <TelegramIcon />
            <span>
              {f('notifyNote')} {/* New tab, so a half-filled form isn't lost. */}
              <a href={localePath(locale, '/faq#telegram')} target="_blank" rel="noopener">
                {t('whyTelegram')}
              </a>
            </span>
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
      )}

      {reach.count > 0 && brandName && (
        <p className={styles.reach} role="status">
          <CheckIcon />
          {t('reach', {
            count: reach.count,
            brand: brandName,
            all: reach.allRegions ? 'yes' : 'no',
          })}
        </p>
      )}
      <button type="submit" className="btn btn-yellow btn-lg btn-block" disabled={pending}>
        {edit ? (pending ? t('saving') : t('save')) : pending ? t('submitting') : t('submit')}
      </button>
      {!edit && <p className={styles.publicNote}>{t('publicNote')}</p>}
    </form>
  );
}

// Asks how many sellers this request would reach, whenever a field that matters changes.
function useSellerReach(form: React.RefObject<HTMLFormElement | null>, brandId: string) {
  const [reach, setReach] = useState({ count: 0, allRegions: false });

  useEffect(() => {
    let controller: AbortController | null = null;
    function update() {
      controller?.abort();
      const el = form.current;
      if (!el || !brandId) return setReach({ count: 0, allRegions: false });
      const data = new FormData(el);
      const region = String(data.get('region') ?? 'all');
      const query = new URLSearchParams({
        brandId,
        region,
        importOk: data.get('importOk') === 'false' ? 'false' : 'true',
        ...(Number(data.get('budgetUsd')) > 0 && { budgetUsd: String(data.get('budgetUsd')) }),
        ...(Number(data.get('yearTo')) > 0 && { yearTo: String(data.get('yearTo')) }),
        sellerTypes: data.getAll('sellerTypes').join(','),
      });
      controller = new AbortController();
      fetch(`/api/reach?${query}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<{ count: number }>) : { count: 0 }))
        .then((body) => setReach({ count: body.count, allRegions: region === 'all' }))
        .catch(() => {});
    }
    // The seller-type checkboxes sit outside the form element, so listen on the whole page.
    function onChange(e: Event) {
      const target = e.target as HTMLInputElement;
      if (
        ['region', 'importOk', 'sellerTypes', 'budgetUsd', 'yearTo'].includes(target.name) &&
        target.form === form.current
      )
        update();
    }
    update();
    document.addEventListener('change', onChange);
    return () => {
      controller?.abort();
      document.removeEventListener('change', onChange);
    };
  }, [form, brandId]);

  return reach;
}
