import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import forms from './sellers/forms.module.css';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className={`container ${forms.page}`}>
      <div className={`card ${forms.narrow}`}>
        <h1 className={forms.title}>{t('title')}</h1>
        <p className={forms.lead}>{t('text')}</p>
        <Link href="/" className="btn btn-yellow btn-block">
          {t('home')}
        </Link>
        <Link href="/requests" className={forms.secondaryLink}>
          {t('requests')}
        </Link>
      </div>
    </div>
  );
}
