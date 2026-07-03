import Link from 'next/link';
import { TASK_STATUS_COLORS, fmtDate } from '@/lib/format';

type GanttTask = {
  id: string;
  projectId: string;
  name: string;
  status: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
};

export function Gantt({ tasks }: { tasks: GanttTask[] }) {
  const dated = tasks.filter((t) => t.plannedStart && t.plannedEnd);
  if (dated.length === 0) return <div className="muted">일정이 설정된 과제가 없습니다.</div>;

  const min = Math.min(...dated.map((t) => t.plannedStart!.getTime()));
  const max = Math.max(...dated.map((t) => t.plannedEnd!.getTime()));
  const span = Math.max(max - min, 24 * 60 * 60 * 1000);
  const today = Date.now();
  const todayPct = today >= min && today <= max ? ((today - min) / span) * 100 : null;

  const sorted = [...dated].sort(
    (a, b) => a.plannedStart!.getTime() - b.plannedStart!.getTime()
  );

  return (
    <div className="gantt">
      <div className="muted" style={{ marginBottom: 8 }}>
        기간: {fmtDate(new Date(min))} ~ {fmtDate(new Date(max))}
        {todayPct !== null && <span style={{ color: 'var(--danger)' }}> · 붉은 선 = 오늘</span>}
      </div>
      {sorted.map((t) => {
        const left = ((t.plannedStart!.getTime() - min) / span) * 100;
        const width = Math.max(
          ((t.plannedEnd!.getTime() - t.plannedStart!.getTime()) / span) * 100,
          1
        );
        return (
          <div className="gantt-row" key={t.id}>
            <div className="gname">
              <Link href={`/projects/${t.projectId}/tasks/${t.id}`}>{t.name}</Link>
            </div>
            <div className="gtrack">
              {todayPct !== null && <div className="gantt-today" style={{ left: `${todayPct}%` }} />}
              <div
                className="gantt-bar"
                title={`${t.name}: ${fmtDate(t.plannedStart)} ~ ${fmtDate(t.plannedEnd)}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: TASK_STATUS_COLORS[t.status] ?? '#94a3b8',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
