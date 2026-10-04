import 'server-only';
import * as crypto from '@avtoskop/core';

const key = () => crypto.contactKey(process.env['REQUEST_CONTACT_KEY']);

export const encryptContact = (plain: string) => crypto.encryptContact(plain, key());
export const decryptContact = (stored: string) => crypto.decryptContact(stored, key());
export const hashContact = (plain: string) => crypto.hashContact(plain, key());
