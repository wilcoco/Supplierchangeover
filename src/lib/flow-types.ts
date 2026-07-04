export type FlowNode = {
  id: string;
  name: string;
  type: 'task' | 'start' | 'end' | 'gateway_xor' | 'gateway_parallel';
  taskType?: string;
  description?: string;
  durationDays?: number;
  approverType?: string; // HOST_ADMIN | COMPANY_ADMIN | NONE
  position: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  condition?: string;
};

export const APPROVER_TYPE_LABELS: Record<string, string> = {
  HOST_ADMIN: '주관사 관리자',
  COMPANY_ADMIN: '담당 업체 회사 관리자',
  COMPANY: '지정 회사 관리자',
  USER: '지정 사용자',
  NONE: '승인 불필요',
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  task: '업무',
  start: '시작',
  end: '종료',
  gateway_xor: 'XOR 분기',
  gateway_parallel: 'AND 병렬',
};
