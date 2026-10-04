import { getLocale, getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, safeReturnTo } from '@/server/auth';
import { ProfileForm } from './ProfileForm';
import styles from '../forms.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('profile');
  const returnTo = safeReturnTo((await searchParams)['return']);
  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: { pathname: '/login', query: { return: '/sellers/profile' } },
      locale: await getLocale(),
    });
    return null;
  }

  const s = user.seller;
  const defaults: Record<string, string> = s
    ? {
        type: s.type,
        name: s.name,
        region: s.region,
        countries: s.countries.join(','),
        about: s.about,
      }
    : { type: 'importer', name: user.name, region: 'kyiv' };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.wide}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
        <ProfileForm
          defaults={defaults}
          regionNames={(await getMessages()).regions as Record<string, string>}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
