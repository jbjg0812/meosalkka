import { NextResponse } from "next/server";
import { getStaffOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyCategories } from "@/lib/permissions";
import { getUnreadCounts, unreadWhere } from "@/lib/unread";

export const dynamic = "force-dynamic";

/**
 * 알림 폴링: 미확인 건수 + since 이후 새로 들어온 담당 분야 신청.
 * 외부 푸시 서비스 없이 화면에서 20초마다 호출한다.
 */
export async function GET(req: Request) {
  const user = await getStaffOrNull();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sinceParam = new URL(req.url).searchParams.get("since");
  const since = sinceParam && !Number.isNaN(Date.parse(sinceParam)) ? new Date(sinceParam) : new Date();
  const cats = notifyCategories(user);

  const [counts, fresh] = await Promise.all([
    getUnreadCounts(user),
    prisma.request.findMany({
      where: {
        ...unreadWhere(user),
        createdAt: { gt: since, gte: user.createdAt },
        ...(cats ? { category: { in: cats } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, receiptNo: true, equipmentName: true, urgency: true, category: true, createdAt: true },
    }),
  ]);

  return NextResponse.json(
    { now: new Date().toISOString(), unread: counts.byCategory, mine: counts.mine, fresh },
    { headers: { "Cache-Control": "no-store" } },
  );
}
