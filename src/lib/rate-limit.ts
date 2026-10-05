import { prisma } from "./db";

/**
 * 고정 윈도우 방식 횟수 제한. 허용되면 true.
 * 여러 서버 프로세스에서도 일관되도록 DB에 기록한다.
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  // 가끔 하루 지난 기록을 정리해 테이블이 계속 커지지 않게 한다
  if (Math.random() < 0.02) {
    await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } });
  }
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row || now.getTime() - row.windowStart.getTime() > windowMs) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return true;
  }
  if (row.count >= limit) return false;
  await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row) return false;
  if (Date.now() - row.windowStart.getTime() > windowMs) return false;
  return row.count >= limit;
}

export async function resetRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}
