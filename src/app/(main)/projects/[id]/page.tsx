import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cancelProject, addProjectComment } from '@/actions/projects';
import { fmtDate, fmtDateTime, daysLeft, isOverdue, PROJECT_STATUS_LABELS } from '@/lib/format';
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
  { key: 'talk', label: '💬 협의' },
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
        include: {
          assignedCompany: true,
          assignee: true,
          subtasks: { select: { done: true } },
        },
        orderBy: { plannedStart: 'asc' },
      },
      template: { select: { name: true } },
    },
  });
  if (!project) notFound();

  // 협의 탭 데이터 (스레드 + 최근 활동)
  const [talkComments, recentWorklogs, recentTaskComments] =
    view === 'talk'
      ? await Promise.all([
          prisma.projectComment.findMany({
            where: { projectId: project.id },
            include: { author: { include: { company: true } } },
            orderBy: { createdAt: 'asc' },
            take: 200,
          }),
          prisma.worklog.findMany({
            where: { task: { projectId: project.id } },
            include: {
              author: { include: { company: true } },
              task: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          prisma.comment.findMany({
            where: { task: { projectId: project.id } },
            include: {
              author: { include: { company: true } },
              task: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ])
      : [[], [], []];

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

      {(() => {
        const milestones = project.tasks
          .filter((t) => t.isMilestone)
          .sort(
            (a, b) => (a.plannedStart?.getTime() ?? 0) - (b.plannedStart?.getTime() ?? 0)
          );
        if (milestones.length === 0) return null;
        return (
          <div className="card msbar-card">
            <h2>핵심 마일스톤 · 게이트</h2>
            <div className="msbar">
              {milestones.map((m) => {
                const color =
                  m.status === 'DONE'
                    ? '#22c55e'
                    : m.status === 'REVIEW'
                      ? '#a855f7'
                      : ['READY', 'IN_PROGRESS'].includes(m.status)
                        ? '#f59e0b'
                        : '#94a3b8';
                return (
                  <div className="ms" key={m.id}>
                    <div className="ms-dot" style={{ background: color }}>
                      {m.status === 'DONE' ? '✓' : '◆'}
                    </div>
                    <div className="ms-name">
                      {m.type === 'task' ? (
                        <Link href={`/projects/${project.id}/tasks/${m.id}`}>{m.name}</Link>
                      ) : (
                        m.name
                      )}
                    </div>
                    <div className="ms-date">
                      {m.status === 'DONE'
                        ? `완료 ${fmtDate(m.completedAt)}`
                        : `목표 ${fmtDate(m.plannedEnd)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                      {t.isMilestone && (
                        <span style={{ color: '#d97706', fontWeight: 700 }}>◆ </span>
                      )}
                      <Link href={`/projects/${project.id}/tasks/${t.id}`}>{t.name}</Link>
                      {t.subtasks.length > 0 && (
                        <span className="badge gray" style={{ marginLeft: 6 }}>
                          세부 {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
                        </span>
                      )}
                    </td>
                    <td>{t.assignedCompany?.name ?? <span className="muted">미배정</span>}</td>
                    <td>
                      {t.assignedTeam && <span className="badge gray">{t.assignedTeam}</span>}{' '}
                      {t.assignee?.name ?? <span className="muted">-</span>}
                    </td>
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

      {view === 'talk' && (
        <div className="grid-2">
          <div className="card">
            <h2>프로젝트 협의 스레드</h2>
            <div className="muted" style={{ marginBottom: 10 }}>
              참여 업체 전체가 함께 보는 공용 협의 공간입니다. 메시지를 남기면 과제 담당자·협의
              참여자·캠스 관리자에게 알림이 갑니다.
            </div>
            {talkComments.length === 0 ? (
              <div className="muted" style={{ marginBottom: 12 }}>
                아직 협의 내용이 없습니다. 첫 메시지를 남겨보세요.
              </div>
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto', marginBottom: 12 }}>
                {talkComments.map((c) => (
                  <div className="wlog" key={c.id}>
                    <div className="whead">
                      <b>{c.author.name}</b> ({c.author.company.name}) · {fmtDateTime(c.createdAt)}
                    </div>
                    <div className="wbody">{c.content}</div>
                  </div>
                ))}
              </div>
            )}
            {project.status === 'ACTIVE' && (
              <form action={addProjectComment}>
                <input type="hidden" name="projectId" value={project.id} />
                <label className="fld">
                  <textarea
                    name="content"
                    required
                    placeholder="협의 내용, 결정 사항, 요청 사항을 남겨 공유하세요."
                  />
                </label>
                <button className="btn" type="submit">
                  메시지 등록
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h2>최근 활동 (과제 일지·댓글)</h2>
            {(() => {
              const feed = [
                ...recentWorklogs.map((w) => ({
                  kind: '일지',
                  at: w.createdAt,
                  author: w.author,
                  task: w.task,
                  content: w.content,
                })),
                ...recentTaskComments.map((c) => ({
                  kind: '댓글',
                  at: c.createdAt,
                  author: c.author,
                  task: c.task,
                  content: c.content,
                })),
              ]
                .sort((a, b) => b.at.getTime() - a.at.getTime())
                .slice(0, 15);
              if (feed.length === 0)
                return <div className="muted">아직 과제 활동이 없습니다.</div>;
              return feed.map((f, i) => (
                <div className="comment" key={i}>
                  <div style={{ flex: 1 }}>
                    <span className="cmeta">
                      <span className={`badge ${f.kind === '일지' ? 'blue' : 'gray'}`}>{f.kind}</span>{' '}
                      <Link href={`/projects/${project.id}/tasks/${f.task.id}`}>{f.task.name}</Link>{' '}
                      · <b>{f.author.name}</b> ({f.author.company.name}) · {fmtDateTime(f.at)}
                    </span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {f.content.length > 120 ? f.content.slice(0, 120) + '…' : f.content}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

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
