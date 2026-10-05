import "server-only";
import { classify } from "./classify";
import { prisma } from "./db";

export async function activeKeywords() {
  return prisma.keyword.findMany({ where: { active: true }, select: { word: true, category: true } });
}

export async function classifyWithDb(equipmentName: string, symptom: string) {
  return classify(equipmentName, symptom, await activeKeywords());
}

/** DB 저장용: 분류 근거 요약 */
export function matchedWordsJson(r: Awaited<ReturnType<typeof classifyWithDb>>) {
  return JSON.stringify({ reason: r.reason, matches: r.matches, scores: r.scores });
}
