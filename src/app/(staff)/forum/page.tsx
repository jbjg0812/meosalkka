import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { IconCamera, IconChat } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { FIELD_SHORT, FIELDS, isField, type Field } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatRelative } from "@/lib/format";

export const metadata = { title: "정비인원 게시판" };

const PAGE_SIZE = 20;

export default async function ForumPage({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string; cases?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const tag = isField(sp.tag) ? sp.tag : sp.tag === "COMMON" ? "COMMON" : "";
  const q = String(sp.q ?? "").trim().slice(0, 50);
  const onlyCases = sp.cases === "1";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));

  const where: Prisma.PostWhereInput = {
    ...(tag === "COMMON" ? { fieldTag: null } : tag ? { fieldTag: tag } : {}),
    ...(onlyCases ? { sourceRequestId: { not: null } } : {}),
    ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
  };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { name: true } }, _count: { select: { comments: true, images: true } } },
    }),
    prisma.post.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(tag ? { tag } : {}), ...(q ? { q } : {}), ...(onlyCases ? { cases: "1" } : {}), ...over });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/forum?${p}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">정비인원 게시판</h1>
        <Link href="/forum/new" className="btn-primary px-4 py-2 text-sm">글쓰기</Link>
      </div>

      <nav className="-mx-4 overflow-x-auto px-4" aria-label="분야 태그">
        <ul className="flex gap-1.5">
          {[["", "전체"], ...FIELDS.map((f) => [f, FIELD_SHORT[f]]), ["COMMON", "공통"]].map(([v, label]) => (
            <li key={v}>
              <Link
                href={href({ tag: v, page: "" })}
                className={`block rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap ${tag === v ? "bg-brand-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className="flex gap-2" action="/forum">
        {tag && <input type="hidden" name="tag" value={tag} />}
        {onlyCases && <input type="hidden" name="cases" value="1" />}
        <input name="q" type="search" defaultValue={q} placeholder="제목·내용 검색" maxLength={50} className="input py-2 text-sm" />
        <button className="btn-outline shrink-0 py-2 text-sm">검색</button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-600">{total}건</span>
        <Link href={href({ cases: onlyCases ? "" : "1", page: "" })} className={`rounded-full px-3 py-1 text-xs font-semibold ${onlyCases ? "bg-brand-100 text-brand-800" : "text-stone-500 ring-1 ring-stone-200"}`}>
          정비사례만
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-stone-500">글이 없습니다.</div>
      ) : (
        <ul className="card divide-y divide-stone-100 overflow-hidden">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/forum/${p.id}`} className="block px-4 py-3 hover:bg-stone-50">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="rounded bg-brand-100 px-1.5 py-0.5 font-semibold text-brand-800">{p.fieldTag ? FIELD_SHORT[p.fieldTag as Field] : "공통"}</span>
                  {p.sourceRequestId && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">정비사례</span>}
                </div>
                <div className="mt-1 line-clamp-1 font-semibold">{p.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                  <span>{p.author.name}</span>
                  <span>·</span>
                  <span>{formatRelative(p.createdAt)}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {p._count.images > 0 && <span className="flex items-center gap-0.5"><IconCamera className="size-3.5" />{p._count.images}</span>}
                    {p._count.comments > 0 && <span className="flex items-center gap-0.5"><IconChat className="size-3.5" />{p._count.comments}</span>}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="btn-outline py-1.5">이전</Link> : <span className="btn-outline py-1.5 opacity-40">이전</span>}
          <span className="text-stone-500">{page} / {pages}</span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="btn-outline py-1.5">다음</Link> : <span className="btn-outline py-1.5 opacity-40">다음</span>}
        </div>
      )}
      <p className="text-center text-xs text-stone-400">정비 노하우와 사례를 공유하는 정비부대 전용 게시판입니다.</p>
    </div>
  );
}
