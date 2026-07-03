'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { advanceProject } from '@/lib/engine';
import { notifyUsers } from '@/lib/notify';

type UserWithCompany = Awaited<ReturnType<typeof requireUser>>;

function canWork(user: UserWithCompany, task: { assignedCompanyId: string | null }) {
  return (
    user.role === 'ADMIN' ||
    !task.assignedCompanyId ||
    task.assignedCompanyId === user.companyId
  );
}

async function getTask(taskId: string) {
  return prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });
}

function taskPath(t: { projectId: string; id: string }) {
  return `/projects/${t.projectId}/tasks/${t.id}`;
}

export async function startTask(formData: FormData) {
  const user = await requireUser();
  const task = await getTask(String(formData.get('taskId')));
  if (task.status !== 'READY' || !canWork(user, task)) return;
  await prisma.task.update({
    where: { id: task.id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

export async function completeTask(formData: FormData) {
  const user = await requireUser();
  const task = await getTask(String(formData.get('taskId')));
  const approval = String(formData.get('approval') || ''); // '', 'APPROVED', 'REJECTED'
  if (!['READY', 'IN_PROGRESS'].includes(task.status)) return;
  if (!canWork(user, task)) return;
  if (approval && user.role !== 'ADMIN') return; // 승인/반려는 주관사 관리자만

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'DONE',
      completedAt: new Date(),
      approval: approval === 'APPROVED' || approval === 'REJECTED' ? approval : 'NONE',
    },
  });
  await advanceProject(task.projectId);
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

export async function reopenTask(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  const task = await getTask(String(formData.get('taskId')));
  if (task.status !== 'DONE' || task.type !== 'task') return;
  await prisma.task.update({
    where: { id: task.id },
    data: { status: 'IN_PROGRESS', completedAt: null, approval: 'NONE' },
  });
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

export async function assignCompany(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  const task = await getTask(String(formData.get('taskId')));
  const companyId = String(formData.get('companyId') || '') || null;
  await prisma.task.update({
    where: { id: task.id },
    data: { assignedCompanyId: companyId, assigneeId: null },
  });
  if (companyId) {
    const users = await prisma.user.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true },
    });
    await notifyUsers(
      users.map((u) => u.id),
      `과제 배정: ${task.name} (${task.project.name})`,
      taskPath(task)
    );
  }
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

export async function assignUser(formData: FormData) {
  const user = await requireUser();
  const task = await getTask(String(formData.get('taskId')));
  const assigneeId = String(formData.get('assigneeId') || '') || null;
  // 주관사 관리자 또는 배정된 회사의 회사 관리자만
  const allowed =
    user.role === 'ADMIN' ||
    (user.role === 'COMPANY_ADMIN' && task.assignedCompanyId === user.companyId);
  if (!allowed) return;
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee || (task.assignedCompanyId && assignee.companyId !== task.assignedCompanyId))
      return;
  }
  await prisma.task.update({ where: { id: task.id }, data: { assigneeId } });
  if (assigneeId) {
    await notifyUsers([assigneeId], `담당자 지정: ${task.name} (${task.project.name})`, taskPath(task));
  }
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

export async function updateTaskDates(formData: FormData) {
  const user = await requireUser();
  const task = await getTask(String(formData.get('taskId')));
  if (!canWork(user, task)) return;
  const ps = String(formData.get('plannedStart') || '');
  const pe = String(formData.get('plannedEnd') || '');
  await prisma.task.update({
    where: { id: task.id },
    data: {
      plannedStart: ps ? new Date(ps + 'T00:00:00') : null,
      plannedEnd: pe ? new Date(pe + 'T00:00:00') : null,
    },
  });
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}
