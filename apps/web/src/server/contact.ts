import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

function key(): Buffer {
  const raw = process.env['REQUEST_CONTACT_KEY'];
  const buf = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (buf.length !== 32) throw new Error('REQUEST_CONTACT_KEY must be 32 bytes, base64');
  return buf;
}

// AES-256-GCM; stored as base64(iv | tag | ciphertext).
export function encryptContact(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

export function decryptContact(stored: string): string {
  const buf = Buffer.from(stored, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

// Stable keyed hash, so limits can count requests per phone without decrypting.
export function hashContact(plain: string): string {
  return createHmac('sha256', key()).update(plain).digest('hex');
}
