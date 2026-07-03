import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  setCompanyStatus,
  setUserStatus,
  setUserRole,
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
      <div className="page-sub">업체·사용자 가입 승인 및 계정 관리</div>

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
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td>{c.isHost ? <span className="badge blue">주관사</span> : '협력업체'}</td>
                <td>{c._count.users}명</td>
                <td>
                  <span className={`badge ${c.status.toLowerCase()}`}>
                    {ACCOUNT_STATUS_LABELS[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>사용자 목록</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>이름</th>
              <th>아이디</th>
              <th>회사</th>
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
