import { CheckIcon, TelegramIcon } from './icons';
import styles from './TelegramConfirm.module.css';

interface Props {
  href: string | null;
  confirmed: boolean;
  title: string;
  text: string;
  button: string;
}

// Asks the buyer to confirm the request's phone through our Telegram bot.
export function TelegramConfirm({ href, confirmed, title, text, button }: Props) {
  return (
    <div className={`${styles.card} ${confirmed ? styles.done : ''}`}>
      <span className={styles.icon}>{confirmed ? <CheckIcon size={22} /> : <TelegramIcon />}</span>
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
  );
}
