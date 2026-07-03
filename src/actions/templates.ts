'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import type { FlowEdge, FlowNode } from '@/lib/flow-types';

export async function createTemplate() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/templates');
  const nodes: FlowNode[] = [
    { id: 'start_1', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
    { id: 'end_1', name: 'End', type: 'end', position: { x: 0, y: 400 } },
  ];
  const tpl = await prisma.processTemplate.create({
    data: {
      name: '새 프로세스 템플릿',
      estimatedDays: 30,
      nodes: nodes as unknown as object,
      edges: [] as unknown as object,
      createdById: user.id,
    },
  });
  redirect(`/templates/${tpl.id}`);
}

export async function duplicateTemplate(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  const id = String(formData.get('templateId'));
  const src = await prisma.processTemplate.findUniqueOrThrow({ where: { id } });
  const copy = await prisma.processTemplate.create({
    data: {
      name: `${src.name} (복제)`,
      description: src.description,
      estimatedDays: src.estimatedDays,
      nodes: src.nodes as object,
      edges: src.edges as object,
      createdById: user.id,
    },
  });
  redirect(`/templates/${copy.id}`);
}

export async function saveTemplate(payload: {
  id: string;
  name: string;
  description: string;
  estimatedDays: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return { ok: false, error: '권한이 없습니다.' };
  if (!payload.name.trim()) return { ok: false, error: '템플릿 이름을 입력하세요.' };

  const starts = payload.nodes.filter((n) => n.type === 'start');
  const ends = payload.nodes.filter((n) => n.type === 'end');
  if (starts.length !== 1) return { ok: false, error: '시작 노드는 정확히 1개여야 합니다.' };
  if (ends.length < 1) return { ok: false, error: '종료 노드가 최소 1개 필요합니다.' };

  await prisma.processTemplate.update({
    where: { id: payload.id },
    data: {
      name: payload.name.trim(),
      description: payload.description.trim() || null,
      estimatedDays: Math.max(1, payload.estimatedDays || 30),
      nodes: payload.nodes as unknown as object,
      edges: payload.edges as unknown as object,
    },
  });
  revalidatePath('/templates');
  revalidatePath(`/templates/${payload.id}`);
  return { ok: true };
}

export async function deleteTemplate(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') return;
  const id = String(formData.get('templateId'));
  const tpl = await prisma.processTemplate.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!tpl || tpl.isBuiltIn || tpl._count.projects > 0) return;
  await prisma.processTemplate.delete({ where: { id } });
  revalidatePath('/templates');
}
