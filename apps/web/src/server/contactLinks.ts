import 'server-only';

// Where people can reach us: Telegram if FEEDBACK_TELEGRAM is set, else e-mail, else nothing.
export function feedbackUrl(): string | null {
  const telegram = process.env['FEEDBACK_TELEGRAM']?.replace(/^@/, '').trim();
  if (telegram) return `https://t.me/${telegram}`;
  const email = process.env['CONTACT_EMAIL']?.trim();
  return email ? `mailto:${email}` : null;
}

export function founderName(): string | null {
  return process.env['FOUNDER_NAME']?.trim() || null;
}
