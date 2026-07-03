import { Task, TaskStatus } from '@prisma/client';
import { prisma } from './db';
import { notifyUsers } from './notify';
import type { FlowEdge, FlowNode } from './flow-types';

/** 조건식 평가 — 승인 결과 기반 분기 (예: last.approval.status == 'APPROVED') */
function edgeSatisfied(edge: FlowEdge, source: Task): boolean {
  if (source.status !== 'DONE') return false;
  const cond = (edge.condition || '').trim();
  if (!cond) return true;
  if (cond.includes('APPROVED')) return source.approval === 'APPROVED';
  if (cond.includes('REJECTED')) return source.approval === 'REJECTED';
  return true;
}

/** 어떤 과제가 승인형 과제인지 — 나가는 간선에 승인 조건이 있으면 승인형 */
export function isApprovalNode(nodeId: string, edges: FlowEdge[]): boolean {
  return edges.some(
    (e) =>
      e.source === nodeId &&
      (e.condition || '').match(/APPROVED|REJECTED/) !== null
  );
}

/**
 * 프로세스 전진 — 완료된 과제를 기준으로 후속 과제를 READY로 전환하고,
 * 게이트웨이/종료 노드는 자동 완료 처리한다. 종료 노드 도달 시 프로젝트 완료.
 */
export async function advanceProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: true },
  });
  if (!project || project.status !== 'ACTIVE') return;

  const nodes = project.nodes as unknown as FlowNode[];
  const edges = project.edges as unknown as FlowEdge[];
  const byNode = new Map(project.tasks.map((t) => [t.nodeId, t]));
  const originalStatus = new Map(project.tasks.map((t) => [t.id, t.status]));
  const newlyReady: Task[] = [];

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      const task = byNode.get(node.id);
      if (!task) continue;
      if (task.status === 'DONE' || task.status === 'SKIPPED' || task.status === 'IN_PROGRESS')
        continue;

      const incoming = edges.filter((e) => e.target === node.id);
      if (incoming.length === 0) continue; // 시작 노드는 생성 시 DONE 처리됨

      const results = incoming.map((e) => {
        const src = byNode.get(e.source);
        return src ? edgeSatisfied(e, src) : false;
      });
      // AND 병렬 게이트는 모든 선행 완료, 그 외에는 하나라도 충족되면 진행
      const ready =
        node.type === 'gateway_parallel' ? results.every(Boolean) : results.some(Boolean);
      if (!ready) continue;

      if (node.type === 'task') {
        if (task.status === 'WAITING') {
          task.status = 'READY' as TaskStatus;
          newlyReady.push(task);
          changed = true;
        }
      } else {
        // 게이트웨이·종료 노드는 자동 통과
        task.status = 'DONE' as TaskStatus;
        task.completedAt = new Date();
        changed = true;
      }
    }
  }

  // 변경분 저장
  const updates = project.tasks.filter((t) => originalStatus.get(t.id) !== t.status);
  for (const t of updates) {
    await prisma.task.update({
      where: { id: t.id },
      data: { status: t.status, completedAt: t.completedAt },
    });
  }

  // 종료 노드 도달 → 프로젝트 완료
  const endDone = project.tasks.some(
    (t) => t.type === 'end' && t.status === 'DONE'
  );
  if (endDone) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });
  }

  // 새로 진행 가능해진 과제 → 담당 업체 사용자에게 알림
  for (const t of newlyReady) {
    if (!t.assignedCompanyId) continue;
    const users = await prisma.user.findMany({
      where: { companyId: t.assignedCompanyId, status: 'ACTIVE' },
      select: { id: true },
    });
    await notifyUsers(
      users.map((u) => u.id),
      `과제 진행 가능: ${t.name} (${project.name})`,
      `/projects/${projectId}/tasks/${t.id}`
    );
  }
}

/** 프로젝트 시작일 기준 최장 경로로 과제별 계획 일정 산출 */
export function scheduleDates(
  nodes: FlowNode[],
  edges: FlowEdge[],
  startDate: Date
): Map<string, { plannedStart: Date; plannedEnd: Date }> {
  const duration = (n: FlowNode) =>
    n.type === 'task' ? Math.max(0, n.durationDays ?? 5) : 0;
  const est = new Map<string, number>();
  for (const n of nodes) est.set(n.id, 0);

  // DAG 가정, 간선 수만큼 반복 완화 (사이클이 있어도 종료 보장)
  for (let i = 0; i <= edges.length; i++) {
    let moved = false;
    for (const e of edges) {
      const srcNode = nodes.find((n) => n.id === e.source);
      if (!srcNode) continue;
      const cand = (est.get(e.source) ?? 0) + duration(srcNode);
      if (cand > (est.get(e.target) ?? 0)) {
        est.set(e.target, cand);
        moved = true;
      }
    }
    if (!moved) break;
  }

  const out = new Map<string, { plannedStart: Date; plannedEnd: Date }>();
  const dayMs = 24 * 60 * 60 * 1000;
  for (const n of nodes) {
    const s = new Date(startDate.getTime() + (est.get(n.id) ?? 0) * dayMs);
    const e = new Date(s.getTime() + duration(n) * dayMs);
    out.set(n.id, { plannedStart: s, plannedEnd: e });
  }
  return out;
}
