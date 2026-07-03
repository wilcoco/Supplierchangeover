import { prisma } from './db';

export async function notifyUsers(userIds: string[], message: string, link?: string) {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, message, link })),
  });
}

export async function notifyAdmins(message: string, link?: string) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  await notifyUsers(
    admins.map((a) => a.id),
    message,
    link
  );
}
