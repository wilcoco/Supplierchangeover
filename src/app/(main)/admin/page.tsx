import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  setCompanyStatus,
  setUserStatus,
  setUserRole,
  setCompanyTeams,
  setUserTeam,
  createCompany,
  createUser,
  resetPassword,
} from '@/actions/admin';
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS, fmtDate } from '@/lib/format';

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [companies, users] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { users: true } } },
    }),
    prisma.user.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { company: true },
    }),
  ]);

  const pendingCompanies = companies.filter((c) => c.status === 'PENDING');
  const pendingUsers = users.filter((u) => u.status === 'PENDING');

  return (
    <div className="container">
      <div className="page-title">관리</div>
      <div className="page-sub">협력사·사용자 등록 및 계정 관리 (캠스)</div>

      <div className="grid-2">
        <div className="card">
          <h2>협력사 추가</h2>
          <form action={createCompany}>
            <label className="fld">
              <span className="lbl">회사명</span>
              <input type="text" name="name" required placeholder="예: (주)한국부품" />
            </label>
            <label className="fld">
              <span className="lbl">팀 목록 (선택, 쉼표로 구분)</span>
              <input type="text" name="teams" placeholder="예: 생산팀, 품질팀" />
            </label>
            <button className="btn" type="submit">협력사 등록</button>
          </form>
        </div>

        <div className="card">
          <h2>사용자 사전 등록</h2>
          <div className="muted" style={{ marginBottom: 10 }}>
            회사·팀·담당자를 미리 정해 계정을 만들어 두고, 해당 담당자에게 아이디와 초기
            비밀번호를 전달하면 바로 로그인해 사용할 수 있습니다.
          </div>
          <form action={createUser}>
            <div className="row" style={{ marginBottom: 10 }}>
              <select name="companyId" required style={{ flex: 1 }}>
                <option value="">-- 소속 회사 --</option>
                {companies
                  .filter((c) => c.status === 'ACTIVE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.isHost ? ' (캠스)' : ''}
                    </option>
                  ))}
              </select>
              <input type="text" name="team" placeholder="소속 팀 (선택)" style={{ flex: 1 }} />
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <input type="text" name="name" required placeholder="이름" style={{ flex: 1 }} />
              <input type="text" name="loginId" required minLength={3} placeholder="아이디" style={{ flex: 1 }} />
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <input
                type="text"
                name="password"
                placeholder="초기 비밀번호 (비우면 init1234!)"
                style={{ flex: 1 }}
              />
              <select name="role" style={{ flex: 1 }}>
                <option value="MEMBER">일반 사용자</option>
                <option value="COMPANY_ADMIN">회사 관리자</option>
              </select>
            </div>
            <button className="btn" type="submit">계정 생성</button>
          </form>
        </div>
      </div>

      {(pendingCompanies.length > 0 || pendingUsers.length > 0) && (
        <div className="card" style={{ borderColor: '#fbbf24' }}>
          <h2>승인 대기</h2>
          {pendingCompanies.length > 0 && (
            <>
              <div className="muted" style={{ marginBottom: 6 }}>
                신규 회사
              </div>
              <table className="tbl" style={{ marginBottom: 16 }}>
                <tbody>
                  {pendingCompanies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.name}</b> <span className="muted">({fmtDate(c.createdAt)} 신청)</span>
                      </td>
                      <td style={{ width: 180 }}>
                        <div className="row">
                          <form action={setCompanyStatus}>
                            <input type="hidden" name="companyId" value={c.id} />
                            <input type="hidden" name="status" value="ACTIVE" />
                            <button className="btn sm success" type="submit">승인</button>
                          </form>
                          <form action={setCompanyStatus}>
                            <input type="hidden" name="companyId" value={c.id} />
                            <input type="hidden" name="status" value="REJECTED" />
                            <button className="btn sm danger" type="submit">거절</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {pendingUsers.length > 0 && (
            <>
              <div className="muted" style={{ marginBottom: 6 }}>
                신규 사용자
              </div>
              <table className="tbl">
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b>{u.name}</b> ({u.loginId}) · {u.company.name}
                        {u.company.status === 'PENDING' && (
                          <span className="badge pending" style={{ marginLeft: 6 }}>회사도 승인 대기</span>
                        )}
                      </td>
                      <td style={{ width: 180 }}>
                        <div className="row">
                          <form action={setUserStatus}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="status" value="ACTIVE" />
                            <button className="btn sm success" type="submit">승인</button>
                          </form>
                          <form action={setUserStatus}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="status" value="REJECTED" />
                            <button className="btn sm danger" type="submit">거절</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="muted mt8">
                사용자를 승인하면 승인 대기 중인 소속 회사도 함께 승인됩니다.
              </div>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2>회사 목록</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>회사</th>
              <th>구분</th>
              <th>사용자</th>
              <th>팀 목록 (쉼표로 구분)</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td>{c.isHost ? <span className="badge blue">캠스 (운영)</span> : '협력사'}</td>
                <td>{c._count.users}명</td>
                <td style={{ minWidth: 280 }}>
                  <form action={setCompanyTeams} className="row">
                    <input type="hidden" name="companyId" value={c.id} />
                    <input
                      type="text"
                      name="teams"
                      defaultValue={c.teams.join(', ')}
                      placeholder="예: 생산팀, 양산품질팀, 자재관리팀"
                      style={{ flex: 1 }}
                    />
                    <button className="btn sm secondary" type="submit">저장</button>
                  </form>
                </td>
                <td>
                  <span className={`badge ${c.status.toLowerCase()}`}>
                    {ACCOUNT_STATUS_LABELS[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="muted mt8">
          팀 목록은 과제의 담당 팀 선택 드롭다운에 사용됩니다.
        </div>
      </div>

      <div className="card">
        <h2>사용자 목록</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>이름</th>
              <th>아이디</th>
              <th>회사</th>
              <th>소속 팀</th>
              <th>역할</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="muted">{u.loginId}</td>
                <td>{u.company.name}</td>
                <td>
                  <form action={setUserTeam} className="row">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="team" defaultValue={u.team ?? ''} style={{ width: 130 }}>
                      <option value="">(없음)</option>
                      {Array.from(new Set([...u.company.teams, ...(u.team ? [u.team] : [])])).map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        )
                      )}
                    </select>
                    <button className="btn sm secondary" type="submit">저장</button>
                  </form>
                </td>
                <td>
                  {u.id === admin.id ? (
                    ROLE_LABELS[u.role]
                  ) : (
                    <form action={setUserRole} className="row">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} style={{ width: 140 }}>
                        <option value="ADMIN">시스템 관리자</option>
                        <option value="COMPANY_ADMIN">회사 관리자</option>
                        <option value="MEMBER">일반 사용자</option>
                      </select>
                      <button className="btn sm secondary" type="submit">변경</button>
                    </form>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.status.toLowerCase()}`}>
                    {ACCOUNT_STATUS_LABELS[u.status]}
                  </span>
                </td>
                <td>
                  {u.id !== admin.id && (
                    <form action={resetPassword}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="btn sm secondary" type="submit">
                        비밀번호 초기화
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="muted mt8">비밀번호 초기화 시 임시 비밀번호는 init1234! 입니다.</div>
      </div>
    </div>
  );
}
