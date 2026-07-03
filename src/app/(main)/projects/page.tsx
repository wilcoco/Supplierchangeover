import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fmtDate, PROJECT_STATUS_LABELS } from '@/lib/format';

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tasks: { select: { type: true, status: true } },
      template: { select: { name: true } },
    },
  });

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <div className="page-title">이관 프로젝트</div>
          <div className="page-sub">생산처 변경(이관) 건별 진행 현황</div>
        </div>
        {user.role === 'ADMIN' && (
          <Link href="/projects/new" className="btn">
            + 새 이관 프로젝트
          </Link>
        )}
      </div>

      <div className="card">
        {projects.length === 0 ? (
          <div className="muted">아직 프로젝트가 없습니다.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>프로젝트</th>
                <th>템플릿</th>
                <th>시작일</th>
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
                      <Link href={`/projects/${p.id}`}>
                        <b>{p.name}</b>
                      </Link>
                      {p.description && <div className="muted">{p.description}</div>}
                    </td>
                    <td className="muted">{p.template?.name ?? '-'}</td>
                    <td>{fmtDate(p.startDate)}</td>
                    <td>
                      <div className="row">
                        <div className="progress" style={{ flex: 1 }}>
                          <div style={{ width: `${pct}%` }} />
                        </div>
                        <span className="muted">
                          {done}/{work.length}
                        </span>
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
  );
}
