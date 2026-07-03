import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createProject } from '@/actions/projects';
import { fmtDate } from '@/lib/format';

export default async function NewProjectPage() {
  await requireAdmin();
  const templates = await prisma.processTemplate.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, estimatedDays: true },
  });
  const today = fmtDate(new Date());

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="page-title">새 이관 프로젝트</div>
      <div className="page-sub">프로세스 템플릿을 선택하면 과제와 일정이 자동 생성됩니다.</div>

      <div className="card">
        <form action={createProject}>
          <label className="fld">
            <span className="lbl">프로젝트명</span>
            <input type="text" name="name" required placeholder="예: OO정밀 → XX테크 이관 (2026 상반기)" />
          </label>
          <label className="fld">
            <span className="lbl">설명 (선택)</span>
            <textarea name="description" placeholder="이관 배경, 대상 품목군 등" />
          </label>
          <label className="fld">
            <span className="lbl">프로세스 템플릿</span>
            <select name="templateId" required>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (예상 {t.estimatedDays}일)
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="lbl">시작일</span>
            <input type="date" name="startDate" defaultValue={today} required />
          </label>
          <button className="btn" type="submit">
            프로젝트 생성
          </button>
        </form>
      </div>
    </div>
  );
}
