import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { normalizeKeyword } from "@/lib/classify";
import { CATEGORY_LABEL, FIELDS, isField } from "@/lib/constants";
import { prisma } from "@/lib/db";
import ClassifyTester from "./ClassifyTester";
import KeywordAddForm from "./KeywordAddForm";
import KeywordRow from "./KeywordRow";

export const metadata = { title: "키워드 사전" };

export default async function KeywordsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const cat = isField(sp.cat) ? sp.cat : undefined;
  const q = normalizeKeyword(String(sp.q ?? "").slice(0, 50));

  const [rows, counts] = await Promise.all([
    prisma.keyword.findMany({
      where: { ...(cat ? { category: cat } : {}), ...(q ? { word: { contains: q } } : {}) },
      orderBy: [{ active: "desc" }, { category: "asc" }, { word: "asc" }],
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.keyword.groupBy({ by: ["category"], _count: true }),
  ]);
  const countOf = (c: string) => counts.find((x) => x.category === c)?._count ?? 0;
  const total = counts.reduce((s, x) => s + x._count, 0);
  const href = (c?: string) => `/admin/keywords?${new URLSearchParams({ ...(c ? { cat: c } : {}), ...(sp.q ? { q: sp.q } : {}) })}`;

  return (
    <div className="space-y-4">
      <KeywordAddForm defaultCategory={cat} />
      <ClassifyTester />

      <section className="card overflow-hidden">
        <div className="space-y-3 border-b border-stone-100 p-4">
          <div className="flex flex-wrap gap-1.5">
            {[undefined, ...FIELDS].map((c) => (
              <Link
                key={c ?? "all"}
                href={href(c)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${cat === c ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                {c ? CATEGORY_LABEL[c] : "전체"} <span className="opacity-70">{c ? countOf(c) : total}</span>
              </Link>
            ))}
          </div>
          <form className="flex gap-2">
            {cat && <input type="hidden" name="cat" value={cat} />}
            <input name="q" defaultValue={sp.q ?? ""} placeholder="키워드 검색" className="input py-2" maxLength={50} />
            <button className="btn-outline shrink-0 py-2">검색</button>
          </form>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone-500">키워드가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((k) => (
              <KeywordRow key={k.id} k={{ id: k.id, word: k.word, category: k.category, active: k.active, createdBy: k.createdBy?.name ?? null }} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
