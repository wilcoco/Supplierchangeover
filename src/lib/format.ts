export const TASK_STATUS_LABELS: Record<string, string> = {
  WAITING: '대기',
  READY: '진행 가능',
  IN_PROGRESS: '진행 중',
  REVIEW: '승인 대기',
  DONE: '완료',
  SKIPPED: '건너뜀',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  WAITING: '#94a3b8',
  READY: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  REVIEW: '#a855f7',
  DONE: '#22c55e',
  SKIPPED: '#cbd5e1',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '진행 중',
  COMPLETED: '완료',
  CANCELLED: '중단',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: '시스템 관리자',
  COMPANY_ADMIN: '회사 관리자',
  MEMBER: '일반 사용자',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  PENDING: '승인 대기',
  ACTIVE: '활성',
  REJECTED: '거절',
};

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${fmtDate(date)} ${hh}:${mm}`;
}

/** D-day 계산: 음수면 지남 */
export function daysLeft(end: Date | string | null | undefined): number | null {
  if (!end) return null;
  const e = typeof end === 'string' ? new Date(end) : end;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(e);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function isOverdue(task: { status: string; plannedEnd: Date | null }): boolean {
  if (task.status === 'DONE' || task.status === 'SKIPPED' || !task.plannedEnd) return false;
  const left = daysLeft(task.plannedEnd);
  return left !== null && left < 0;
}
