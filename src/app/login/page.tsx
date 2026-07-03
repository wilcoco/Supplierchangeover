'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>업체 이관 협업 시스템</h1>
        <div className="sub">외주 협력업체 생산처 변경 프로세스 관리</div>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <label className="fld">
            <span className="lbl">아이디</span>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="fld">
            <span className="lbl">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <div className="mt16" style={{ textAlign: 'center', fontSize: 13 }}>
          계정이 없으신가요? <Link href="/signup">업체 가입 신청</Link>
        </div>
      </div>
    </div>
  );
}
