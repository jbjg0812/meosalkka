import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import ReclassifyControl from "@/components/ReclassifyControl";
import { requireAdmin } from "@/lib/auth";
import { normalizeKeyword } from "@/lib/classify";
import { CATEGORY_LABEL, type Field } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import RerunButton from "./RerunButton";

export const metadata = { title: "미분류 신청" };

type Stored = { reason?: string; matches?: { word: string; category: Field; where: string }[] };

function parseReason(json: string | null): string {
  if (!json) return "";
  try {
    const s = JSON.parse(json) as Stored;
    if (s.reason === "tie" && s.matches?.length) {
      const cats = [...new Set(s.matches.map((m) => CATEGORY_LABEL[m.category]))].join(", ");
      return `여러 분야 키워드가 같은 비중으로 일치 (${cats})`;
    }
    return "일치하는 키워드 없음";
  } catch {
    return "";
  }
}

export default async function UnclassifiedPage() {
  await requireAdmin();
  const rows = await prisma.request.findMany({
    where: { category: "UNCLASSIFIED", status: { not: "DONE" } },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }], // URGENT > NORMAL (문자열 내림차순)
  });
  const known = await prisma.keyword.findMany({
    where: { word: { in: [...new Set(rows.map((r) => normalizeKeyword(r.equipmentName)))] } },
    select: { word: true, category: true },
  });
  const knownMap = new Map(known.map((k) => [k.word, k.category]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        키워드로 분류되지 않은 신청입니다. 분야를 지정하면 해당 분야 게시판에 표시됩니다.
      </p>
      {rows.length > 0 && <RerunButton />}
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-stone-500">미분류 신청이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card space-y-2 p-4">
              <div className="flex items-center gap-1.5">
                <UrgencyBadge urgency={r.urgency} />
                <StatusBadge status={r.status} />
                <span className="ml-auto text-xs text-stone-500">{formatRelative(r.createdAt)}</span>
              </div>
              <div>
                <div className="font-bold">{r.equipmentName}</div>
                <p className="line-clamp-2 text-sm text-stone-600">{r.symptom}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {r.receiptNo} · {r.unit} · {parseReason(r.matchedWords)}
                </p>
              </div>
              <ReclassifyControl
                requestId={r.id}
                current={r.category}
                equipmentName={r.equipmentName}
                knownKeywordCategory={knownMap.get(normalizeKeyword(r.equipmentName)) ?? null}
                compact
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
