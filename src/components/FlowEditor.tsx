'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { saveTemplate } from '@/actions/templates';
import { NODE_TYPE_LABELS, type FlowEdge, type FlowNode } from '@/lib/flow-types';

type NodeData = {
  label: string;
  name: string;
  nodeType: FlowNode['type'];
  description: string;
  durationDays: number;
  approverType: string;
};

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  task: { border: '2px solid #3b82f6', background: '#eff6ff', borderRadius: 8 },
  start: { border: '2px solid #0f172a', background: '#0f172a', color: '#fff', borderRadius: 999 },
  end: { border: '2px solid #0f172a', background: '#0f172a', color: '#fff', borderRadius: 999 },
  gateway_xor: { border: '2px solid #d97706', background: '#fffbeb', borderRadius: 4 },
  gateway_parallel: { border: '2px solid #7c3aed', background: '#f5f3ff', borderRadius: 4 },
};

function nodeStyle(type: string): React.CSSProperties {
  return { fontSize: 11, padding: '6px 10px', width: 170, ...TYPE_STYLES[type] };
}

function displayLabel(name: string, type: string): string {
  if (type === 'gateway_xor') return `◇ ${name}`;
  if (type === 'gateway_parallel') return `◈ ${name}`;
  return name;
}

function condToLabel(cond: string): string | undefined {
  if (!cond) return undefined;
  if (cond.includes('APPROVED')) return '✔ 승인';
  if (cond.includes('REJECTED')) return '✖ 반려';
  return cond;
}

