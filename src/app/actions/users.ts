"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffOrNull } from "@/lib/auth";
import { FIELDS, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export type UserActionResult = { ok: boolean; message: string; tempPassword?: string };

async function admin() {
  const u = await getStaffOrNull();
  if (!u || u.role !== "ADMIN") throw new Error("관리자 권한이 필요합니다.");
  return u;
}

const fail = (e: unknown): UserActionResult => ({
  ok: false,
  message: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.",
});

/** 임시 비밀번호: 영문 대·소문자 + 숫자 + 특수문자 포함 10자 (헷갈리는 문자 제외) */
function tempPassword(): string {
  const pick = (s: string, n: number) => Array.from({ length: n }, () => s[randomInt(s.length)]).join("");
  const chars = [...(pick("ABCDEFGHJKLMNPQRSTUVWXYZ", 2) + pick("abcdefghijkmnpqrstuvwxyz", 4) + pick("23456789", 3) + pick("!@#$%", 1))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const base = {
  name: z.string().trim().min(2, "계급·성명을 2자 이상 입력하세요.").max(30, "계급·성명은 30자 이하로 입력하세요."),
  role: z.enum(ROLES),
  field: z.union([z.enum(FIELDS), z.literal("")]),
};
const fieldRule = (v: { role: string; field: string }) => v.role === "ADMIN" || v.field !== "";
const fieldMsg = { message: "정비인원은 담당 분야를 지정해야 합니다.", path: ["field"] };

const createSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,20}$/, "아이디는 영문 소문자·숫자·밑줄 3~20자로 입력하세요."),
    ...base,
  })
  .refine(fieldRule, fieldMsg);

export async function createUserAction(input: z.input<typeof createSchema>): Promise<UserActionResult> {
  try {
    await admin();
    const d = createSchema.parse(input);
    if (await prisma.user.findUnique({ where: { username: d.username } })) {
      return { ok: false, message: `'${d.username}'는 이미 사용 중인 아이디입니다.` };
    }
    const pw = tempPassword();
    await prisma.user.create({
      data: {
        username: d.username,
        name: d.name,
        role: d.role,
        field: d.field || null,
        passwordHash: await hashPassword(pw),
        mustChangePw: true,
      },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `${d.name}(${d.username}) 계정을 만들었습니다.`, tempPassword: pw };
  } catch (e) {
    return fail(e);
  }
}

const updateSchema = z.object({ id: z.number().int().positive(), active: z.boolean(), ...base }).refine(fieldRule, fieldMsg);

export async function updateUserAction(input: z.input<typeof updateSchema>): Promise<UserActionResult> {
  try {
    const me = await admin();
    const d = updateSchema.parse(input);
    const target = await prisma.user.findUnique({ where: { id: d.id } });
    if (!target) return { ok: false, message: "계정을 찾을 수 없습니다." };

    // 본인 잠금 방지
    if (target.id === me.id && (d.role !== "ADMIN" || !d.active)) {
      return { ok: false, message: "본인 계정의 관리자 권한 해제나 비활성화는 할 수 없습니다." };
    }
    // 마지막 관리자 보호
    const losingAdmin = target.role === "ADMIN" && target.active && (d.role !== "ADMIN" || !d.active);
    if (losingAdmin && (await prisma.user.count({ where: { role: "ADMIN", active: true } })) <= 1) {
      return { ok: false, message: "활성 관리자가 최소 1명은 있어야 합니다." };
    }

    await prisma.user.update({
      where: { id: d.id },
      data: { name: d.name, role: d.role, field: d.field || null, active: d.active },
    });
    // 비활성화하면 로그인 중인 세션도 즉시 종료
    if (!d.active) await prisma.session.deleteMany({ where: { userId: d.id } });
    revalidatePath("/admin/users");
    return { ok: true, message: d.active === target.active ? "저장했습니다." : d.active ? "계정을 활성화했습니다." : "계정을 비활성화하고 로그아웃시켰습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function resetPasswordAction(id: number): Promise<UserActionResult> {
  try {
    const me = await admin();
    const target = await prisma.user.findUnique({ where: { id: z.number().int().positive().parse(id) } });
    if (!target) return { ok: false, message: "계정을 찾을 수 없습니다." };
    if (target.id === me.id) return { ok: false, message: "본인 비밀번호는 내 정보 > 비밀번호 변경에서 바꾸세요." };
    const pw = tempPassword();
    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(pw), mustChangePw: true } }),
      prisma.session.deleteMany({ where: { userId: target.id } }),
      // 로그인 잠금도 풀어준다
      prisma.rateLimit.deleteMany({ where: { key: `login:user:${target.username.toLowerCase()}` } }),
    ]);
    revalidatePath("/admin/users");
    return { ok: true, message: `${target.name}의 비밀번호를 초기화했습니다.`, tempPassword: pw };
  } catch (e) {
    return fail(e);
  }
}
