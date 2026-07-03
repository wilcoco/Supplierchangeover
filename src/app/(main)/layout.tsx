import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return (
    <div>
      <nav className="topnav">
        <Link href="/dashboard" className="brand">
          업체 이관 협업
        </Link>
        <Link href="/dashboard" className="navlink">
          대시보드
        </Link>
        <Link href="/projects" className="navlink">
          프로젝트
        </Link>
        <Link href="/templates" className="navlink">
          프로세스 템플릿
        </Link>
        {user.role === 'ADMIN' && (
          <Link href="/admin" className="navlink">
            관리
          </Link>
        )}
        <div className="spacer" />
        <Link href="/notifications" className="navlink">
          알림{unread > 0 && <span className="badge-dot">{unread}</span>}
        </Link>
        <span className="userinfo">
          <b>{user.name}</b> · {user.company.name} · {ROLE_LABELS[user.role]}
        </span>
        <form action="/api/auth/logout" method="post">
          <button className="btn sm secondary" type="submit">
            로그아웃
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