export function FlowEditor({
  templateId,
  initialName,
  initialDescription,
  initialEstimatedDays,
  initialNodes,
  initialEdges,
  readOnly,
}: {
  templateId: string;
  initialName: string;
  initialDescription: string;
  initialEstimatedDays: number;
  initialNodes: FlowNode[];
  initialEdges: FlowEdge[];
  readOnly: boolean;
}) {
  const rfInitialNodes: Node<NodeData>[] = useMemo(
    () =>
      initialNodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: {
          label: displayLabel(n.name, n.type),
          name: n.name,
          nodeType: n.type,
          description: n.description ?? '',
          durationDays: n.durationDays ?? (n.type === 'task' ? 5 : 0),
          approverType: n.approverType ?? 'HOST_ADMIN',
        },
        style: nodeStyle(n.type),
      })),
    [initialNodes]
  );
  const rfInitialEdges: Edge[] = useMemo(
    () =>
      initialEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: condToLabel(e.condition ?? ''),
        data: { condition: e.condition ?? '' },
        labelStyle: { fontSize: 10 },
      })),
    [initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(rfInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfInitialEdges);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [estimatedDays, setEstimatedDays] = useState(initialEstimatedDays);
  const [selNodeId, setSelNodeId] = useState<string | null>(null);
  const [selEdgeId, setSelEdgeId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const counter = useRef(0);

  const selNode = nodes.find((n) => n.id === selNodeId) ?? null;
  const selEdge = edges.find((e) => e.id === selEdgeId) ?? null;

  const onConnect = useCallback(
    (conn: Connection) => {
      if (readOnly) return;
      counter.current += 1;
      setEdges((eds) =>
        addEdge({ ...conn, id: `e_${Date.now()}_${counter.current}`, data: { condition: '' } }, eds)
      );
    },
    [readOnly, setEdges]
  );

  function addNode(type: FlowNode['type']) {
    counter.current += 1;
    const id = `n_${Date.now()}_${counter.current}`;
    const nodeName = type === 'task' ? '새 과제' : NODE_TYPE_LABELS[type];
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: 80 + (counter.current % 5) * 40, y: 80 + (counter.current % 5) * 40 },
        data: {
          label: displayLabel(nodeName, type),
          name: nodeName,
          nodeType: type,
          description: '',
          durationDays: type === 'task' ? 5 : 0,
          approverType: 'HOST_ADMIN',
        },
        style: nodeStyle(type),
      },
    ]);
    setSelNodeId(id);
    setSelEdgeId(null);
  }

  function patchSelNode(patch: Partial<NodeData>) {
    if (!selNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selNodeId) return n;
        const data = { ...n.data, ...patch };
        data.label = displayLabel(data.name, data.nodeType);
        return { ...n, data };
      })
    );
  }

  function setEdgeCondition(cond: string) {
    if (!selEdgeId) return;
    setEdges((eds) =>
      eds.map((e) =>
        e.id === selEdgeId
          ? { ...e, data: { condition: cond }, label: condToLabel(cond) }
          : e
      )
    );
  }

  function deleteSelection() {
    if (selNodeId) {
      setNodes((nds) => nds.filter((n) => n.id !== selNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selNodeId && e.target !== selNodeId));
      setSelNodeId(null);
    } else if (selEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selEdgeId));
      setSelEdgeId(null);
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const outNodes: FlowNode[] = nodes.map((n) => ({
        id: n.id,
        name: n.data.name,
        type: n.data.nodeType,
        taskType: n.data.nodeType === 'task' ? 'WORKLOG' : undefined,
        description: n.data.description || undefined,
        durationDays: n.data.nodeType === 'task' ? n.data.durationDays : undefined,
        approverType: n.data.nodeType === 'task' ? n.data.approverType : undefined,
        position: n.position,
      }));
      const outEdges: FlowEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: (e.data as { condition?: string })?.condition || undefined,
      }));
      const res = await saveTemplate({
        id: templateId,
        name,
        description,
        estimatedDays,
        nodes: outNodes,
        edges: outEdges,
      });
      if (res?.ok) {
        setMsg({ type: 'success', text: '템플릿이 저장되었습니다.' });
      } else {
        setMsg({ type: 'error', text: res?.error || '저장에 실패했습니다.' });
      }
    } catch {
      setMsg({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">템플릿 편집 — {name}</div>
          <div className="page-sub">
            {readOnly
              ? '열람 전용 (편집은 시스템 관리자만 가능)'
              : '노드를 드래그해 배치하고, 노드 가장자리를 끌어 연결하세요. Delete/Backspace 키로 삭제할 수 있습니다.'}
          </div>
        </div>
        {!readOnly && (
          <div className="row">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? '저장 중…' : '템플릿 저장'}
            </button>
          </div>
        )}
      </div>

      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      {!readOnly && (
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="btn sm secondary" onClick={() => addNode('task')}>
            + 업무 과제
          </button>
          <button className="btn sm secondary" onClick={() => addNode('gateway_xor')}>
            + XOR 분기
          </button>
          <button className="btn sm secondary" onClick={() => addNode('gateway_parallel')}>
            + AND 병렬
          </button>
          <button className="btn sm secondary" onClick={() => addNode('start')}>
            + 시작
          </button>
          <button className="btn sm secondary" onClick={() => addNode('end')}>
            + 종료
          </button>
          {(selNodeId || selEdgeId) && (
            <button className="btn sm danger" onClick={deleteSelection}>
              선택 항목 삭제
            </button>
          )}
        </div>
      )}

      <div className="editor-layout">
        <div className="flow-wrap">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => {
              setSelNodeId(n.id);
              setSelEdgeId(null);
            }}
            onEdgeClick={(_, e) => {
              setSelEdgeId(e.id);
              setSelNodeId(null);
            }}
            onPaneClick={() => {
              setSelNodeId(null);
              setSelEdgeId(null);
            }}
            fitView
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        <div className="side-panel">
          <h3>템플릿 정보</h3>
          <label className="fld">
            <span className="lbl">이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
            />
          </label>
          <label className="fld">
            <span className="lbl">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              style={{ minHeight: 60 }}
            />
          </label>
          <label className="fld">
            <span className="lbl">예상 소요일</span>
            <input
              type="number"
              value={estimatedDays}
              min={1}
              onChange={(e) => setEstimatedDays(Number(e.target.value))}
              disabled={readOnly}
            />
          </label>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />

          {selNode ? (
            <>
              <h3>노드 편집 — {NODE_TYPE_LABELS[selNode.data.nodeType]}</h3>
              <label className="fld">
                <span className="lbl">이름</span>
                <input
                  type="text"
                  value={selNode.data.name}
                  onChange={(e) => patchSelNode({ name: e.target.value })}
                  disabled={readOnly}
                />
              </label>
              {selNode.data.nodeType === 'task' && (
                <>
                  <label className="fld">
                    <span className="lbl">설명 (담당 팀·작업 내용)</span>
                    <textarea
                      value={selNode.data.description}
                      onChange={(e) => patchSelNode({ description: e.target.value })}
                      disabled={readOnly}
                    />
                  </label>
                  <label className="fld">
                    <span className="lbl">기본 소요일</span>
                    <input
                      type="number"
                      min={0}
                      value={selNode.data.durationDays}
                      onChange={(e) => patchSelNode({ durationDays: Number(e.target.value) })}
                      disabled={readOnly}
                    />
                  </label>
                  <label className="fld">
                    <span className="lbl">완료 승인자 (업무 완료 시 승인 게이트)</span>
                    <select
                      value={selNode.data.approverType}
                      onChange={(e) => patchSelNode({ approverType: e.target.value })}
                      disabled={readOnly}
                    >
                      <option value="HOST_ADMIN">캠스 관리자</option>
                      <option value="COMPANY_ADMIN">담당 업체 회사 관리자</option>
                      <option value="NONE">승인 불필요 (즉시 완료)</option>
                    </select>
                    <span className="muted">
                      특정 회사·사용자를 승인자로 지정(교차 승인)하는 것은 프로젝트 생성 후 과제
                      화면에서 설정합니다.
                    </span>
                  </label>
                </>
              )}
            </>
          ) : selEdge ? (
            <>
              <h3>연결 편집</h3>
              <label className="fld">
                <span className="lbl">진행 조건</span>
                <select
                  value={(selEdge.data as { condition?: string })?.condition ?? ''}
                  onChange={(e) => setEdgeCondition(e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">조건 없음 (완료 시 진행)</option>
                  <option value="last.approval.status == 'APPROVED'">✔ 승인 시 진행</option>
                  <option value="last.approval.status == 'REJECTED'">✖ 반려 시 진행</option>
                </select>
              </label>
              <div className="muted">
                승인/반려 조건은 선행 과제의 승인 결과에 따라 분기합니다. 조건이 걸린 선행 과제는
                자동으로 승인 과제가 되어 캠스 관리자의 승인/반려로 완료됩니다.
              </div>
            </>
          ) : (
            <div className="muted">노드나 연결선을 클릭하면 여기서 편집할 수 있습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
