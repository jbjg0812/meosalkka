"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { hitRateLimit, isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const LOGIN_LIMIT = 5; // 15분 내 실패 허용 횟수
const LOGIN_WINDOW = 15 * 60 * 1000;

// 존재하지 않는 계정이어도 동일한 시간이 걸리도록 비교에 쓰는 더미 해시
const DUMMY_HASH = "$2b$12$kmruqg62uo74cXGEHt4Y3ez/66UO6OX6g16mEewq4EaevNaB0AMMe";

const loginSchema = z.object({
  username: z.string().trim().min(1, "아이디를 입력하세요.").max(50),
  password: z.string().min(1, "비밀번호를 입력하세요.").max(200),
});

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  const values = { username: String(formData.get("username") ?? "").slice(0, 50) };
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const { username, password } = parsed.data;

  const ip = await getClientIp();
  const ipKey = `login:ip:${ip}`;
  const userKey = `login:user:${username.toLowerCase()}`;
  if (
    (await isRateLimited(ipKey, LOGIN_LIMIT * 4, LOGIN_WINDOW)) ||
    (await isRateLimited(userKey, LOGIN_LIMIT, LOGIN_WINDOW))
  ) {
    return { error: "로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.", values };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) {
    await hitRateLimit(ipKey, LOGIN_LIMIT * 4, LOGIN_WINDOW);
    await hitRateLimit(userKey, LOGIN_LIMIT, LOGIN_WINDOW);
    return { error: user && ok && !user.active ? "비활성화된 계정입니다. 관리자에게 문의하세요." : "아이디 또는 비밀번호가 올바르지 않습니다.", values };
  }

  await resetRateLimit(userKey);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  if (user.mustChangePw) redirect("/account/password");
  redirect(user.role === "ADMIN" ? "/admin" : "/board");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const pwSchema = z
  .object({
    current: z.string().min(1, "현재 비밀번호를 입력하세요."),
    next: z.string(),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "새 비밀번호가 서로 다릅니다." });

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const parsed = pwSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { current, next } = parsed.data;

  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (current === next) return { error: "현재 비밀번호와 다른 비밀번호를 사용하세요." };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), mustChangePw: false },
  });
  // 다른 기기의 세션은 모두 종료하고 현재 기기에서 새로 로그인 상태 유지
  await prisma.session.deleteMany({ where: { userId: me.id } });
  await createSession(me.id);

  redirect(me.role === "ADMIN" ? "/admin" : "/board");
}
