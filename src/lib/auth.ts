import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import type { Field, Role } from "./constants";

export const SESSION_COOKIE = "ms_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: Role;
  field: Field | null;
  mustChangePw: boolean;
  createdAt: Date;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** 현재 로그인 사용자. 요청 단위로 캐시된다. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || !session.user.active) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role as Role,
    field: (u.field as Field | null) ?? null,
    mustChangePw: u.mustChangePw,
    createdAt: u.createdAt,
  };
});

/** 정비인원 또는 관리자만 접근. 비밀번호 변경이 필요하면 변경 화면으로 보낸다. */
export async function requireStaff(opts: { allowPwChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePw && !opts.allowPwChange) redirect("/account/password");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role !== "ADMIN") redirect("/board");
  return user;
}

/** 서버 액션/라우트 핸들러용: 리다이렉트 대신 null 반환 */
export async function getStaffOrNull(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePw) return null;
  return user;
}
