/* 초기 데이터 시드 (멱등) — 주관사/관리자 계정 + 내장 프로세스 템플릿 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const NODES = [
  { id: 'n1769756242586_1', name: 'Start', type: 'start', position: { x: 173.87, y: -1012.04 } },
  { id: 'n1769756257321_2', name: '반납 공문/문서 접수', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 174.1, y: -824.65 }, description: '협력업체 반납공문 접수' },
  { id: 'n1769756416785_5', name: '반납 결정 보고 및 승인', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 173.87, y: -593.28 }, description: '협력사 반납 사유 확인 / 보고\n단순 어려움 호소 및 문제점 해결시 현상 유지' },
  { id: 'n1769756316697_4', name: '협력사 반송 (현상 유지)', type: 'gateway_xor', position: { x: 1870.17, y: -141.07 } },
  { id: 'n1769759235138_24', name: '이관결정', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 174.21, y: -263.85 }, description: '내부 보고 / 승인 완료' },
  { id: 'n1769756742064_7', name: '이관 계획 수립', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: -309.38, y: -75.61 }, description: '팀별 계획 수립\n\n양산팀 : 4M / ISIR 일정 수립\n개발팀 : 시사출 일정 수립, 마스터 리스트\n설계팀 : 해당 품목 도면 확보 (2D/3D)\n자재관리팀 : 재고조사 일정 수립 (ASSY, SUB, 부자재, 원자재, 이관대상 납입용기 수량 등)\n영업관리팀 : 신규 업체 선정 계획' },
  { id: 'n1769756778081_8', name: '4M 일정 수립', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: -309.94, y: 95.23 } },
  { id: 'n1769756828616_9', name: '대상 품목 리스트 조사', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 405.48, y: 165.52 }, description: '납입품목 리스트 (영업관리팀-마감, 자재관리팀 AS 납입부품 확인 필요)' },
  { id: 'n1781587159097_1', name: '마스터리스트 작성/업데이트', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 197.16, y: 161.45 }, description: '마스터리스트 상세 작성 (개발팀)' },
  { id: 'n1769756917978_10', name: '대상품목 금형 리스트 조사', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 617.33, y: 166.13 }, description: '개발팀\n금형 리스트 / 금형 점검' },
  { id: 'n1769756944824_11', name: '대상품목 검사구 리스트 조사', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 870.57, y: 169.47 }, description: '양산품질팀\n검사구 리스트 / 검사구 점검' },
  { id: 'n1769756966096_12', name: '대상품목 설비 리스트 조사', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 1078.99, y: 167.16 }, description: '생기팀/외주관리팀 (자재/상생)\n설비 리스트 / 설비 점검' },
  { id: 'n1769756987464_13', name: '대상 품목 대차, 납입용기 조사', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 1298.69, y: 167.16 }, description: '대차, 용기 리스트\n대차, 용기 점검 (수량 및 노후 조사 포함)' },
  { id: 'n1770776557656_3', name: '재고 조사', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 1549.17, y: 167.85 } },
  { id: 'n1781587400330_3', name: '대여자산 확인', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: -3, y: 161 }, description: '현 보관처 대여자산 리스트 확인 (영업관리팀-공증관련팀)' },
  { id: 'n1769756655969_6', name: '양산처 선정', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 10, position: { x: 795.32, y: 350.62 }, description: '업체 견적 접수 / 비교 분석\n부품가격 합의서\n업체선정 계약 체결 진행 (모두사인)' },
  { id: 'n1769757171255_14', name: '이관 진행', type: 'gateway_parallel', position: { x: 184.42, y: 474.92 } },
  { id: 'n1769757231623_15', name: '품질 확보', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 15, position: { x: -30.09, y: 611.84 }, description: '선정 협력사 육성\n제품 육성\n제품 T/O' },
  { id: 'n1769757268487_16', name: '재고 확보', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 10, position: { x: 173.29, y: 612.31 }, description: '이관 시점 전후 안전재고 확보\n(안전 재고 확보를 위한 SUB 원재료, 부품, 납입용기 확인 필요)' },
  { id: 'n1769757280535_17', name: '금형/설비 이동 (반출/반입)', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 7, position: { x: 431.3, y: 615.2 }, description: '반납업체 금형/설비 등 이동 시 필요 차량 확인 및 수배\n\n개발팀 : 금형 이상 유무 점검\n자재관리팀 : 이동 시 필요 차량 배차' },
  { id: 'n1769757298870_18', name: '잔여 원자재 이동 外', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 654.39, y: 616.99 }, description: '1. 반납업체 잔여 원재료\n2. 반제품 확인\n3. SUB 품목 확인' },
  { id: 'n1770776323354_1', name: 'AS 납입지 변경', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 924.86, y: 480.03 }, description: '해당 시 (동일 지역이면 해당 없음)' },
  { id: 'n1770776413601_2', name: '납입지 변경 대상 확인', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 924.53, y: 617.63 }, description: '변경 협력사가 동일 지역이면 해당 없음' },
  { id: 'n1769757364638_19', name: '이관 완료', type: 'gateway_parallel', position: { x: 184.29, y: 788.58 } },
  { id: 'n1769757392583_20', name: '완료 보고', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 183.67, y: 934.47 } },
  { id: 'n1769757412086_21', name: '대여자산공증 실시', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 184.16, y: 1038.17 } },
  { id: 'n1769757443654_22', name: 'End', type: 'end', position: { x: 1871.31, y: 1397.85 } },
];

const EDGES = [
  { id: 'e1', source: 'n1769756242586_1', target: 'n1769756257321_2' },
  { id: 'e2', source: 'n1769756257321_2', target: 'n1769756416785_5' },
  { id: 'e3', source: 'n1769756416785_5', target: 'n1769756316697_4', condition: "last.approval.status == 'REJECTED'" },
  { id: 'e4', source: 'n1769756416785_5', target: 'n1769759235138_24', condition: "last.approval.status == 'APPROVED'" },
  { id: 'e5', source: 'n1769756316697_4', target: 'n1769757443654_22' },
  { id: 'e6', source: 'n1769759235138_24', target: 'n1769756742064_7' },
  { id: 'e7', source: 'n1769759235138_24', target: 'n1769756828616_9' },
  { id: 'e8', source: 'n1769759235138_24', target: 'n1769756917978_10' },
  { id: 'e9', source: 'n1769759235138_24', target: 'n1769756944824_11' },
  { id: 'e10', source: 'n1769759235138_24', target: 'n1769756966096_12' },
  { id: 'e11', source: 'n1769759235138_24', target: 'n1769756987464_13' },
  { id: 'e12', source: 'n1769759235138_24', target: 'n1770776557656_3' },
  { id: 'e13', source: 'n1769759235138_24', target: 'n1781587159097_1' },
  { id: 'e14', source: 'n1769759235138_24', target: 'n1781587400330_3' },
  { id: 'e15', source: 'n1769756742064_7', target: 'n1769756778081_8' },
  { id: 'e16', source: 'n1769756778081_8', target: 'n1769757171255_14' },
  { id: 'e17', source: 'n1769756828616_9', target: 'n1769756655969_6' },
  { id: 'e18', source: 'n1769756917978_10', target: 'n1769756655969_6' },
  { id: 'e19', source: 'n1769756944824_11', target: 'n1769756655969_6' },
  { id: 'e20', source: 'n1769756966096_12', target: 'n1769756655969_6' },
  { id: 'e21', source: 'n1769756987464_13', target: 'n1769756655969_6' },
  { id: 'e22', source: 'n1770776557656_3', target: 'n1769756655969_6' },
  { id: 'e23', source: 'n1781587159097_1', target: 'n1769756655969_6' },
  { id: 'e24', source: 'n1781587400330_3', target: 'n1769756655969_6' },
  { id: 'e25', source: 'n1769756655969_6', target: 'n1769757171255_14' },
  { id: 'e26', source: 'n1769756655969_6', target: 'n1770776323354_1' },
  { id: 'e27', source: 'n1770776323354_1', target: 'n1770776413601_2' },
  { id: 'e28', source: 'n1770776413601_2', target: 'n1769757364638_19' },
  { id: 'e29', source: 'n1769757171255_14', target: 'n1769757231623_15' },
  { id: 'e30', source: 'n1769757171255_14', target: 'n1769757268487_16' },
  { id: 'e31', source: 'n1769757171255_14', target: 'n1769757280535_17' },
  { id: 'e32', source: 'n1769757171255_14', target: 'n1769757298870_18' },
  { id: 'e33', source: 'n1769757231623_15', target: 'n1769757364638_19' },
  { id: 'e34', source: 'n1769757268487_16', target: 'n1769757364638_19' },
  { id: 'e35', source: 'n1769757280535_17', target: 'n1769757364638_19' },
  { id: 'e36', source: 'n1769757298870_18', target: 'n1769757364638_19' },
  { id: 'e37', source: 'n1769757364638_19', target: 'n1769757392583_20' },
  { id: 'e38', source: 'n1769757392583_20', target: 'n1769757412086_21' },
  { id: 'e39', source: 'n1769757412086_21', target: 'n1769757443654_22' },
];

const DEFAULT_TEAMS = [
  '생산팀', '생산기술팀', '양산품질팀', '상생협력팀', '자재관리팀', '영업관리팀',
  '경영관리팀', '전산팀', '함평팀', '에스콘', '설계팀', '개발팀',
];

async function main() {
  // 운영사(캠스) 정리 — 기존에 '주관사'로 생성된 경우 캠스로 정정하되,
  // 이미 '캠스'라는 회사가 따로 있으면 그 회사를 운영사로 승격하고 병합한다.
  let host = await prisma.company.findFirst({ where: { isHost: true } });
  const named = await prisma.company.findUnique({ where: { name: '캠스' } });

  if (host && host.name !== '캠스') {
    if (!named) {
      host = await prisma.company.update({ where: { id: host.id }, data: { name: '캠스' } });
      console.log('운영사 이름을 캠스로 변경');
    } else {
      // '캠스'가 별도 회사로 존재 → 캠스를 운영사로 승격, 구 운영사 사용자 이동 후 강등
      await prisma.company.update({
        where: { id: named.id },
        data: { isHost: true, status: 'ACTIVE' },
      });
      await prisma.user.updateMany({
        where: { companyId: host.id },
        data: { companyId: named.id },
      });
      await prisma.company.update({
        where: { id: host.id },
        data: { isHost: false, status: 'REJECTED', name: `(구)${host.name}` },
      });
      console.log(`운영사를 '캠스'로 병합 (기존 '${host.name}' 사용자 이동)`);
      host = await prisma.company.findUnique({ where: { id: named.id } });
    }
  }
  if (!host) {
    host = named
      ? await prisma.company.update({
          where: { id: named.id },
          data: { isHost: true, status: 'ACTIVE' },
        })
      : await prisma.company.create({
          data: { name: '캠스', isHost: true, status: 'ACTIVE', teams: DEFAULT_TEAMS },
        });
  }
  if (!host.teams || host.teams.length === 0) {
    await prisma.company.update({ where: { id: host.id }, data: { teams: DEFAULT_TEAMS } });
  }

  const adminId = process.env.ADMIN_LOGIN_ID || 'admin';
  const existing = await prisma.user.findUnique({ where: { loginId: adminId } });
  if (!existing) {
    const pw = process.env.ADMIN_PASSWORD || 'admin1234';
    await prisma.user.create({
      data: {
        loginId: adminId,
        passwordHash: bcrypt.hashSync(pw, 10),
        name: '시스템 관리자',
        role: 'ADMIN',
        status: 'ACTIVE',
        companyId: host.id,
      },
    });
    console.log(`관리자 계정 생성: ${adminId}`);
  }

  const templateName = '외주 협력업체 생산처 변경 (반납 접수)';
  const tpl = await prisma.processTemplate.findFirst({ where: { name: templateName } });
  if (!tpl) {
    await prisma.processTemplate.create({
      data: {
        name: templateName,
        description: '협력업체 반납 공문 접수부터 양산처 선정, 이관, 완료 보고까지의 표준 프로세스',
        estimatedDays: 60,
        isBuiltIn: true,
        nodes: NODES,
        edges: EDGES,
      },
    });
    console.log('내장 프로세스 템플릿 생성 완료');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
