import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fmtDate, daysLeft, isOverdue, PROJECT_STATUS_LABELS } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

export default async function DashboardPage() {
  const user = await requireUser();

  const [myTasks, reviewTasks, projects, pendingUsers, pendingCompanies, notifications] = await Promise.all([
    prisma.task.findMany({
      where: {
        type: 'task',
        status: { in: ['READY', 'IN_PROGRESS'] },
        project: { status: 'ACTIVE' },
        OR: [{ assigneeId: user.id }, { assignedCompanyId: user.companyId }],
      },
      include: { project: true, assignee: true, assignedCompany: true },
      orderBy: { plannedEnd: 'asc' },
      take: 15,
    }),
    // 내가 완료 승인해야 하는 과제 (승인자는 회사를 넘나들며 지정될 수 있음)
    user.role === 'ADMIN'
      ? prisma.task.findMany({
          where: { status: 'REVIEW', project: { status: 'ACTIVE' } },
          include: { project: true, assignedCompany: true },
          orderBy: { reviewRequestedAt: 'asc' },
          take: 15,
        })
      : prisma.task.findMany({
          where: {
            status: 'REVIEW',
            project: { status: 'ACTIVE' },
            OR: [
              // 나를 지정 사용자로 둔 과제
              { approverType: 'USER', approverUserId: user.id },
              // 회사 관리자라면: 담당 업체 승인 or 지정 회사 승인
              ...(user.role === 'COMPANY_ADMIN'
                ? [
                    { approverType: 'COMPANY_ADMIN', assignedCompanyId: user.companyId },
                    { approverType: 'COMPANY', approverCompanyId: user.companyId },
                  ]
                : []),
            ],
          },
          include: { project: true, assignedCompany: true },
          orderBy: { reviewRequestedAt: 'asc' },
          take: 15,
        }),
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { tasks: { select: { type: true, status: true } } },
    }),
    user.role === 'ADMIN'
      ? prisma.user.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),
    user.role === 'ADMIN'
      ? prisma.company.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  return (
    <div className="container">
      <div className="page-title">대시보드</div>
      <div className="page-sub">
        {user.company.name} {user.name}님, 오늘도 협업을 시작하세요.
      </div>

      {user.role === 'ADMIN' && (pendingUsers > 0 || pendingCompanies > 0) && (
        <div className="alert info">
          승인 대기 — 회사 {pendingCompanies}건, 사용자 {pendingUsers}건이 있습니다.{' '}
          <Link href="/admin">관리 화면으로 이동</Link>
        </div>
      )}

      {reviewTasks.length > 0 && (
        <div className="card" style={{ borderColor: '#c084fc' }}>
          <h2>완료 승인 대기 — 내 결재 차례 ({reviewTasks.length})</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>과제</th>
                <th>프로젝트</th>
                <th>담당 업체</th>
                <th>요청 시각</th>
              </tr>
            </thead>
            <tbody>
              {reviewTasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/projects/${t.projectId}/tasks/${t.id}`}>{t.name}</Link>
                  </td>
                  <td className="muted">{t.project.name}</td>
                  <td>{t.assignedCompany?.name ?? '-'}</td>
                  <td className="muted">{fmtDate(t.reviewRequestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2>내 회사 진행 과제</h2>
          {myTasks.length === 0 ? (
            <div className="muted">진행할 과제가 없습니다.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>과제</th>
                  <th>프로젝트</th>
                  <th>마감</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.map((t) => {
                  const left = daysLeft(t.plannedEnd);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/projects/${t.projectId}/tasks/${t.id}`}>{t.name}</Link>
                      </td>
                      <td className="muted">{t.project.name}</td>
                      <td>
                        {fmtDate(t.plannedEnd)}
                        {left !== null && (
                          <span className="muted"> ({left >= 0 ? `D-${left}` : `D+${-left}`})</span>
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
          )}
        </div>

        <div className="card">
          <h2>프로젝트 현황</h2>
          {projects.length === 0 ? (
            <div className="muted">
              프로젝트가 없습니다.{' '}
              {user.role === 'ADMIN' && <Link href="/projects/new">새 이관 프로젝트 만들기</Link>}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>프로젝트</th>
                  <th>진행률</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const work = p.tasks.filter((t) => t.type === 'task');
                  const done = work.filter((t) => t.status === 'DONE').length;
                  const pct = work.length ? Math.round((done / work.length) * 100) : 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/projects/${p.id}`}>{p.name}</Link>
                      </td>
                      <td>
                        <div className="row">
                          <div className="progress" style={{ flex: 1 }}>
                            <div style={{ width: `${pct}%` }} />
                          </div>
                          <span className="muted">{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'ACTIVE' ? 'blue' : p.status === 'COMPLETED' ? 'done' : 'gray'}`}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h2>최근 알림</h2>
        {notifications.length === 0 ? (
          <div className="muted">알림이 없습니다.</div>
        ) : (
          <table className="tbl">
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td style={{ width: 20 }}>{!n.read && <span className="badge-dot"> </span>}</td>
                  <td>{n.link ? <Link href={n.link}>{n.message}</Link> : n.message}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                    {fmtDate(n.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
