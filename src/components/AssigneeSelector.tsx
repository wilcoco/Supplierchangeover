'use client';

import { useState } from 'react';
import { assignUser } from '@/actions/tasks';

type UserOption = { id: string; name: string; loginId: string; team: string | null };

/** 담당 팀을 먼저 고르고 그 팀의 사용자 중에서 담당자를 지정하는 셀렉터 */
export function AssigneeSelector({
  taskId,
  users,
  teams,
  currentTeam,
  currentAssigneeId,
}: {
  taskId: string;
  users: UserOption[];
  teams: string[];
  currentTeam: string | null;
  currentAssigneeId: string | null;
}) {
  const [team, setTeam] = useState(currentTeam ?? '');
  // 팀을 고르면 팀원 우선 필터링하되, 팀 구성이 없으면 회사 전체 명단에서 지정 가능
  const teamMembers = team ? users.filter((u) => u.team === team) : users;
  const fallbackToAll = team !== '' && teamMembers.length === 0;
  const filtered = fallbackToAll ? users : teamMembers;

  return (
    <form action={assignUser}>
      <input type="hidden" name="taskId" value={taskId} />
      <div className="row" style={{ marginBottom: 6 }}>
        <select name="team" value={team} onChange={(e) => setTeam(e.target.value)} style={{ flex: 1 }}>
          <option value="">담당 팀 선택 (전체 보기)</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <select name="assigneeId" key={team} defaultValue={currentAssigneeId ?? ''} style={{ flex: 1 }}>
          <option value="">미지정</option>
          {filtered.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.loginId}){u.team ? ` — ${u.team}` : ''}
            </option>
          ))}
        </select>
        <button className="btn sm secondary" type="submit">
          지정
        </button>
      </div>
      {fallbackToAll && (
        <div className="muted mt8">
          이 팀에 등록된 사용자가 없어 회사 전체 명단을 표시합니다. (담당 팀은 선택한 값으로
          저장됩니다)
        </div>
      )}
      {users.length === 0 && (
        <div className="muted mt8">
          이 회사에 등록된 사용자가 없습니다. 관리 화면에서 사용자를 사전 등록하세요.
        </div>
      )}
    </form>
  );
}
