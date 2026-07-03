import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { markAllNotificationsRead } from '@/actions/account';
import { fmtDateTime } from '@/lib/format';

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <div className="page-title">알림</div>
          <div className="page-sub">읽지 않은 알림 {unread}건</div>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="btn sm secondary" type="submit">
              모두 읽음 처리
            </button>
          </form>
        )}
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div className="muted">알림이 없습니다.</div>
        ) : (
          <table className="tbl">
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} style={n.read ? { opacity: 0.65 } : undefined}>
                  <td style={{ width: 14 }}>{!n.read && <span className="badge-dot"> </span>}</td>
                  <td>{n.link ? <Link href={n.link}>{n.message}</Link> : n.message}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                    {fmtDateTime(n.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
