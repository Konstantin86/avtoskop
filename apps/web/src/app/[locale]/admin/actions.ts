'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { reports, sellers } from '@avtoskop/db';
import { getAdmin } from '@/server/admin';
import { db } from '@/server/db';

const SELLER_STATUSES = ['pending', 'verified', 'banned'];

export async function setSellerStatusAction(formData: FormData): Promise<void> {
  if (!(await getAdmin())) return;
  const id = formData.get('sellerId');
  const status = formData.get('status');
  if (typeof id !== 'string' || typeof status !== 'string' || !SELLER_STATUSES.includes(status)) {
    return;
  }
  await db.update(sellers).set({ status, updatedAt: new Date() }).where(eq(sellers.id, id));
  revalidatePath('/[locale]/admin', 'page');
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  if (!(await getAdmin())) return;
  const id = formData.get('reportId');
  if (typeof id !== 'string') return;
  await db.update(reports).set({ status: 'resolved' }).where(eq(reports.id, id));
  revalidatePath('/[locale]/admin', 'page');
}
