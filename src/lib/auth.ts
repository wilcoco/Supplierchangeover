import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { getSessionUserId } from './session';

export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user || user.status !== 'ACTIVE') return null;
  if (user.role !== 'ADMIN' && user.company.status !== 'ACTIVE') return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return user;
}
