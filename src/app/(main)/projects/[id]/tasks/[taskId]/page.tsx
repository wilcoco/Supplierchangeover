import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isApprovalNode } from '@/lib/engine';
import {
  startTask,
  completeTask,
  reviewTask,
  reopenTask,
  assignCompany,
  updateTaskDates,
} from '@/actions/tasks';
import { AssigneeSelector } from '@/components/AssigneeSelector';
import { ApproverSelector } from '@/components/ApproverSelector';
import { addWorklog, addComment } from '@/actions/worklogs';
import {
  addSubtask,
  updateSubtask,
  toggleSubtask,
  deleteSubtask,
  importSubtasksFromDescription,
} from '@/actions/subtasks';
import { fmtDate, fmtDateTime, isOverdue } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { APPROVER_TYPE_LABELS, type FlowEdge } from '@/lib/flow-types';

function toInputDate(d: Date | null): string {
  if (!d) return '';
  return fmtDate(d);
}

export default async function TaskDetailPage({
  params,
}: {
  params: { id: string; taskId: string };
}) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: params.taskId },
    include: {
      project: true,
      assignedCompany: true,
      assignee: true,
      approverCompany: true,
      approverUser: { include: { company: true } },
      subtasks: { include: { assignee: true }, orderBy: { order: 'asc' } },
      worklogs: {
        include: { author: { include: { company: true } }, attachments: true },
        orderBy: { createdAt: 'desc' },
      },
      comments: {
        include: { author: { include: { company: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!task || task.projectId !== params.id) notFound();

  const edges = task.project.edges as unknown as FlowEdge[];
  const approvalTask = isApprovalNode(task.nodeId, edges);
  const isAdmin = user.role === 'ADMIN';
  const canWork = isAdmin || !task.assignedCompanyId || task.assignedCompanyId === user.companyId;
  const canReview =
    isAdmin ||
    (task.approverType === 'COMPANY_ADMIN' &&
      user.role === 'COMPANY_ADMIN' &&
      task.assignedCompanyId === user.companyId) ||
    (task.approverType === 'COMPANY' &&
      user.role === 'COMPANY_ADMIN' &&
      task.approverCompanyId === user.companyId) ||
    (task.approverType === 'USER' && task.approverUserId === user.id);

  const approverLabel =
    task.approverType === 'HOST_ADMIN'
      ? '승인 담당자 미지정 — 캠스 관리자 승인(백업)'
      : task.approverType === 'COMPANY_ADMIN'
        ? `담당 업체 회사 관리자${task.assignedCompany ? ` (${task.assignedCompany.name})` : ''}`
        : task.approverType === 'COMPANY'
          ? `지정 회사 관리자 — ${task.approverCompany?.name ?? '미지정'}`
          : task.approverType === 'USER'
            ? `지정 사용자 — ${task.approverUser ? `${task.approverUser.name} (${task.approverUser.company.name})` : '미지정'}`
            : '승인 불필요';
  const canAssignUser =
    isAdmin || (user.role === 'COMPANY_ADMIN' && task.assignedCompanyId === user.companyId);
  const projectActive = task.project.status === 'ACTIVE';
  const subDone = task.subtasks.filter((s) => s.done).length;
  const subRemaining = task.subtasks.length - subDone;

  const [companies, companyUsers, allUsers] = await Promise.all([
    isAdmin
      ? prisma.company.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
    task.assignedCompanyId
      ? prisma.user.findMany({
          where: { companyId: task.assignedCompanyId, status: 'ACTIVE' },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.user.findMany({
          where: { status: 'ACTIVE' },
          include: { company: true },
          orderBy: [{ companyId: 'asc' }, { name: 'asc' }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="container">
      <div className="page-sub">
        <Link href={`/projects/${task.projectId}`}>← {task.project.name}</Link>
      </div>
      <div className="page-head">
        <div>
          <div className="page-title">
            {task.name}{' '}
            {approvalTask && <span className="badge blue">승인 과제</span>}
          </div>
          <div className="row">
            <StatusBadge status={task.status} overdue={isOverdue(task)} />
            {task.approval !== 'NONE' && (
              <span className={`badge ${task.approval === 'APPROVED' ? 'done' : 'rejected'}`}>
                {task.approval === 'APPROVED' ? '승인됨' : '반려됨'}
              </span>
            )}
            <span className="muted">
              계획 {fmtDate(task.plannedStart)} ~ {fmtDate(task.plannedEnd)}
              {task.completedAt && ` · 완료 ${fmtDateTime(task.completedAt)}`}
            </span>
          </div>
        </div>
        {projectActive && (
          <div className="row">
            {task.status === 'READY' && canWork && (
              <form action={startTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <button className="btn" type="submit">
                  과제 시작
                </button>
              </form>
            )}
            {['READY', 'IN_PROGRESS'].includes(task.status) &&
              canWork &&
              !approvalTask &&
              (subRemaining > 0 ? (
                <span className="badge pending">
                  세부 항목 {subRemaining}건 완료 후 요청 가능
                </span>
              ) : (
                <form action={completeTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="btn success" type="submit">
                    {task.approverType === 'NONE' ? '완료 처리' : '완료 요청 (승인 상신)'}
                  </button>
                </form>
              ))}
            {['READY', 'IN_PROGRESS'].includes(task.status) && approvalTask && isAdmin && (
              <>
                <form action={completeTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="approval" value="APPROVED" />
                  <button className="btn success" type="submit">
                    ✔ 승인
                  </button>
                </form>
                <form action={completeTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="approval" value="REJECTED" />
                  <button className="btn danger" type="submit">
                    ✖ 반려
                  </button>
                </form>
              </>
            )}
            {task.status === 'DONE' && isAdmin && (
              <form action={reopenTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <button className="btn sm secondary" type="submit">
                  다시 열기
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {approvalTask && ['READY', 'IN_PROGRESS'].includes(task.status) && !isAdmin && (
        <div className="alert info">이 과제는 캠스 관리자의 승인/반려로 완료됩니다.</div>
      )}

      {task.status === 'REVIEW' && (
        <div className="card" style={{ borderColor: '#c084fc', background: '#faf5ff' }}>
          <h2>완료 승인 대기</h2>
          <div className="muted" style={{ marginBottom: 10 }}>
            {fmtDateTime(task.reviewRequestedAt)} 완료 요청됨 · 승인자: {approverLabel}
          </div>
          {projectActive && canReview ? (
            <form action={reviewTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <label className="fld">
                <span className="lbl">검토 의견 (선택 — 반려 시 사유 권장)</span>
                <input type="text" name="note" placeholder="예: 재고 수량 재확인 필요" />
              </label>
              <div className="row">
                <button className="btn success" type="submit" name="decision" value="APPROVED">
                  ✔ 완료 승인
                </button>
                <button className="btn danger" type="submit" name="decision" value="REJECTED">
                  ✖ 반려 (재작업)
                </button>
              </div>
            </form>
          ) : (
            <div className="muted">상위 결정권자의 승인을 기다리고 있습니다.</div>
          )}
        </div>
      )}

      {task.status === 'IN_PROGRESS' && task.reviewNote && (
        <div className="alert error">반려 사유: {task.reviewNote}</div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2>과제 내용</h2>
          <div className="desc-box">{task.description || '설명이 없습니다.'}</div>
        </div>

        <div className="card">
          <h2>담당 및 일정</h2>
          <table className="tbl">
            <tbody>
              <tr>
                <th style={{ width: 110 }}>담당 업체</th>
                <td>
                  {isAdmin && projectActive ? (
                    <form action={assignCompany} className="row">
                      <input type="hidden" name="taskId" value={task.id} />
                      <select name="companyId" defaultValue={task.assignedCompanyId ?? ''} style={{ flex: 1 }}>
                        <option value="">미배정</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.isHost ? ' (운영)' : ''}
                          </option>
                        ))}
                      </select>
                      <button className="btn sm secondary" type="submit">
                        배정
                      </button>
                    </form>
                  ) : (
                    task.assignedCompany?.name ?? <span className="muted">미배정</span>
                  )}
                </td>
              </tr>
              <tr>
                <th>담당 팀 / 담당자</th>
                <td>
                  {canAssignUser && projectActive && task.assignedCompanyId ? (
                    <AssigneeSelector
                      taskId={task.id}
                      users={companyUsers.map((u) => ({
                        id: u.id,
                        name: u.name,
                        loginId: u.loginId,
                        team: u.team,
                      }))}
                      teams={Array.from(
                        new Set([
                          ...(task.assignedCompany?.teams ?? []),
                          ...companyUsers.map((u) => u.team).filter((t): t is string => !!t),
                        ])
                      )}
                      currentTeam={task.assignedTeam}
                      currentAssigneeId={task.assigneeId}
                    />
                  ) : (
                    <span>
                      {task.assignedTeam && <span className="badge gray">{task.assignedTeam}</span>}{' '}
                      {task.assignee?.name ?? <span className="muted">미지정</span>}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <th>완료 승인자</th>
                <td>
                  {isAdmin && projectActive && !approvalTask ? (
                    <ApproverSelector
                      taskId={task.id}
                      companies={companies.map((c) => ({
                        id: c.id,
                        name: c.name,
                        isHost: c.isHost,
                        teams: c.teams,
                      }))}
                      users={allUsers.map((u) => ({
                        id: u.id,
                        name: u.name,
                        companyId: u.companyId,
                        companyName: u.company.name,
                        team: u.team,
                      }))}
                      currentType={task.approverType}
                      currentCompanyId={task.approverCompanyId}
                      currentUserId={task.approverUserId}
                      currentLabel={approverLabel}
                    />
                  ) : approvalTask ? (
                    <span className="muted">분기 결정 과제 — 캠스 관리자 승인/반려</span>
                  ) : (
                    approverLabel
                  )}
                </td>
              </tr>
              <tr>
                <th>계획 일정</th>
                <td>
                  {canWork && projectActive ? (
                    <form action={updateTaskDates} className="row">
                      <input type="hidden" name="taskId" value={task.id} />
                      <input
                        type="date"
                        name="plannedStart"
                        defaultValue={toInputDate(task.plannedStart)}
                        style={{ width: 150 }}
                      />
                      <span>~</span>
                      <input
                        type="date"
                        name="plannedEnd"
                        defaultValue={toInputDate(task.plannedEnd)}
                        style={{ width: 150 }}
                      />
                      <button className="btn sm secondary" type="submit">
                        저장
                      </button>
                    </form>
                  ) : (
                    <span>
                      {fmtDate(task.plannedStart)} ~ {fmtDate(task.plannedEnd)}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>
          세부 항목 — 팀별 병렬 진행{' '}
          {task.subtasks.length > 0 && (
            <span className="muted">
              ({subDone}/{task.subtasks.length} 완료)
            </span>
          )}
        </h2>
        {task.subtasks.length === 0 && (
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="muted">
              세부 항목이 없습니다. 팀별 세부 업무를 등록해 병렬로 진행하세요.
            </span>
            {task.description && canWork && projectActive && (
              <form action={importSubtasksFromDescription}>
                <input type="hidden" name="taskId" value={task.id} />
                <button className="btn sm secondary" type="submit">
                  과제 내용에서 세부 항목 가져오기
                </button>
              </form>
            )}
          </div>
        )}
        {task.subtasks.length > 0 && (
          <table className="tbl" style={{ marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 90 }}>상태</th>
                <th>항목</th>
                <th style={{ width: 330 }}>담당 팀 / 담당자</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {task.subtasks.map((s) => (
                <tr key={s.id} style={s.done ? { opacity: 0.6 } : undefined}>
                  <td>
                    {canWork && projectActive ? (
                      <form action={toggleSubtask}>
                        <input type="hidden" name="subtaskId" value={s.id} />
                        <button
                          className={`btn sm ${s.done ? 'secondary' : 'success'}`}
                          type="submit"
                        >
                          {s.done ? '↺ 취소' : '✓ 완료'}
                        </button>
                      </form>
                    ) : (
                      <span className={`badge ${s.done ? 'done' : 'ready'}`}>
                        {s.done ? '완료' : '진행'}
                      </span>
                    )}
                  </td>
                  <td style={s.done ? { textDecoration: 'line-through' } : undefined}>
                    {s.title}
                    {s.done && s.doneAt && (
                      <span className="muted"> · {fmtDate(s.doneAt)}</span>
                    )}
                  </td>
                  <td>
                    {canWork && projectActive ? (
                      <form action={updateSubtask} className="row">
                        <input type="hidden" name="subtaskId" value={s.id} />
                        <input
                          type="text"
                          name="team"
                          defaultValue={s.team ?? ''}
                          placeholder="담당 팀"
                          style={{ width: 110 }}
                        />
                        <select name="assigneeId" defaultValue={s.assigneeId ?? ''} style={{ flex: 1 }}>
                          <option value="">담당자 미지정</option>
                          {companyUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                              {u.team ? ` — ${u.team}` : ''}
                            </option>
                          ))}
                        </select>
                        <button className="btn sm secondary" type="submit">
                          저장
                        </button>
                      </form>
                    ) : (
                      <span>
                        {s.team && <span className="badge gray">{s.team}</span>}{' '}
                        {s.assignee?.name ?? <span className="muted">-</span>}
                      </span>
                    )}
                  </td>
                  <td>
                    {canWork && projectActive && (
                      <form action={deleteSubtask}>
                        <input type="hidden" name="subtaskId" value={s.id} />
                        <button className="btn sm danger" type="submit">
                          ✕
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canWork && projectActive && (
          <form action={addSubtask} className="row">
            <input type="hidden" name="taskId" value={task.id} />
            <input
              type="text"
              name="team"
              placeholder="담당 팀 (선택)"
              style={{ width: 130 }}
            />
            <input
              type="text"
              name="title"
              placeholder="세부 항목 내용 (예: 4M / ISIR 일정 수립)"
              required
              style={{ flex: 1 }}
            />
            <button className="btn sm" type="submit">
              + 추가
            </button>
          </form>
        )}
        {subRemaining > 0 && (
          <div className="muted mt8">
            세부 항목이 모두 완료되어야 과제 완료 요청을 할 수 있습니다.
          </div>
        )}
      </div>

      <div className="card">
        <h2>업무일지 ({task.worklogs.length})</h2>
        {canWork && (
          <form action={addWorklog} style={{ marginBottom: 16 }}>
            <input type="hidden" name="taskId" value={task.id} />
            <label className="fld">
              <textarea
                name="content"
                placeholder="진행 내용, 결과, 이슈 등을 기록하고 공유하세요."
                required
              />
            </label>
            <div className="row">
              <input type="file" name="files" multiple style={{ flex: 1 }} />
              <button className="btn" type="submit">
                일지 등록
              </button>
            </div>
            <div className="muted mt8">파일 첨부는 개당 15MB까지 가능합니다.</div>
          </form>
        )}
        {task.worklogs.length === 0 ? (
          <div className="muted">등록된 업무일지가 없습니다.</div>
        ) : (
          task.worklogs.map((w) => (
            <div className="wlog" key={w.id}>
              <div className="whead">
                <b>{w.author.name}</b> ({w.author.company.name}) · {fmtDateTime(w.createdAt)}
              </div>
              <div className="wbody">{w.content}</div>
              {w.attachments.length > 0 && (
                <div>
                  {w.attachments.map((a) => (
                    <a key={a.id} href={`/api/files/${a.id}`} className="attach">
                      📎 {a.filename} ({Math.ceil(a.size / 1024)}KB)
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>협의 댓글 ({task.comments.length})</h2>
        {task.comments.map((c) => (
          <div className="comment" key={c.id}>
            <div style={{ flex: 1 }}>
              <span className="cmeta">
                <b>{c.author.name}</b> ({c.author.company.name}) · {fmtDateTime(c.createdAt)}
              </span>
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
            </div>
          </div>
        ))}
        <form action={addComment} className="mt16">
          <input type="hidden" name="taskId" value={task.id} />
          <div className="row">
            <input
              type="text"
              name="content"
              placeholder="의견을 남겨 협의하세요."
              required
              style={{ flex: 1 }}
            />
            <button className="btn" type="submit">
              댓글
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
