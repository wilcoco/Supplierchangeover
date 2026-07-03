import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cancelProject } from '@/actions/projects';
import { fmtDate, daysLeft, isOverdue, PROJECT_STATUS_LABELS } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { Gantt } from '@/components/Gantt';
import { Kanban } from '@/components/Kanban';
import { FlowViewer } from '@/components/FlowViewer';
import type { FlowEdge, FlowNode } from '@/lib/flow-types';

const VIEWS = [
  { key: 'list', label: '과제 목록' },
  { key: 'gantt', label: '간트차트' },
  { key: 'kanban', label: '칸반' },
  { key: 'flow', label: '프로세스 흐름' },
];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { view?: string };
}) {
  const user = await requireUser();
  const view = searchParams.view || 'list';

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tasks: {
        include: { assignedCompany: true, assignee: true },
        orderBy: { plannedStart: 'asc' },
      },
      template: { select: { name: true } },
    },
  });
  if (!project) notFound();

  const workTasks = project.tasks.filter((t) => t.type === 'task');
  const done = workTasks.filter((t) => t.status === 'DONE').length;
  const pct = workTasks.length ? Math.round((done / workTasks.length) * 100) : 0;

  const nodes = project.nodes as unknown as FlowNode[];
  const edges = project.edges as unknown as FlowEdge[];
  const statusByNode: Record<string, string> = {};
  const taskIdByNode: Record<string, string> = {};
  for (const t of project.tasks) {
    statusByNode[t.nodeId] = t.status;
    if (t.type === 'task') taskIdByNode[t.nodeId] = t.id;
  }

  return (
    <div className={`container ${view === 'flow' || view === 'gantt' ? 'wide' : ''}`}>
      <div className="page-head">
        <div>
          <div className="page-title">{project.name}</div>
          <div className="page-sub">
            {project.template?.name ?? '템플릿 삭제됨'} · 시작 {fmtDate(project.startDate)} ·{' '}
            <span className={`badge ${project.status === 'ACTIVE' ? 'blue' : project.status === 'COMPLETED' ? 'done' : 'gray'}`}>
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
            {project.description && <div>{project.description}</div>}
          </div>
        </div>
        <div className="row">
          <div style={{ minWidth: 160 }}>
            <div className="row">
              <div className="progress" style={{ flex: 1 }}>
                <div style={{ width: `${pct}%` }} />
              </div>
              <b>{pct}%</b>
            </div>
            <div className="muted" style={{ textAlign: 'right' }}>
              {done}/{workTasks.length} 과제 완료
            </div>
          </div>
          {user.role === 'ADMIN' && project.status === 'ACTIVE' && (
            <form action={cancelProject}>
              <input type="hidden" name="projectId" value={project.id} />
              <button className="btn sm danger" type="submit">
                프로젝트 중단
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/projects/${project.id}?view=${v.key}`}
            className={`btn sm ${view === v.key ? '' : 'secondary'}`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {view === 'list' && (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>과제</th>
                <th>담당 업체</th>
                <th>담당자</th>
                <th>계획 일정</th>
                <th>D-day</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {workTasks.map((t) => {
                const left = daysLeft(t.plannedEnd);
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/projects/${project.id}/tasks/${t.id}`}>{t.name}</Link>
                    </td>
                    <td>{t.assignedCompany?.name ?? <span className="muted">미배정</span>}</td>
                    <td>{t.assignee?.name ?? <span className="muted">-</span>}</td>
                    <td className="muted">
                      {fmtDate(t.plannedStart)} ~ {fmtDate(t.plannedEnd)}
                    </td>
                    <td>
                      {t.status === 'DONE' || left === null ? (
                        <span className="muted">-</span>
                      ) : left >= 0 ? (
                        `D-${left}`
                      ) : (
                        <b style={{ color: 'var(--danger)' }}>D+{-left}</b>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={t.status} overdue={isOverdue(t)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'gantt' && (
        <div className="card">
          <Gantt tasks={workTasks} />
        </div>
      )}

      {view === 'kanban' && <Kanban tasks={workTasks} />}

      {view === 'flow' && (
        <FlowViewer
          nodes={nodes}
          edges={edges}
          statusByNode={statusByNode}
          taskIdByNode={taskIdByNode}
          projectId={project.id}
        />
      )}
    </div>
  );
}
