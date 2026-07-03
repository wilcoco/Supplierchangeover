'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath('/notifications');
}

export async function changeMyPassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get('current') || '');
  const next = String(formData.get('next') || '');
  if (next.length < 8) return;
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!bcrypt.compareSync(current, me.passwordHash)) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(next, 10) },
  });
  revalidatePath('/dashboard');
}
