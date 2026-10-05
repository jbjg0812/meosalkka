import "server-only";
import type { SessionUser } from "./auth";
import { CATEGORIES, type Category } from "./constants";
import { prisma } from "./db";
import { notifyCategories } from "./permissions";

/**
 * 사용자별 미확인 건: 계정 생성 이후 접수되었고 아직 열어보지 않은 신청.
 * (완료된 건은 제외)
 */
export function unreadWhere(user: SessionUser) {
  return {
    createdAt: { gte: user.createdAt },
    status: { not: "DONE" },
    reads: { none: { userId: user.id } },
  };
}

export async function getUnreadCounts(user: SessionUser) {
  const rows = await prisma.request.groupBy({
    by: ["category"],
    where: unreadWhere(user),
    _count: true,
  });
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const r of rows) byCategory[r.category as Category] = r._count;
  const cats = notifyCategories(user);
  const mine = cats === null ? Object.values(byCategory).reduce((a, b) => a + b, 0) : cats.reduce((a, c) => a + (byCategory[c as Category] ?? 0), 0);
  return { byCategory, mine };
}

export async function markRead(userId: number, requestId: number) {
  await prisma.requestRead.upsert({
    where: { userId_requestId: { userId, requestId } },
    create: { userId, requestId },
    update: {},
  });
}
