'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

async function getTaskForWork(taskId: string, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const canWork =
    user.role === 'ADMIN' || !task.assignedCompanyId || task.assignedCompanyId === user.companyId;
  return { task, canWork };
}

function taskPath(t: { projectId: string; id: string }) {
  return `/projects/${t.projectId}/tasks/${t.id}`;
}

export async function addSubtask(formData: FormData) {
  const user = await requireUser();
  const { task, canWork } = await getTaskForWork(String(formData.get('taskId')), user.id);
  if (!canWork) return;
  const title = String(formData.get('title') || '').trim();
  if (!title) return;
  const team = String(formData.get('team') || '').trim() || null;
  const count = await prisma.subtask.count({ where: { taskId: task.id } });
  await prisma.subtask.create({
    data: { taskId: task.id, title, team, order: count },
  });
  revalidatePath(taskPath(task));
}

export async function updateSubtask(formData: FormData) {
  const user = await requireUser();
  const subtaskId = String(formData.get('subtaskId'));
  const sub = await prisma.subtask.findUniqueOrThrow({ where: { id: subtaskId } });
  const { task, canWork } = await getTaskForWork(sub.taskId, user.id);
  if (!canWork) return;
  const team = String(formData.get('team') || '').trim() || null;
  const assigneeId = String(formData.get('assigneeId') || '') || null;
  await prisma.subtask.update({ where: { id: subtaskId }, data: { team, assigneeId } });
  revalidatePath(taskPath(task));
}

export async function toggleSubtask(formData: FormData) {
  const user = await requireUser();
  const subtaskId = String(formData.get('subtaskId'));
  const sub = await prisma.subtask.findUniqueOrThrow({ where: { id: subtaskId } });
  const { task, canWork } = await getTaskForWork(sub.taskId, user.id);
  if (!canWork) return;
  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { done: !sub.done, doneAt: sub.done ? null : new Date() },
  });
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

export async function deleteSubtask(formData: FormData) {
  const user = await requireUser();
  const subtaskId = String(formData.get('subtaskId'));
  const sub = await prisma.subtask.findUniqueOrThrow({ where: { id: subtaskId } });
  const { task, canWork } = await getTaskForWork(sub.taskId, user.id);
  if (!canWork) return;
  await prisma.subtask.delete({ where: { id: subtaskId } });
  revalidatePath(taskPath(task));
}

/**
 * 과제 설명에서 세부 항목 자동 생성.
 * "양산팀 : 4M / ISIR 일정 수립" 형식이면 팀을 분리하고,
 * 괄호로 시작하는 줄은 앞 항목의 부연 설명으로 합친다.
 */
export async function importSubtasksFromDescription(formData: FormData) {
  const user = await requireUser();
  const { task, canWork } = await getTaskForWork(String(formData.get('taskId')), user.id);
  if (!canWork || !task.description) return;
  const existing = await prisma.subtask.count({ where: { taskId: task.id } });
  if (existing > 0) return;

  const items: { title: string; team: string | null }[] = [];
  for (const raw of task.description.split('\n')) {
    const line = raw.replace(/^[\s\-•·\d.)]+/, '').trim();
    if (!line) continue;
    if (line.startsWith('(') && items.length > 0) {
      items[items.length - 1].title += ` ${line}`;
      continue;
    }
    const m = line.match(/^(.{1,15}?(?:팀|실장|공장장|대표))\s*[:：]\s*(.+)$/);
    if (m) {
      items.push({ title: m[2].trim(), team: m[1].trim() });
    } else {
      items.push({ title: line, team: null });
    }
  }
  if (items.length === 0) return;

  await prisma.subtask.createMany({
    data: items.map((it, i) => ({
      taskId: task.id,
      title: it.title,
      team: it.team,
      order: i,
    })),
  });
  revalidatePath(taskPath(task));
}
