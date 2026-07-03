export type FlowNode = {
  id: string;
  name: string;
  type: 'task' | 'start' | 'end' | 'gateway_xor' | 'gateway_parallel';
  taskType?: string;
  description?: string;
  durationDays?: number;
  position: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  condition?: string;
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  task: '업무',
  start: '시작',
  end: '종료',
  gateway_xor: 'XOR 분기',
  gateway_parallel: 'AND 병렬',
};
