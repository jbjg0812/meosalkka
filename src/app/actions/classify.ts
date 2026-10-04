"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffOrNull } from "@/lib/auth";
import { normalizeKeyword } from "@/lib/classify";
import { classifyWithDb, matchedWordsJson } from "@/lib/classify-db";
import { CATEGORIES, CATEGORY_LABEL, FIELDS, type Category, type Field } from "@/lib/constants";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: boolean; message: string };

const MAX_KEYWORD_LEN = 50;

async function staff() {
  const u = await getStaffOrNull();
  if (!u) throw new Error("로그인이 필요합니다.");
  return u;
}

async function admin() {
  const u = await staff();
  if (u.role !== "ADMIN") throw new Error("관리자 권한이 필요합니다.");
  return u;
}

function revalidateAll() {
  revalidatePath("/admin", "layout");
  revalidatePath("/board", "layout");
  revalidatePath("/requests", "layout");
}

/** 키워드를 사전에 추가하거나, 이미 있으면 분야를 바꾸고 활성화한다. */
async function upsertKeyword(raw: string, category: Field, userId: number): Promise<ActionResult> {
  const word = normalizeKeyword(raw);
  if (word.length < 2) return { ok: false, message: "키워드는 2자 이상이어야 합니다." };
  if (word.length > MAX_KEYWORD_LEN) return { ok: false, message: `키워드는 ${MAX_KEYWORD_LEN}자 이하여야 합니다.` };

  const existing = await prisma.keyword.findUnique({ where: { word } });
  if (existing) {
    if (existing.category === category && existing.active) {
      return { ok: true, message: `'${word}'는 이미 ${CATEGORY_LABEL[category]} 키워드입니다.` };
    }
    await prisma.keyword.update({ where: { word }, data: { category, active: true } });
    return {
      ok: true,
      message:
        existing.category === category
          ? `'${word}' 키워드를 다시 활성화했습니다.`
          : `'${word}' 키워드를 ${CATEGORY_LABEL[existing.category as Field]} → ${CATEGORY_LABEL[category]}(으)로 변경했습니다.`,
    };
  }
  await prisma.keyword.create({ data: { word, category, createdById: userId } });
  return { ok: true, message: `'${word}'를 ${CATEGORY_LABEL[category]} 키워드로 추가했습니다.` };
}

// ───────── 신청 건 수동 분류 (정비인원·관리자) ─────────

const reclassifySchema = z.object({
  requestId: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  addKeyword: z.boolean(),
});

export async function reclassifyAction(input: { requestId: number; category: Category; addKeyword: boolean }): Promise<ActionResult> {
  try {
    const user = await staff();
    const { requestId, category, addKeyword } = reclassifySchema.parse(input);
    const req = await prisma.request.findUnique({ where: { id: requestId } });
    if (!req) return { ok: false, message: "신청 건을 찾을 수 없습니다." };

    const messages: string[] = [];
    if (req.category !== category) {
      await prisma.$transaction([
        prisma.request.update({ where: { id: requestId }, data: { category, classifiedBy: "MANUAL" } }),
        prisma.statusHistory.create({
          data: {
            requestId,
            from: req.status,
            to: req.status,
            actorId: user.id,
            note: `분류 변경: ${CATEGORY_LABEL[req.category as Category]} → ${CATEGORY_LABEL[category]}`,
          },
        }),
      ]);
      messages.push(`${CATEGORY_LABEL[category]}(으)로 분류했습니다.`);
    }

    if (addKeyword) {
      if (category === "UNCLASSIFIED") return { ok: false, message: "미분류는 사전에 추가할 수 없습니다." };
      const r = await upsertKeyword(req.equipmentName, category, user.id);
      if (!r.ok) return r;
      messages.push(r.message);
    }

    revalidateAll();
    return { ok: true, message: messages.join(" ") || "변경 사항이 없습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

/** 키워드 사전이 바뀐 뒤, 자동 분류로 '미분류'가 된 건들을 다시 분류 */
export async function reclassifyUnclassifiedAction(): Promise<ActionResult> {
  try {
    await admin();
    const targets = await prisma.request.findMany({
      where: { category: "UNCLASSIFIED", classifiedBy: "AUTO" },
      select: { id: true, equipmentName: true, symptom: true },
    });
    let changed = 0;
    for (const t of targets) {
      const r = await classifyWithDb(t.equipmentName, t.symptom);
      if (r.category !== "UNCLASSIFIED") changed++;
      await prisma.request.update({ where: { id: t.id }, data: { category: r.category, matchedWords: matchedWordsJson(r) } });
    }
    revalidateAll();
    return { ok: true, message: `미분류 ${targets.length}건 중 ${changed}건을 분류했습니다.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

// ───────── 키워드 사전 관리 (관리자) ─────────

export async function addKeywordAction(input: { word: string; category: string }): Promise<ActionResult> {
  try {
    const user = await admin();
    const category = z.enum(FIELDS).safeParse(input.category);
    if (!category.success) return { ok: false, message: "분야를 선택하세요." };
    const r = await upsertKeyword(String(input.word ?? ""), category.data, user.id);
    revalidateAll();
    return r;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  word: z.string().optional(),
  category: z.enum(FIELDS).optional(),
  active: z.boolean().optional(),
});

export async function updateKeywordAction(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  try {
    await admin();
    const { id, word, category, active } = updateSchema.parse(input);
    const data: { word?: string; category?: string; active?: boolean } = {};
    if (word !== undefined) {
      const w = normalizeKeyword(word);
      if (w.length < 2 || w.length > MAX_KEYWORD_LEN) return { ok: false, message: `키워드는 2~${MAX_KEYWORD_LEN}자여야 합니다.` };
      const dup = await prisma.keyword.findUnique({ where: { word: w } });
      if (dup && dup.id !== id) return { ok: false, message: `'${w}'는 이미 등록된 키워드입니다.` };
      data.word = w;
    }
    if (category !== undefined) data.category = category;
    if (active !== undefined) data.active = active;
    await prisma.keyword.update({ where: { id }, data });
    revalidateAll();
    return { ok: true, message: "저장했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteKeywordAction(id: number): Promise<ActionResult> {
  try {
    await admin();
    await prisma.keyword.delete({ where: { id: z.number().int().positive().parse(id) } });
    revalidateAll();
    return { ok: true, message: "삭제했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

/** 분류 테스트: 장비명·증상을 넣어 어떤 분야로 분류될지 미리 확인 */
export async function previewClassifyAction(equipmentName: string, symptom: string) {
  await admin();
  return classifyWithDb(String(equipmentName ?? "").slice(0, 100), String(symptom ?? "").slice(0, 2000));
}
