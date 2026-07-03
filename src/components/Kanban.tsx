import Link from 'next/link';
import { TASK_STATUS_LABELS, fmtDate, isOverdue } from '@/lib/format';

type KanbanTask = {
  id: string;
  projectId: string;
  name: string;
  status: string;
  plannedEnd: Date | null;
  assignedCompany: { name: string } | null;
  assignee: { name: string } | null;
};

const COLUMNS = ['WAITING', 'READY', 'IN_PROGRESS', 'DONE'] as const;

export function Kanban({ tasks }: { tasks: KanbanTask[] }) {
  return (
    <div className="kanban">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col);
        return (
          <div className="col" key={col}>
            <h3>
              {TASK_STATUS_LABELS[col]} <span>{list.length}</span>
            </h3>
            {list.map((t) => (
              <Link key={t.id} href={`/projects/${t.projectId}/tasks/${t.id}`} className="kcard">
                <div>
                  {t.name} {isOverdue(t) && <span className="badge overdue">지연</span>}
                </div>
                <div className="meta">
                  {t.assignedCompany?.name ?? '미배정'}
                  {t.assignee ? ` · ${t.assignee.name}` : ''}
                  {t.plannedEnd ? ` · ~${fmtDate(t.plannedEnd)}` : ''}
                </div>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
