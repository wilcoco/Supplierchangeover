'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Company = { id: string; name: string };

export default function SignupPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [companyId, setCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');
  const [team, setTeam] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((list: Company[]) => {
        setCompanies(list);
        if (list.length === 0) setMode('new');
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (mode === 'existing' && !companyId) {
      setError('회사를 선택하세요.');
      return;
    }
    if (mode === 'new' && !newCompanyName.trim()) {
      setError('회사명을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId,
          password,
          name,
          email,
          team,
          companyId: mode === 'existing' ? companyId : '',
          newCompanyName: mode === 'new' ? newCompanyName : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '가입 신청에 실패했습니다.');
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>가입 신청 완료</h1>
          <div className="alert success mt16">
            가입 신청이 접수되었습니다.
            <br />
            캠스 관리자의 승인 후 로그인할 수 있습니다.
          </div>
          <Link href="/login" className="btn" style={{ display: 'block', textAlign: 'center' }}>
            로그인 화면으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>업체 가입 신청</h1>
        <div className="sub">회사·아이디·비밀번호로 가입 후 캠스 승인을 받습니다.</div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <label className="fld">
            <span className="lbl">소속 회사</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'existing' | 'new')}
            >
              <option value="existing">기존 등록 회사 선택</option>
              <option value="new">신규 회사 등록</option>
            </select>
          </label>
          {mode === 'existing' ? (
            <label className="fld">
              <span className="lbl">회사 선택</span>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">-- 회사를 선택하세요 --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="fld">
              <span className="lbl">회사명 (신규)</span>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="예: (주)한국부품"
              />
              <span className="muted">신규 회사의 첫 가입자는 회사 관리자가 됩니다.</span>
            </label>
          )}
          <label className="fld">
            <span className="lbl">이름</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="fld">
            <span className="lbl">아이디 (3자 이상)</span>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              minLength={3}
            />
          </label>
          <label className="fld">
            <span className="lbl">비밀번호 (8자 이상)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="fld">
            <span className="lbl">비밀번호 확인</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </label>
          <label className="fld">
            <span className="lbl">소속 팀 (선택)</span>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="예: 영업관리팀"
            />
          </label>
          <label className="fld">
            <span className="lbl">이메일 (선택)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '신청 중…' : '가입 신청'}
          </button>
        </form>
        <div className="mt16" style={{ textAlign: 'center', fontSize: 13 }}>
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
