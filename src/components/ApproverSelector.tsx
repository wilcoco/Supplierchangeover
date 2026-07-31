'use client';

import { useState } from 'react';
import { setApproverType } from '@/actions/tasks';

type CompanyOpt = { id: string; name: string; isHost: boolean };
type UserOpt = { id: string; name: string; companyId: string; companyName: string; team: string | null };

/**
 * 완료 승인자 지정 — 기본 흐름은 "승인 업체 선택 → 그 업체 담당자 선택".
 * 역할 기반(캠스 관리자/회사 관리자) 방식은 보조 옵션으로 유지.
 */
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
  const currentUser = users.find((u) => u.id === currentUserId);
  const [type, setType] = useState(currentType);
  const [filterCompany, setFilterCompany] = useState(
    currentUser?.companyId ?? currentCompanyId ?? ''
  );
  const [userId, setUserId] = useState(currentUserId ?? '');
  const [err, setErr] = useState('');

  const needUser = type === 'USER';
  const needCompany = type === 'COMPANY';
  const filteredUsers = filterCompany
    ? users.filter((u) => u.companyId === filterCompany)
    : users;

  return (
    <form
      action={setApproverType}
      onSubmit={(e) => {
        if (needUser && !userId) {
          e.preventDefault();
          setErr('승인 업체를 고른 뒤 담당자를 선택하고 변경을 누르세요.');
          return;
        }
        if (needCompany && !filterCompany) {
          e.preventDefault();
          setErr('승인을 담당할 업체를 선택한 뒤 변경을 누르세요.');
          return;
        }
        setErr('');
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      {needCompany && <input type="hidden" name="approverCompanyId" value={filterCompany} />}
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
          <option value="USER">지정 담당자 승인 (업체 → 담당자 선택)</option>
          <option value="COMPANY">지정 업체의 회사 관리자 승인</option>
          <option value="COMPANY_ADMIN">담당 업체의 회사 관리자 승인</option>
          <option value="HOST_ADMIN">캠스 관리자(시스템 관리자) 승인</option>
          <option value="NONE">승인 불필요 (즉시 완료)</option>
        </select>
        <button className="btn sm secondary" type="submit">
          변경
        </button>
      </div>

      {(needUser || needCompany) && (
        <div className="row" style={{ marginBottom: 6 }}>
          <select
            value={filterCompany}
            onChange={(e) => {
              setFilterCompany(e.target.value);
              setUserId('');
              setErr('');
            }}
            style={{ flex: 1 }}
          >
            <option value="">{needUser ? '승인 업체 (전체 보기)' : '-- 승인 업체 선택 --'}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isHost ? ' (캠스)' : ''}
              </option>
            ))}
          </select>
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
              <option value="">-- 승인 담당자 선택 --</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.team ? ` (${u.team})` : ''}
                  {filterCompany ? '' : ` — ${u.companyName}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {needUser && filterCompany && filteredUsers.length === 0 && (
        <div className="muted" style={{ marginBottom: 6 }}>
          이 업체에 등록된 사용자가 없습니다. 관리 화면에서 사용자를 사전 등록하세요.
        </div>
      )}

      {err && (
        <div className="alert error" style={{ marginBottom: 6, padding: '6px 10px' }}>
          {err}
        </div>
      )}
      <div className="muted">
        현재: {currentLabel} · 캠스 관리자는 항상 대신 승인할 수 있습니다(백업 결재선).
      </div>
    </form>
  );
}
