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

/** 완료 승인 권한 확인 — 승인자는 회사에 관계없이 지정 가능 */
function canReview(
  user: UserWithCompany,
  task: {
    approverType: string;
    assignedCompanyId: string | null;
    approverCompanyId: string | null;
    approverUserId: string | null;
  }
) {
  if (user.role === 'ADMIN') return true; // 주관사 관리자는 항상 가능
  switch (task.approverType) {
    case 'COMPANY_ADMIN': // 담당 업체의 회사 관리자
      return user.role === 'COMPANY_ADMIN' && task.assignedCompanyId === user.companyId;
    case 'COMPANY': // 지정 회사의 회사 관리자 (담당 업체와 다른 회사 가능)
      return user.role === 'COMPANY_ADMIN' && task.approverCompanyId === user.companyId;
    case 'USER': // 지정 사용자 (소속 회사 무관)
      return task.approverUserId === user.id;
    default:
      return false;
  }
}

/** 완료 승인자에게 알림 */
async function notifyReviewers(task: {
  id: string;
  name: string;
  approverType: string;
  assignedCompanyId: string | null;
  approverCompanyId: string | null;
  approverUserId: string | null;
  projectId: string;
  project: { name: string };
}) {
  let reviewers: { id: string }[] = [];
  if (task.approverType === 'COMPANY_ADMIN' && task.assignedCompanyId) {
    reviewers = await prisma.user.findMany({
      where: { companyId: task.assignedCompanyId, role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
  } else if (task.approverType === 'COMPANY' && task.approverCompanyId) {
    reviewers = await prisma.user.findMany({
      where: { companyId: task.approverCompanyId, role: 'COMPANY_ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
  } else if (task.approverType === 'USER' && task.approverUserId) {
    reviewers = [{ id: task.approverUserId }];
  }
  if (reviewers.length === 0) {
    reviewers = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
  }
  await notifyUsers(
    reviewers.map((r) => r.id),
    `완료 승인 요청: ${task.name} (${task.project.name})`,
    taskPath(task)
  );
}

export async function completeTask(formData: FormData) {
  const user = await requireUser();
  const task = await getTask(String(formData.get('taskId')));
  const approval = String(formData.get('approval') || ''); // '', 'APPROVED', 'REJECTED'
  if (!['READY', 'IN_PROGRESS'].includes(task.status)) return;
  if (!canWork(user, task)) return;

  // 분기 결정 과제(XOR 승인/반려)는 주관사 관리자의 결정이 곧 완료
  if (approval) {
    if (user.role !== 'ADMIN') return;
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        approval: approval === 'APPROVED' || approval === 'REJECTED' ? approval : 'NONE',
        reviewedById: user.id,
      },
    });
    await advanceProject(task.projectId);
    revalidatePath(taskPath(task));
    revalidatePath(`/projects/${task.projectId}`);
    return;
  }

  // 승인 불필요 과제는 즉시 완료
  if (task.approverType === 'NONE') {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'DONE', completedAt: new Date() },
    });
    await advanceProject(task.projectId);
  } else {
    // 완료 요청 → 승인 대기 상태로 전환, 승인자에게 알림
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'REVIEW', reviewRequestedAt: new Date(), reviewNote: null },
    });
    await notifyReviewers(task);
  }
  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

/** 완료 승인/반려 — 상위 결정권자의 게이트 */
export async function reviewTask(formData: FormData) {
  const user = await requireUser();
  const task = await getTask(String(formData.get('taskId')));
  const decision = String(formData.get('decision') || '');
  const note = String(formData.get('note') || '').trim() || null;
  if (task.status !== 'REVIEW') return;
  if (!canReview(user, task)) return;

  if (decision === 'APPROVED') {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'DONE', completedAt: new Date(), reviewedById: user.id, reviewNote: note },
    });
    await advanceProject(task.projectId);
  } else if (decision === 'REJECTED') {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'IN_PROGRESS', reviewedById: user.id, reviewNote: note },
    });
  } else {
    return;
  }

  // 담당자·담당 업체에 결과 알림
  const targets = new Set<string>();
  if (task.assigneeId) targets.add(task.assigneeId);
  if (task.assignedCompanyId) {
    const users = await prisma.user.findMany({
      where: { companyId: task.assignedCompanyId, status: 'ACTIVE' },
      select: { id: true },
    });
    users.forEach((u) => targets.add(u.id));
  }
  targets.delete(user.id);
  await notifyUsers(
    Array.from(targets),
    decision === 'APPROVED'
      ? `완료 승인됨: ${task.name} (${task.project.name})`
      : `완료 반려됨(재작업): ${task.name} (${task.project.name})${note ? ` — ${note}` : ''}`,
    taskPath(task)
  );

  revalidatePath(taskPath(task));
  revalidatePath(`/projects/${task.projectId}`);
}

/** 과제별 완료 승인자 변경 (주관사 관리자만) — 회사·사용자 교차 지정 가능 */
export async function setApproverType(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  const task = await getTask(String(formData.get('taskId')));
  const approverType = String(formData.get('approverType') || '');
  const approverCompanyId = String(formData.get('approverCompanyId') || '') || null;
  const approverUserId = String(formData.get('approverUserId') || '') || null;
  if (!['HOST_ADMIN', 'COMPANY_ADMIN', 'COMPANY', 'USER', 'NONE'].includes(approverType)) return;
  if (approverType === 'COMPANY' && !approverCompanyId) return;
  if (approverType === 'USER' && !approverUserId) return;
  await prisma.task.update({
    where: { id: task.id },
    data: {
      approverType,
      approverCompanyId: approverType === 'COMPANY' ? approverCompanyId : null,
      approverUserId: approverType === 'USER' ? approverUserId : null,
    },
  });
  revalidatePath(taskPath(task));
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
