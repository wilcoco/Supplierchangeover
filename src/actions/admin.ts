'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { notifyUsers } from '@/lib/notify';

export async function setCompanyStatus(formData: FormData) {
  await requireAdmin();
  const companyId = String(formData.get('companyId'));
  const status = String(formData.get('status'));
  if (!['ACTIVE', 'REJECTED', 'PENDING'].includes(status)) return;
  await prisma.company.update({
    where: { id: companyId },
    data: { status: status as 'ACTIVE' | 'REJECTED' | 'PENDING' },
  });
  revalidatePath('/admin');
}

export async function setUserStatus(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get('userId'));
  const status = String(formData.get('status'));
  if (!['ACTIVE', 'REJECTED', 'PENDING'].includes(status)) return;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: status as 'ACTIVE' | 'REJECTED' | 'PENDING' },
    include: { company: true },
  });
  // 사용자를 승인할 때 회사가 아직 대기 상태면 함께 승인
  if (status === 'ACTIVE' && user.company.status === 'PENDING') {
    await prisma.company.update({
      where: { id: user.companyId },
      data: { status: 'ACTIVE' },
    });
  }
  if (status === 'ACTIVE') {
    await notifyUsers([userId], '가입이 승인되었습니다. 협업을 시작하세요!', '/dashboard');
  }
  revalidatePath('/admin');
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId'));
  const role = String(formData.get('role'));
  if (!['ADMIN', 'COMPANY_ADMIN', 'MEMBER'].includes(role)) return;
  if (userId === admin.id) return; // 자기 자신의 권한 강등 방지
  await prisma.user.update({
    where: { id: userId },
    data: { role: role as 'ADMIN' | 'COMPANY_ADMIN' | 'MEMBER' },
  });
  revalidatePath('/admin');
}

/** 협력사 직접 추가 — 캠스가 미리 등록 */
export async function createCompany(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get('name') || '').trim();
  if (!name) return;
  const dup = await prisma.company.findUnique({ where: { name } });
  if (dup) return;
  const teams = String(formData.get('teams') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.company.create({ data: { name, status: 'ACTIVE', teams } });
  revalidatePath('/admin');
}

/** 사용자 사전 등록 — 캠스가 회사·팀·담당자를 미리 정해 계정 생성 */
export async function createUser(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get('name') || '').trim();
  const loginId = String(formData.get('loginId') || '').trim();
  const companyId = String(formData.get('companyId') || '');
  const team = String(formData.get('team') || '').trim() || null;
  const role = String(formData.get('role') || 'MEMBER');
  const password = String(formData.get('password') || '') || 'init1234!';
  if (!name || loginId.length < 3 || !companyId) return;
  if (!['COMPANY_ADMIN', 'MEMBER'].includes(role)) return;
  const dup = await prisma.user.findUnique({ where: { loginId } });
  if (dup) return;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return;
  await prisma.user.create({
    data: {
      loginId,
      passwordHash: bcrypt.hashSync(password, 10),
      name,
      team,
      role: role as 'COMPANY_ADMIN' | 'MEMBER',
      status: 'ACTIVE', // 사전 등록 계정은 즉시 사용 가능
      companyId,
    },
  });
  revalidatePath('/admin');
}

/** 회사 팀 목록 설정 (쉼표 구분) */
export async function setCompanyTeams(formData: FormData) {
  await requireAdmin();
  const companyId = String(formData.get('companyId'));
  const teams = String(formData.get('teams') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.company.update({ where: { id: companyId }, data: { teams } });
  revalidatePath('/admin');
}

/** 사용자 소속 팀 지정 */
export async function setUserTeam(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get('userId'));
  const team = String(formData.get('team') || '').trim() || null;
  await prisma.user.update({ where: { id: userId }, data: { team } });
  revalidatePath('/admin');
}

export async function resetPassword(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get('userId'));
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: bcrypt.hashSync('init1234!', 10) },
  });
  await notifyUsers([userId], '비밀번호가 초기화되었습니다. (초기 비밀번호: init1234!)');
  revalidatePath('/admin');
}
