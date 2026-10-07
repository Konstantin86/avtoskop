import { getMessages, getTranslations } from 'next-intl/server';
import { formatNumber, fuelsLabel, yearsLabel } from '@/components/requestFormat';
import { OG_SIZE, ogCard } from '@/server/og';
import { getPublicRequest } from '@/server/requests';

export const alt = 'Автоскоп';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Props = { params: Promise<{ locale: string; id: string }> };

// The card shown when a request link is shared on Telegram, Instagram, Threads or X.
export default async function Image({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'og' });
  const b = await getTranslations({ locale, namespace: 'board' });
  const f = await getTranslations({ locale, namespace: 'fields' });
  const regions = (await getMessages({ locale })).regions as Record<string, string>;
  const r = await getPublicRequest(id);
  if (!r) {
    return ogCard({
      brand: t('brand'),
      eyebrow: t('homeEyebrow'),
      title: t('homeTitle'),
      lines: [t('homeLine')],
      footer: t('domain'),
    });
  }
  const details = [
    fuelsLabel(r.fuels, (x) => f(`fuel_${x}` as 'fuel_hybrid')),
    r.gearbox !== 'any' ? f(`gearbox_${r.gearbox}` as 'gearbox_any') : null,
    r.importOk ? b('importOk') : b('onlyUkraine'),
  ]
    .filter(Boolean)
    .join(' · ');
  return ogCard({
    brand: t('brand'),
    eyebrow: t('requestEyebrow'),
    title: `${r.brand} ${r.model} ${yearsLabel(r)}`,
    lines: [
      `${b('budget', { amount: formatNumber(locale, r.budgetUsd) })} · ${regions[r.region] ?? ''}`,
      details,
    ],
    footer: t('requestFooter'),
  });
}
