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
