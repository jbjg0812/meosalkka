import { FIELDS, type Category, type Field } from "./constants";

/**
 * 키워드 비교용 정규화: 소문자, 공백·하이픈 등 구분기호 제거.
 *   "K-9 자주포" → "k9자주포", "PRC 999K" → "prc999k"
 */
export function normalizeKeyword(s: string): string {
  return s.toLowerCase().replace(/[\s\-_./·,()[\]]+/g, "");
}

export type KeywordEntry = { word: string; category: string };
export type Match = { word: string; category: Field; where: "equipment" | "symptom" };
export type ClassifyResult = {
  category: Category;
  matches: Match[];
  scores: Record<Field, number>;
  reason: "matched" | "none" | "tie";
};

/**
 * 장비명·증상에서 사전 키워드를 찾아 분류한다.
 *  1) 장비명에 일치 키워드가 있으면 장비명 일치 수가 가장 많은 분야 (동점이면 증상 일치 수로 결정)
 *  2) 장비명에 없으면 증상 일치 수가 가장 많은 분야
 *  3) 일치 없음 또는 끝까지 동점이면 미분류
 */
export function classify(equipmentName: string, symptom: string, keywords: KeywordEntry[]): ClassifyResult {
  const eq = normalizeKeyword(equipmentName);
  const sy = normalizeKeyword(symptom);
  const zero = () => Object.fromEntries(FIELDS.map((f) => [f, 0])) as Record<Field, number>;
  const eqScore = zero();
  const syScore = zero();
  const matches: Match[] = [];

  for (const k of keywords) {
    if (!k.word || !(FIELDS as readonly string[]).includes(k.category)) continue;
    const cat = k.category as Field;
    if (eq.includes(k.word)) {
      eqScore[cat]++;
      matches.push({ word: k.word, category: cat, where: "equipment" });
    } else if (sy.includes(k.word)) {
      syScore[cat]++;
      matches.push({ word: k.word, category: cat, where: "symptom" });
    }
  }

  const scores = zero();
  for (const f of FIELDS) scores[f] = eqScore[f] * 2 + syScore[f];

  const hasEq = FIELDS.some((f) => eqScore[f] > 0);
  // 정렬 기준: (장비명 점수, 증상 점수) 또는 (증상 점수)
  const key = (f: Field): [number, number] => (hasEq ? [eqScore[f], syScore[f]] : [syScore[f], 0]);
  const ranked = [...FIELDS].sort((a, b) => key(b)[0] - key(a)[0] || key(b)[1] - key(a)[1]);
  const [a, b] = [key(ranked[0]), key(ranked[1])];

  if (a[0] === 0) return { category: "UNCLASSIFIED", matches, scores, reason: "none" };
  if (a[0] === b[0] && a[1] === b[1]) return { category: "UNCLASSIFIED", matches, scores, reason: "tie" };
  return { category: ranked[0], matches, scores, reason: "matched" };
}
