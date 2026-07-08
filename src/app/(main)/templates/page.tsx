import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createTemplate, duplicateTemplate, deleteTemplate } from '@/actions/templates';
import { fmtDate } from '@/lib/format';
import type { FlowNode } from '@/lib/flow-types';

export default async function TemplatesPage() {
  const user = await requireUser();
  const templates = await prisma.processTemplate.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { projects: true } } },
  });
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <div className="page-title">프로세스 템플릿</div>
          <div className="page-sub">이관 프로젝트 생성에 사용하는 업무 흐름 정의</div>
        </div>
        {isAdmin && (
          <form action={createTemplate}>
            <button className="btn" type="submit">
              + 새 템플릿
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>템플릿</th>
              <th>과제 수</th>
              <th>예상 소요</th>
              <th>사용 프로젝트</th>
              <th>수정일</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const nodes = t.nodes as unknown as FlowNode[];
              const taskCount = nodes.filter((n) => n.type === 'task').length;
              return (
                <tr key={t.id}>
                  <td>
                    <Link href={`/templates/${t.id}`}>
                      <b>{t.name}</b>
                    </Link>{' '}
                    {t.isBuiltIn && <span className="badge gray">내장</span>}
                    {t.description && <div className="muted">{t.description}</div>}
                  </td>
                  <td>{taskCount}개</td>
                  <td>{t.estimatedDays}일</td>
                  <td>{t._count.projects}건</td>
                  <td className="muted">{fmtDate(t.updatedAt)}</td>
                  {isAdmin && (
                    <td>
                      <div className="row">
                        <form action={duplicateTemplate}>
                          <input type="hidden" name="templateId" value={t.id} />
                          <button className="btn sm secondary" type="submit">
                            복제
                          </button>
                        </form>
                        {!t.isBuiltIn && (
                          <form action={deleteTemplate}>
                            <input type="hidden" name="templateId" value={t.id} />
                            <button className="btn sm danger" type="submit">
                              삭제
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="muted mt8">
          템플릿 이름을 클릭하면 편집기에서 과제 추가·수정·삭제·연결·마일스톤 지정이 가능합니다.
          템플릿을 삭제해도 이미 생성된 프로젝트는 영향받지 않습니다 (내장 템플릿은 복제 후 수정).
        </div>
      </div>
    </div>
  );
}
