import { requireUser } from '@/lib/auth';
import { changeMyPassword } from '@/actions/account';
import { ROLE_LABELS } from '@/lib/format';

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="page-title">내 정보</div>
      <div className="page-sub">계정 정보 확인 및 비밀번호 변경</div>

      <div className="card">
        <table className="tbl">
          <tbody>
            <tr>
              <th style={{ width: 100 }}>이름</th>
              <td>{user.name}</td>
            </tr>
            <tr>
              <th>아이디</th>
              <td>{user.loginId}</td>
            </tr>
            <tr>
              <th>회사</th>
              <td>{user.company.name}</td>
            </tr>
            <tr>
              <th>소속 팀</th>
              <td>{user.team ?? <span className="muted">미지정</span>}</td>
            </tr>
            <tr>
              <th>역할</th>
              <td>{ROLE_LABELS[user.role]}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>비밀번호 변경</h2>
        <form action={changeMyPassword}>
          <label className="fld">
            <span className="lbl">현재 비밀번호</span>
            <input type="password" name="current" required />
          </label>
          <label className="fld">
            <span className="lbl">새 비밀번호 (8자 이상)</span>
            <input type="password" name="next" required minLength={8} />
          </label>
          <button className="btn" type="submit">
            변경
          </button>
        </form>
        <div className="muted mt8">
          사전 등록 계정으로 처음 로그인했다면 초기 비밀번호를 꼭 변경하세요.
        </div>
      </div>
    </div>
  );
}
