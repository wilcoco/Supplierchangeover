import { TASK_STATUS_LABELS } from '@/lib/format';

export function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  return (
    <>
      <span className={`badge ${status.toLowerCase()}`}>{TASK_STATUS_LABELS[status] ?? status}</span>
      {overdue && <span className="badge overdue" style={{ marginLeft: 4 }}>지연</span>}
    </>
  );
}
