/**
 * 초기 데이터: 관리자 계정 + 기본 키워드 사전
 *   npm run db:seed            → 관리자, 키워드
 *   npm run db:seed -- --demo  → 위 + 분야별 테스트 정비인원 계정
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeKeyword as norm } from "../src/lib/classify";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 기본값 사용
}

const prisma = new PrismaClient();

const KEYWORDS: Record<string, string[]> = {
  FIREPOWER: [
    "자주포", "견인포", "곡사포", "박격포", "화포", "포신", "포탑", "포가", "주퇴복좌기",
    "사격통제", "사통", "다련장", "천무", "k9", "k55", "kh179", "105mm", "155mm",
    "소총", "기관총", "기관포", "총열", "노리쇠", "조준경", "유탄발사기", "대전차", "k2소총", "k201",
  ],
  MOBILITY: [
    "전차", "장갑차", "차량", "트럭", "카고", "소형전술차량", "구난차", "k200", "k21", "k1a",
    "엔진", "변속기", "미션", "타이어", "궤도", "브레이크", "시동", "냉각수", "라디에이터",
    "조향", "핸들", "클러치", "배기", "연료펌프",
  ],
  COMMS: [
    "무전기", "통신기", "안테나", "교환기", "전화기", "송수신", "주파수", "암호장비",
    "prc", "tmmr", "ticn", "단말기", "중계기", "위성", "통신망", "랜선", "네트워크", "헤드셋", "핸드셋", "레이더",
  ],
  GENERAL: [
    "발전기", "공구", "정수기", "보일러", "냉난방기", "에어컨", "천막", "텐트", "조명", "전등",
    "취사", "세탁기", "펌프", "공기압축기", "콤프레샤", "용접기", "난로", "온풍기", "의자", "책상",
  ],
};


async function main() {
  const demo = process.argv.includes("--demo");

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPw = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
  const existing = await prisma.user.findUnique({ where: { username: adminUser } });
  if (!existing) {
    await prisma.user.create({
      data: {
        username: adminUser,
        passwordHash: await bcrypt.hash(adminPw, 12),
        name: "정비통제장교",
        role: "ADMIN",
        mustChangePw: true,
      },
    });
    console.log(`관리자 계정 생성: ${adminUser} (첫 로그인 시 비밀번호 변경 필요)`);
  } else {
    console.log(`관리자 계정 이미 존재: ${adminUser}`);
  }

  let added = 0;
  for (const [category, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      const word = norm(w);
      const r = await prisma.keyword.upsert({ where: { word }, create: { word, category }, update: {} });
      if (r.createdAt.getTime() > Date.now() - 5000) added++;
    }
  }
  console.log(`키워드 사전: ${added}개 추가 (기존 항목은 유지)`);

  if (demo) {
    const demoPw = await bcrypt.hash("Test1234!", 12);
    const staff = [
      ["fire1", "중사 김화력", "FIREPOWER"],
      ["move1", "중사 이기동", "MOBILITY"],
      ["comm1", "하사 박통신", "COMMS"],
      ["gen1", "하사 최일반", "GENERAL"],
    ] as const;
    for (const [username, name, field] of staff) {
      await prisma.user.upsert({
        where: { username },
        create: { username, name, field, role: "STAFF", passwordHash: demoPw, mustChangePw: false },
        update: {},
      });
    }
    console.log("테스트 정비인원 계정: fire1 / move1 / comm1 / gen1 (비밀번호 Test1234!)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
