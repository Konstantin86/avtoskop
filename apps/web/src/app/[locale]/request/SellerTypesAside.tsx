import { getTranslations } from 'next-intl/server';
import { SELLER_TYPES } from '@avtoskop/core';
import { LockIcon } from '@/components/icons';
import styles from './request.module.css';

// "Who can reply" next to the request form; the checkboxes belong to the form by its id.
export async function SellerTypesAside({ defaults }: { defaults: Record<string, string> }) {
  const t = await getTranslations('request');
  return (
    <aside className={`card ${styles.aside}`}>
      <h2 className={styles.asideTitle}>{t('whoReplies')}</h2>
      {/* The checkboxes belong to the request form through the form attribute. */}
      <div className="choices">
        {SELLER_TYPES.map((type) => (
          <label key={type}>
            <input
              type="checkbox"
              name="sellerTypes"
              value={type}
              form="request-form"
              defaultChecked={
                !defaults['sellerTypes'] || defaults['sellerTypes'].split(',').includes(type)
              }
            />
            <span>{t(`sellerType_${type}`)}</span>
          </label>
        ))}
      </div>
      <p className="hint">{t('whoRepliesHint')}</p>
      <p className={styles.privacy}>
        <LockIcon />
        {t('privacy')}
      </p>
    </aside>
  );
}
