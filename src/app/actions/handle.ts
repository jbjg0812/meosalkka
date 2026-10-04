"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffOrNull, type SessionUser } from "@/lib/auth";
import { CATEGORIES, STATUSES, STATUS_LABEL, type Status } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { withRo } from "@/lib/hangul";
import { canHandle } from "@/lib/permissions";
import { unreadWhere } from "@/lib/unread";

export type ActionResult = { ok: boolean; message: string };

const fail = (e: unknown): ActionResult => ({ ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." });

/** 로그인 + 해당 신청 건 처리 권한 확인 */
async function authorize(requestId: number): Promise<{ user: SessionUser; req: NonNullable<Awaited<ReturnType<typeof findReq>>> }> {
  const user = await getStaffOrNull();
  if (!user) throw new Error("로그인이 필요합니다.");
  const req = await findReq(requestId);
  if (!req) throw new Error("신청 건을 찾을 수 없습니다.");
  if (!canHandle(user, req.category)) throw new Error("담당 분야의 신청만 처리할 수 있습니다.");
  return { user, req };
}

function findReq(id: number) {
  return prisma.request.findUnique({ where: { id } });
}

function revalidate(id: number) {
  revalidatePath(`/requests/${id}`);
  revalidatePath("/board");
}

// ───────── 상태 변경 ─────────

const statusSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(STATUSES),
  note: z.string().trim().max(500, "메모는 500자 이하로 입력하세요.").optional().default(""),
});

export async function changeStatusAction(input: z.input<typeof statusSchema>): Promise<ActionResult> {
  try {
    const { requestId, status, note } = statusSchema.parse(input);
    const { user, req } = await authorize(requestId);
    if (req.status === status) return { ok: false, message: "현재와 같은 상태입니다." };
    if (status === "ON_HOLD" && !note) return { ok: false, message: "보류 사유를 입력하세요." };

    const now = new Date();
    await prisma.$transaction([
      prisma.request.update({
        where: { id: requestId },
        data: {
          status,
          // 처음 확인한 시각 / 완료 시각 기록 (평균 처리시간 계산용)
          ...(status !== "RECEIVED" && !req.confirmedAt ? { confirmedAt: now } : {}),
          ...(status === "DONE" ? { completedAt: now } : { completedAt: null }),
          // 담당자가 없으면 처음 처리한 사람을 담당자로
          ...(!req.assigneeId && status !== "RECEIVED" ? { assigneeId: user.id } : {}),
        },
      }),
      prisma.statusHistory.create({
        data: { requestId, from: req.status, to: status, actorId: user.id, note: note || null },
      }),
    ]);
    revalidate(requestId);
    return { ok: true, message: `상태를 ${withRo(STATUS_LABEL[status as Status])} 변경했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ───────── 조치내용(내부) / 답글(신청자 공개) ─────────

const noteSchema = z.object({
  requestId: z.number().int().positive(),
  content: z.string().trim().min(1, "내용을 입력하세요.").max(2000, "2000자 이하로 입력하세요."),
});

export async function addActionNoteAction(input: z.input<typeof noteSchema>): Promise<ActionResult> {
  try {
    const { requestId, content } = noteSchema.parse(input);
    const { user } = await authorize(requestId);
    await prisma.actionNote.create({ data: { requestId, content, authorId: user.id } });
    revalidate(requestId);
    return { ok: true, message: "조치내용을 기록했습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function addReplyAction(input: z.input<typeof noteSchema>): Promise<ActionResult> {
  try {
    const { requestId, content } = noteSchema.parse(input);
    const { user } = await authorize(requestId);
    await prisma.reply.create({ data: { requestId, content, authorId: user.id } });
    revalidate(requestId);
    return { ok: true, message: "답글을 등록했습니다. 신청자 조회 화면에 표시됩니다." };
  } catch (e) {
    return fail(e);
  }
}

// ───────── 미확인 일괄 읽음 ─────────

export async function markAllReadAction(category: string): Promise<ActionResult> {
  try {
    const user = await getStaffOrNull();
    if (!user) throw new Error("로그인이 필요합니다.");
    const cat = z.enum(CATEGORIES).parse(category);
    const targets = await prisma.request.findMany({ where: { ...unreadWhere(user), category: cat }, select: { id: true } });
    if (targets.length) {
      await prisma.requestRead.createMany({ data: targets.map((t) => ({ userId: user.id, requestId: t.id })) });
    }
    revalidatePath("/board");
    return { ok: true, message: `${targets.length}건을 확인 처리했습니다.` };
  } catch (e) {
    return fail(e);
  }
}
