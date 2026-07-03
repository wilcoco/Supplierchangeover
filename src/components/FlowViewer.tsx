'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import type { FlowEdge, FlowNode } from '@/lib/flow-types';

const STATUS_COLORS: Record<string, { border: string; bg: string }> = {
  WAITING: { border: '#94a3b8', bg: '#f8fafc' },
  READY: { border: '#3b82f6', bg: '#eff6ff' },
  IN_PROGRESS: { border: '#f59e0b', bg: '#fffbeb' },
  DONE: { border: '#22c55e', bg: '#f0fdf4' },
  SKIPPED: { border: '#cbd5e1', bg: '#f8fafc' },
};

function nodeLabel(n: FlowNode): string {
  if (n.type === 'gateway_xor') return `◇ ${n.name}`;
  if (n.type === 'gateway_parallel') return `◈ ${n.name}`;
  return n.name;
}

function condLabel(cond?: string): string | undefined {
  if (!cond) return undefined;
  if (cond.includes('APPROVED')) return '✔ 승인';
  if (cond.includes('REJECTED')) return '✖ 반려';
  return cond;
}

export function FlowViewer({
  nodes,
  edges,
  statusByNode,
  taskIdByNode,
  projectId,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  statusByNode: Record<string, string>;
  taskIdByNode: Record<string, string>;
  projectId: string;
}) {
  const router = useRouter();

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const status = statusByNode[n.id] ?? 'WAITING';
        const c = STATUS_COLORS[status] ?? STATUS_COLORS.WAITING;
        const isGateway = n.type.startsWith('gateway');
        const isEndpoint = n.type === 'start' || n.type === 'end';
        return {
          id: n.id,
          position: n.position,
          data: { label: nodeLabel(n) },
          style: {
            border: `2px solid ${c.border}`,
            background: isEndpoint ? '#0f172a' : c.bg,
            color: isEndpoint ? '#fff' : '#0f172a',
            borderRadius: isGateway ? 4 : isEndpoint ? 999 : 8,
            fontSize: 11,
            padding: '6px 10px',
            width: 170,
          },
        };
      }),
    [nodes, statusByNode]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: condLabel(e.condition),
        animated: statusByNode[e.source] === 'DONE' && statusByNode[e.target] !== 'DONE',
        style: { stroke: '#94a3b8' },
        labelStyle: { fontSize: 10, fill: '#475569' },
      })),
    [edges, statusByNode]
  );

  return (
    <div className="flow-wrap">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          const taskId = taskIdByNode[node.id];
          if (taskId) router.push(`/projects/${projectId}/tasks/${taskId}`);
        }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
