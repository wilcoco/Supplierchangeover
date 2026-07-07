import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { loginId, password } = await req.json();
  if (!loginId || !password) {
    return NextResponse.json({ error: '아이디와 비밀번호를 입력하세요.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { loginId: String(loginId).trim() },
    include: { company: true },
  });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  if (user.status === 'PENDING') {
    return NextResponse.json({ error: '계정이 승인 대기 중입니다. 캠스 승인 후 이용할 수 있습니다.' }, { status: 403 });
  }
  if (user.status === 'REJECTED') {
    return NextResponse.json({ error: '가입이 거절된 계정입니다.' }, { status: 403 });
  }
  if (user.role !== 'ADMIN' && user.company.status !== 'ACTIVE') {
    return NextResponse.json({ error: '소속 회사가 아직 승인되지 않았습니다.' }, { status: 403 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
