import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { notifyAdmins } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const loginId = String(body.loginId || '').trim();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim() || null;
  const companyId = String(body.companyId || '');
  const newCompanyName = String(body.newCompanyName || '').trim();

  if (!loginId || !password || !name) {
    return NextResponse.json({ error: '필수 항목을 모두 입력하세요.' }, { status: 400 });
  }
  if (loginId.length < 3) {
    return NextResponse.json({ error: '아이디는 3자 이상이어야 합니다.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
  }

  const dup = await prisma.user.findUnique({ where: { loginId } });
  if (dup) {
    return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
  }

  let targetCompanyId = companyId;
  let role: 'COMPANY_ADMIN' | 'MEMBER' = 'MEMBER';

  if (newCompanyName) {
    const dupCo = await prisma.company.findUnique({ where: { name: newCompanyName } });
    if (dupCo) {
      return NextResponse.json(
        { error: '이미 등록된 회사명입니다. 기존 회사를 선택해 가입하세요.' },
        { status: 409 }
      );
    }
    const company = await prisma.company.create({
      data: { name: newCompanyName, status: 'PENDING' },
    });
    targetCompanyId = company.id;
    role = 'COMPANY_ADMIN'; // 신규 회사의 첫 가입자는 회사 관리자
  } else {
    const company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
    if (!company) {
      return NextResponse.json({ error: '회사를 선택하거나 신규 등록하세요.' }, { status: 400 });
    }
  }

  const user = await prisma.user.create({
    data: {
      loginId,
      passwordHash: bcrypt.hashSync(password, 10),
      name,
      email,
      role,
      status: 'PENDING',
      companyId: targetCompanyId,
    },
    include: { company: true },
  });

  await notifyAdmins(
    `가입 승인 요청: ${user.company.name} / ${user.name} (${user.loginId})`,
    '/admin'
  );

  return NextResponse.json({ ok: true });
}
