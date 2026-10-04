import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

export function contactKey(base64: string | undefined): Buffer {
  const key = base64 ? Buffer.from(base64, 'base64') : Buffer.alloc(0);
  if (key.length !== 32) throw new Error('REQUEST_CONTACT_KEY must be 32 bytes, base64');
  return key;
}

// AES-256-GCM; stored as base64(iv | tag | ciphertext).
export function encryptContact(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

export function decryptContact(stored: string, key: Buffer): string {
  const buf = Buffer.from(stored, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

// Stable keyed hash, so limits and lookups work without decrypting.
export function hashContact(plain: string, key: Buffer): string {
  return createHmac('sha256', key).update(plain).digest('hex');
}

export function newSecret(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

// Secrets (session and sign-in tokens) are stored only as SHA-256 hashes.
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
