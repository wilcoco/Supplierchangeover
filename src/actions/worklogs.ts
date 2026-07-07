'use server';

import { revalidatePath } from 'next/cache';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { notifyUsers } from '@/lib/notify';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

async function saveFile(file: File): Promise<{ storedName: string; size: number } | null> {
  if (!file || file.size === 0 || file.size > MAX_FILE_SIZE) return null;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name).slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buf);
  return { storedName, size: file.size };
}

/** 과제 관계자(담당자·작성자·캠스 관리자)에게 알림 */
async function notifyTaskWatchers(
  taskId: string,
  excludeUserId: string,
  message: string,
  link: string
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      worklogs: { select: { authorId: true } },
      comments: { select: { authorId: true } },
    },
  });
  if (!task) return;
  const ids = new Set<string>();
  if (task.assigneeId) ids.add(task.assigneeId);
  task.worklogs.forEach((w) => ids.add(w.authorId));
  task.comments.forEach((c) => ids.add(c.authorId));
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  admins.forEach((a) => ids.add(a.id));
  ids.delete(excludeUserId);
  await notifyUsers(Array.from(ids), message, link);
}

export async function addWorklog(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get('taskId'));
  const content = String(formData.get('content') || '').trim();
  if (!content) return;

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });

  const worklog = await prisma.worklog.create({
    data: { taskId, authorId: user.id, content },
  });

  const files = formData.getAll('files') as File[];
  for (const file of files) {
    if (!(file instanceof File) || !file.name) continue;
    const saved = await saveFile(file);
    if (saved) {
      await prisma.attachment.create({
        data: {
          worklogId: worklog.id,
          taskId,
          filename: file.name,
          storedName: saved.storedName,
          size: saved.size,
          mime: file.type || null,
          uploaderId: user.id,
        },
      });
    }
  }

  const link = `/projects/${task.projectId}/tasks/${taskId}`;
  await notifyTaskWatchers(
    taskId,
    user.id,
    `업무일지 등록: ${task.name} — ${user.name} (${user.company.name})`,
    link
  );
  revalidatePath(link);
}

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get('taskId'));
  const content = String(formData.get('content') || '').trim();
  if (!content) return;

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });

  await prisma.comment.create({ data: { taskId, authorId: user.id, content } });

  const link = `/projects/${task.projectId}/tasks/${taskId}`;
  await notifyTaskWatchers(
    taskId,
    user.id,
    `새 댓글: ${task.name} — ${user.name} (${user.company.name})`,
    link
  );
  revalidatePath(link);
}
