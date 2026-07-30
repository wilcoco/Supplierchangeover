/* 초기 데이터 시드 (멱등) — 주관사/관리자 계정 + 내장 프로세스 템플릿 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const NODES = [
  { id: 'n1769756242586_1', name: 'Start', type: 'start', position: { x: 173.87, y: -1012.04 } },
  { id: 'n1769756257321_2', name: '반납 공문/문서 접수', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 174.1, y: -824.65 }, description: '협력업체 반납공문 접수' },
  { id: 'n1769756416785_5', name: '반납 결정 보고 및 승인', type: 'task', taskType: 'WORKLOG', isMilestone: true, approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 173.87, y: -593.28 }, description: '협력사 반납 사유 확인 / 보고\n단순 어려움 호소 및 문제점 해결시 현상 유지' },
  { id: 'n1769756316697_4', name: '협력사 반송 (현상 유지)', type: 'gateway_xor', position: { x: 1870.17, y: -141.07 } },
  { id: 'n1769759235138_24', name: '이관결정', type: 'task', taskType: 'WORKLOG', isMilestone: true, approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 174.21, y: -263.85 }, description: '내부 보고 / 승인 완료' },
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
  { id: 'n1769756655969_6', name: '양산처 선정', type: 'task', taskType: 'WORKLOG', isMilestone: true, approverType: 'HOST_ADMIN', durationDays: 10, position: { x: 795.32, y: 350.62 }, description: '업체 견적 접수 / 비교 분석\n부품가격 합의서\n업체선정 계약 체결 진행 (모두사인)' },
  { id: 'n1769757171255_14', name: '이관 진행', type: 'gateway_parallel', position: { x: 184.42, y: 474.92 } },
  { id: 'n1769757231623_15', name: '품질 확보', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 15, position: { x: -30.09, y: 611.84 }, description: '선정 협력사 육성\n제품 육성\n제품 T/O' },
  { id: 'n1769757268487_16', name: '재고 확보', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 10, position: { x: 173.29, y: 612.31 }, description: '이관 시점 전후 안전재고 확보\n(안전 재고 확보를 위한 SUB 원재료, 부품, 납입용기 확인 필요)' },
  { id: 'n1769757280535_17', name: '금형/설비 이동 (반출/반입)', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 7, position: { x: 431.3, y: 615.2 }, description: '반납업체 금형/설비 등 이동 시 필요 차량 확인 및 수배\n\n개발팀 : 금형 이상 유무 점검\n자재관리팀 : 이동 시 필요 차량 배차' },
  { id: 'n1769757298870_18', name: '잔여 원자재 이동 外', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 5, position: { x: 654.39, y: 616.99 }, description: '1. 반납업체 잔여 원재료\n2. 반제품 확인\n3. SUB 품목 확인' },
  { id: 'n1770776323354_1', name: 'AS 납입지 변경', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 924.86, y: 480.03 }, description: '해당 시 (동일 지역이면 해당 없음)' },
  { id: 'n1770776413601_2', name: '납입지 변경 대상 확인', type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 924.53, y: 617.63 }, description: '변경 협력사가 동일 지역이면 해당 없음' },
  { id: 'n1769757364638_19', name: '이관 완료', type: 'gateway_parallel', isMilestone: true, position: { x: 184.29, y: 788.58 } },
  { id: 'n1769757392583_20', name: '완료 보고', type: 'task', taskType: 'WORKLOG', isMilestone: true, approverType: 'HOST_ADMIN', durationDays: 3, position: { x: 183.67, y: 934.47 } },
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

// 캠스 임원 조직 (담당 팀 드롭다운에 함께 노출)
const LEADERSHIP_TEAMS = [
  '생산관리실장', '품질경영실장', '함평공장장', '연구개발실장', '경영관리실장',
  '경영관리대표', '생산관리대표',
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
    host = await prisma.company.update({
      where: { id: host.id },
      data: { teams: [...DEFAULT_TEAMS, ...LEADERSHIP_TEAMS] },
    });
  }
  // 임원 조직이 하나도 없으면 1회 추가 (이후 관리 화면에서 자유롭게 편집 가능)
  if (!LEADERSHIP_TEAMS.some((t) => host.teams.includes(t))) {
    await prisma.company.update({
      where: { id: host.id },
      data: { teams: [...host.teams, ...LEADERSHIP_TEAMS] },
    });
    console.log('캠스 임원 조직 추가:', LEADERSHIP_TEAMS.join(', '));
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

  // 기존 내장 템플릿에 마일스톤 지정이 전혀 없으면 1회 기본 지정
  const MILESTONE_NAMES = ['반납 결정 보고 및 승인', '이관결정', '양산처 선정', '이관 완료', '완료 보고'];
  const builtins = await prisma.processTemplate.findMany({ where: { isBuiltIn: true } });
  for (const t of builtins) {
    const nodes = t.nodes;
    if (Array.isArray(nodes) && !nodes.some((n) => n.isMilestone)) {
      const updated = nodes.map((n) =>
        MILESTONE_NAMES.includes(n.name) ? { ...n, isMilestone: true } : n
      );
      await prisma.processTemplate.update({ where: { id: t.id }, data: { nodes: updated } });
      console.log('내장 템플릿 마일스톤 기본 지정');
    }
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

  await seedAX1(host);
}


// ───────────────── AX1 EV 사출양산처 변경 (신양기업 반납) ─────────────────
const AX1_ITEMS = [
  '영업관리팀 : STD CVM01859 863CB-GX000 COVER-CHARGE DOOR INNER (STD/DC COMBO) — 아이앤테크(주) / 신양기업 → 신성화학',
  '영업관리팀 : OPT CVM01860 863CB-GX300 COVER-CHARGE DOOR INNER (OPT/DC COMBO) — 아이앤테크(주) / 신양기업 → 신성화학',
  '영업관리팀 : CR CVM01986 863CB-GX700 COVER-CHARGE DOOR INNER (DC COMBO) — (주)현태금형 / 신양기업 → 신성화학',
  '영업관리팀 : JPN CVM01861 863CB-GX500 COVER-CHARGE DOOR INNER (STD/CHADEMO) — 아이앤테크(주) / 신양기업 → 신성화학',
  '영업관리팀 : CR JPN CVM01987 863CB-GX900 COVER-CHARGE DOOR INNER (CHADEMO) — (주)현태금형 / 신양기업 → 신성화학',
  '영업관리팀 : CVM01862 863CD-GX000 HOUSING-CHARGE DR (DC COMBO) — 아이앤테크(주) / 신양기업 → G금강',
  '영업관리팀 : CR CVM01988 863CD-GX700 HOUSING-CHARGE DR (DC COMBO) — (주)현태금형 / 신양기업 → G금강',
  '영업관리팀 : JPN CVM01863 863CD-GX200 HOUSING-CHARGE DR (CHADEMO) — 아이앤테크(주) / 신양기업 → G금강',
  '영업관리팀 : CR JPN CVM01989 863CD-GX900 HOUSING-CHARGE DR (CHADEMO) — (주)현태금형 / 신양기업 → G금강',
  '영업관리팀 : CVM01864 863CE-GX000 GOOSE NECK (DC COMBO) — 아이앤테크(주) / 신양기업 → G금강',
  '영업관리팀 : CR CVM01990 863CE-GX700 GOOSE NECK (DC COMBO) — (주)현태금형 / 신양기업 → G금강',
  '영업관리팀 : JPN CVM01865 863CE-GX200 GOOSE NECK (CHADEMO) — 아이앤테크(주) / 신양기업 → G금강',
  '영업관리팀 : CR JPN CVM01991 863CE-GX900 GOOSE NECK (CHADEMO) — (주)현태금형 / 신양기업 → G금강',
];

function ax1Nodes(hostId) {
  const t = (o) => ({ type: 'task', taskType: 'WORKLOG', approverType: 'HOST_ADMIN', defaultCompanyId: hostId, ...o });
  return [
    { id: 'ax1_start', name: 'Start', type: 'start', position: { x: 0, y: -120 } },
    t({ id: 'ax1_notify', name: '라도 사전 통보', defaultTeam: '영업관리팀', durationDays: 1, position: { x: 0, y: 0 }, description: 'AX1 EV 사출양산처 변경 사전 통보 (7/30)\n협력사 반납 요청 수용, 양산라인 공백 없는 운영 목적' }),
    t({ id: 'ax1_letter', name: '고객사 공문 발송', isMilestone: true, defaultTeam: '함평팀', durationDays: 13, position: { x: 0, y: 120 }, description: '고객사 공문 발송 (목표 8/13)' }),
    t({ id: 'ax1_to_plan', name: 'T/O 계획 수립', isMilestone: true, defaultTeam: '함평팀', durationDays: 8, position: { x: 0, y: 240 }, description: '협력사(신성화학/G금강) T/O 계획 수립 (목표 8/21)' }),
    { id: 'ax1_g1', name: '검증 진행', type: 'gateway_parallel', position: { x: 0, y: 360 } },
    t({ id: 'ax1_issues', name: '이슈사항 검토/해결', defaultTeam: '함평팀', durationDays: 30, position: { x: -320, y: 480 }, description: '함평팀 : 도장 박리 현상 확인/대응\n영업관리팀 : 신양기업 터치업 지속 가능 유무 확인 (지속 시 비용 상승 금액 확인)\n함평팀 : 제품 품확 평가 후 터치업 삭제 검토\n함평팀 : 도장 적용 시 품질 악조건 검토\n함평팀 : 구즈넥/이너커버/하우징 터치업 적용 확인' }),
    t({ id: 'ax1_items', name: '대상 품목/금형 확인 (13품목)', defaultTeam: '영업관리팀', durationDays: 10, position: { x: 320, y: 480 }, description: AX1_ITEMS.join('\n') }),
    t({ id: 'ax1_quality', name: '제품품확 (2회 육성)', isMilestone: true, defaultTeam: '함평팀', durationDays: 61, position: { x: 0, y: 480 }, description: '제품 품확 2회 육성 (목표 10/21)' }),
    t({ id: 'ax1_cust_check', name: '고객사 제품 점검', defaultTeam: '함평팀', durationDays: 2, position: { x: 0, y: 600 }, description: '고객사 제품 점검 (목표 10/23)' }),
    { id: 'ax1_g2', name: '시험·점검 병렬', type: 'gateway_parallel', position: { x: 0, y: 720 } },
    t({ id: 'ax1_rel1', name: '제품신뢰성 시험 (내후 포함)', defaultTeam: '함평팀', durationDays: 7, position: { x: -450, y: 840 }, description: '목표 10/30한' }),
    t({ id: 'ax1_rel2', name: '제품신뢰성 시험 (내후 제외)', defaultTeam: '함평팀', durationDays: 7, position: { x: -150, y: 840 }, description: '목표 10/30한' }),
    t({ id: 'ax1_self_insp', name: '자체 공정점검', defaultTeam: '함평팀', durationDays: 7, position: { x: 150, y: 840 }, description: '목표 10/30한' }),
    t({ id: 'ax1_cust_insp', name: '고객사 공정점검', defaultTeam: '함평팀', durationDays: 7, position: { x: 450, y: 840 }, description: '목표 10/30한' }),
    { id: 'ax1_g3', name: '검증 완료', type: 'gateway_parallel', isMilestone: true, position: { x: 0, y: 960 } },
    t({ id: 'ax1_isir', name: 'ISIR 서류 제출', isMilestone: true, defaultTeam: '함평팀', durationDays: 1, position: { x: -160, y: 1080 }, description: 'ISIR 서류 제출 (목표 10/31)' }),
    t({ id: 'ax1_stock', name: '재고 확보', defaultTeam: '자재관리팀', durationDays: 7, position: { x: 160, y: 1080 }, description: '이관 시점 전후 안전재고 확보 (D+7)\n자재관리팀 : 납입용기 확인\n자재관리팀 : 잔여재고 관리\n자재관리팀 : 잔여 원소재 확인' }),
    { id: 'ax1_g4', name: '이관 준비 완료', type: 'gateway_parallel', position: { x: 0, y: 1200 } },
    t({ id: 'ax1_done', name: '이관 완료 보고', isMilestone: true, defaultTeam: '함평팀', durationDays: 1, position: { x: 0, y: 1320 }, description: '이관 완료 보고 (목표 11/1)' }),
    { id: 'ax1_end', name: 'End', type: 'end', position: { x: 0, y: 1440 } },
  ];
}

const AX1_EDGES = [
  ['ax1_start', 'ax1_notify'], ['ax1_notify', 'ax1_letter'], ['ax1_letter', 'ax1_to_plan'],
  ['ax1_to_plan', 'ax1_g1'],
  ['ax1_g1', 'ax1_issues'], ['ax1_g1', 'ax1_items'], ['ax1_g1', 'ax1_quality'],
  ['ax1_quality', 'ax1_cust_check'], ['ax1_cust_check', 'ax1_g2'],
  ['ax1_g2', 'ax1_rel1'], ['ax1_g2', 'ax1_rel2'], ['ax1_g2', 'ax1_self_insp'], ['ax1_g2', 'ax1_cust_insp'],
  ['ax1_rel1', 'ax1_g3'], ['ax1_rel2', 'ax1_g3'], ['ax1_self_insp', 'ax1_g3'], ['ax1_cust_insp', 'ax1_g3'],
  ['ax1_issues', 'ax1_g3'], ['ax1_items', 'ax1_g3'],
  ['ax1_g3', 'ax1_isir'], ['ax1_g3', 'ax1_stock'],
  ['ax1_isir', 'ax1_g4'], ['ax1_stock', 'ax1_g4'],
  ['ax1_g4', 'ax1_done'], ['ax1_done', 'ax1_end'],
].map(([s2, t2], i) => ({ id: 'ax1_e' + (i + 1), source: s2, target: t2 }));

// 최장 경로 기반 일정 산출 (엔진과 동일 로직)
function ax1Schedule(nodes, edges, startDate) {
  const dur = (n) => (n.type === 'task' ? Math.max(0, n.durationDays ?? 5) : 0);
  const est = new Map(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i <= edges.length; i++) {
    let moved = false;
    for (const e of edges) {
      const src = nodes.find((n) => n.id === e.source);
      if (!src) continue;
      const cand = (est.get(e.source) ?? 0) + dur(src);
      if (cand > (est.get(e.target) ?? 0)) { est.set(e.target, cand); moved = true; }
    }
    if (!moved) break;
  }
  const day = 86400000;
  const out = new Map();
  for (const n of nodes) {
    const s2 = new Date(startDate.getTime() + (est.get(n.id) ?? 0) * day);
    out.set(n.id, { plannedStart: s2, plannedEnd: new Date(s2.getTime() + dur(n) * day) });
  }
  return out;
}

async function seedAX1(host) {
  // 관련 협력사 등록
  for (const name of ['신양기업', '신성화학', 'G금강']) {
    await prisma.company.upsert({ where: { name }, update: {}, create: { name, status: 'ACTIVE' } });
  }

  const tplName = 'AX1 EV 사출양산처 변경 (신양기업 반납)';
  let tpl = await prisma.processTemplate.findFirst({ where: { name: tplName } });
  const nodes = ax1Nodes(host.id);
  if (!tpl) {
    tpl = await prisma.processTemplate.create({
      data: {
        name: tplName,
        description: 'AX1 EV 양산 사출양산처 변경 — 신양기업 반납, 신성화학/G금강 이관 (26.07.30 회의, 1안 기준)',
        estimatedDays: 95,
        isBuiltIn: true,
        nodes,
        edges: AX1_EDGES,
      },
    });
    console.log('AX1 템플릿 생성');
  }

  const projName = 'AX1 EV 사출양산처 변경 (신양기업 → 신성화학/G금강)';
  const exists = await prisma.project.findFirst({ where: { name: projName } });
  if (exists) return;

  const startDate = new Date('2026-07-30T00:00:00');
  const sched = ax1Schedule(nodes, AX1_EDGES, startDate);
  await prisma.project.create({
    data: {
      name: projName,
      description: '대상 13품목 (COVER-CHARGE DOOR INNER / HOUSING-CHARGE DR / GOOSE NECK) · 현보관처 신양기업 → 변경업체 신성화학·G금강 · 1안(기존 원소재 유지/터치업 유지) 기준',
      startDate,
      templateId: tpl.id,
      nodes,
      edges: AX1_EDGES,
      tasks: {
        create: nodes.map((n) => {
          const sc = sched.get(n.id);
          const isStart = n.type === 'start';
          const firstReady = n.id === 'ax1_notify'; // 시작 직후 진행 가능
          return {
            nodeId: n.id,
            name: n.name,
            type: n.type,
            taskType: n.taskType ?? null,
            description: n.description ?? null,
            isMilestone: n.isMilestone ?? false,
            approverType: n.approverType ?? 'HOST_ADMIN',
            assignedCompanyId: n.defaultCompanyId ?? null,
            assignedTeam: n.defaultTeam ?? null,
            status: isStart ? 'DONE' : firstReady ? 'READY' : 'WAITING',
            completedAt: isStart ? new Date() : null,
            plannedStart: sc ? sc.plannedStart : null,
            plannedEnd: sc ? sc.plannedEnd : null,
          };
        }),
      },
    },
  });
  console.log('AX1 프로젝트 생성 (시작일 2026-07-30, 과제 ' + nodes.length + '건)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
