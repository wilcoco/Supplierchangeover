'use client';

import { useState } from 'react';
import { setApproverType } from '@/actions/tasks';

type CompanyOpt = { id: string; name: string; isHost: boolean };
type UserOpt = { id: string; name: string; companyName: string };

/** 완료 승인자 지정 — 유형에 따라 필요한 선택만 노출, 미선택 시 안내 */
export function ApproverSelector({
  taskId,
  companies,
  users,
  currentType,
  currentCompanyId,
  currentUserId,
  currentLabel,
}: {
  taskId: string;
  companies: CompanyOpt[];
  users: UserOpt[];
  currentType: string;
  currentCompanyId: string | null;
  currentUserId: string | null;
  currentLabel: string;
}) {
  const [type, setType] = useState(currentType);
  const [companyId, setCompanyId] = useState(currentCompanyId ?? '');
  const [userId, setUserId] = useState(currentUserId ?? '');
  const [err, setErr] = useState('');

  const needCompany = type === 'COMPANY';
  const needUser = type === 'USER';

  return (
    <form
      action={setApproverType}
      onSubmit={(e) => {
        if (needCompany && !companyId) {
          e.preventDefault();
          setErr('승인을 담당할 회사를 선택한 뒤 변경을 누르세요.');
          return;
        }
        if (needUser && !userId) {
          e.preventDefault();
          setErr('승인을 담당할 사용자를 선택한 뒤 변경을 누르세요.');
          return;
        }
        setErr('');
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <div className="row" style={{ marginBottom: 6 }}>
        <select
          name="approverType"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setErr('');
          }}
          style={{ flex: 1 }}
        >
          <option value="HOST_ADMIN">캠스 관리자</option>
          <option value="COMPANY_ADMIN">담당 업체 회사 관리자</option>
          <option value="COMPANY">지정 회사 관리자 (교차 승인)</option>
          <option value="USER">지정 사용자 (교차 승인)</option>
          <option value="NONE">승인 불필요 (즉시 완료)</option>
        </select>
        {needCompany && (
          <select
            name="approverCompanyId"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setErr('');
            }}
            style={{ flex: 1 }}
          >
            <option value="">-- 승인 회사 선택 --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isHost ? ' (캠스)' : ''}
              </option>
            ))}
          </select>
        )}
        {needUser && (
          <select
            name="approverUserId"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setErr('');
            }}
            style={{ flex: 1 }}
          >
            <option value="">-- 승인자 선택 --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.companyName}
              </option>
            ))}
          </select>
        )}
        <button className="btn sm secondary" type="submit">
          변경
        </button>
      </div>
      {err && (
        <div className="alert error" style={{ marginBottom: 6, padding: '6px 10px' }}>
          {err}
        </div>
      )}
      <div className="muted">
        현재: {currentLabel} · 승인자는 회사에 관계없이 지정할 수 있습니다.
      </div>
    </form>
  );
}
