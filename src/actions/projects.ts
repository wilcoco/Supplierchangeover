'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { advanceProject, scheduleDates } from '@/lib/engine';
import type { FlowEdge, FlowNode } from '@/lib/flow-types';

export async function createProject(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/projects');

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const templateId = String(formData.get('templateId') || '');
  const startDateStr = String(formData.get('startDate') || '');
  if (!name || !templateId || !startDateStr) redirect('/projects/new');

  const template = await prisma.processTemplate.findUnique({ where: { id: templateId } });
  if (!template) redirect('/projects/new');

  const nodes = template.nodes as unknown as FlowNode[];
  const edges = template.edges as unknown as FlowEdge[];
  const startDate = new Date(startDateStr + 'T00:00:00');
  const schedule = scheduleDates(nodes, edges, startDate);

  // 템플릿에 저장된 담당 업체 기본값 검증용 (활성 회사만)
  const activeCompanies = await prisma.company.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  const activeCompanyIds = new Set(activeCompanies.map((c) => c.id));

  const project = await prisma.project.create({
    data: {
      name,
      description,
      startDate,
      templateId,
      nodes: nodes as unknown as object,
      edges: edges as unknown as object,
      createdById: user.id,
      tasks: {
        create: nodes.map((n) => {
          const sched = schedule.get(n.id);
          return {
            nodeId: n.id,
            name: n.name,
            type: n.type,
            taskType: n.taskType ?? null,
            description: n.description ?? null,
            approverType: n.approverType ?? 'HOST_ADMIN',
            assignedCompanyId:
              n.defaultCompanyId && activeCompanyIds.has(n.defaultCompanyId)
                ? n.defaultCompanyId
                : null,
            assignedTeam: n.defaultTeam ?? null,
            status: n.type === 'start' ? 'DONE' : 'WAITING',
            completedAt: n.type === 'start' ? new Date() : null,
            plannedStart: sched?.plannedStart ?? null,
            plannedEnd: sched?.plannedEnd ?? null,
          };
        }),
      },
    },
  });

  await advanceProject(project.id);
  revalidatePath('/projects');
  redirect(`/projects/${project.id}`);
}

export async function cancelProject(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  const projectId = String(formData.get('projectId') || '');
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'CANCELLED' },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
}
