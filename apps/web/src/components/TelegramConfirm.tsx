import { qrSvg } from '@/server/qr';
import { ConfirmWatcher } from './ConfirmWatcher';
import { CheckIcon, TelegramIcon } from './icons';
import styles from './TelegramConfirm.module.css';

interface Props {
  href: string | null;
  confirmed: boolean;
  title: string;
  text: string;
  button: string;
  // When set, the page refreshes itself once the request is confirmed.
  requestId?: string | undefined;
  qrCaption?: string | undefined;
}

// Asks the buyer to confirm the request's phone through our Telegram bot. On wide screens a QR
// code lets them open the bot on their phone, where Telegram usually is.
export async function TelegramConfirm({
  href,
  confirmed,
  title,
  text,
  button,
  requestId,
  qrCaption,
}: Props) {
  const qr = !confirmed && href && qrCaption ? await qrSvg(href) : null;
  return (
    <div className={`${styles.card} ${confirmed ? styles.done : ''}`}>
      <div className={styles.main}>
        <span className={styles.icon}>
          {confirmed ? <CheckIcon size={22} /> : <TelegramIcon />}
        </span>
        <div className={styles.text}>
          <div className={styles.title}>{title}</div>
          <div className={styles.body}>{text}</div>
        </div>
        {!confirmed && href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-blue">
            {button}
          </a>
        )}
      </div>
      {qr && (
        <div className={styles.qr}>
          {/* Generated on our server from our own bot link. */}
          <span className={styles.qrImage} dangerouslySetInnerHTML={{ __html: qr }} />
          <span className={styles.body}>{qrCaption}</span>
        </div>
      )}
      {!confirmed && requestId && <ConfirmWatcher requestId={requestId} />}
    </div>
  );
}
