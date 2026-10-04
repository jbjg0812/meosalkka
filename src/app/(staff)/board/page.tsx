import Link from "next/link";
import type { Prisma } from "@prisma/client";
import RequestCard from "@/components/RequestCard";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES, CATEGORY_LABEL, FIELD_SHORT, STATUSES, type Category, type Field } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getUnreadCounts, unreadWhere } from "@/lib/unread";
import BoardFilters from "./BoardFilters";
import MarkAllReadButton from "./MarkAllReadButton";

export const metadata = { title: "분야 게시판" };

const PAGE_SIZE = 20;
const TABS: Category[] = ["FIREPOWER", "MOBILITY", "COMMS", "GENERAL", "UNCLASSIFIED"];

type SP = { tab?: string; status?: string; urgency?: string; q?: string; unread?: string; page?: string };

export default async function BoardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaff();
  const sp = await searchParams;

  const tab: Category = (CATEGORIES as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Category) : (user.field ?? "FIREPOWER");
  const status = sp.status === "all" || (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "open";
  const urgency = sp.urgency === "URGENT" || sp.urgency === "NORMAL" ? sp.urgency : "";
  const q = String(sp.q ?? "").trim().slice(0, 50);
  const onlyUnread = sp.unread === "1";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));

  const where: Prisma.RequestWhereInput = {
    category: tab,
    ...(status === "open" ? { status: { not: "DONE" } } : status === "all" ? {} : { status }),
    ...(urgency ? { urgency } : {}),
    ...(q
      ? {
          OR: [
            { equipmentName: { contains: q } },
            { symptom: { contains: q } },
            { unit: { contains: q } },
            { applicantName: { contains: q } },
            { receiptNo: { contains: q } },
          ],
        }
      : {}),
    ...(onlyUnread ? { AND: [unreadWhere(user)] } : {}),
  };

  const [rows, total, counts] = await Promise.all([
    prisma.request.findMany({
      where,
      // 긴급 우선(URGENT > NORMAL), 그다음 최신순
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { photos: true } } },
    }),
    prisma.request.count({ where }),
    getUnreadCounts(user),
  ]);

  // 화면에 보이는 건 중 미확인 표시 대상
  const unreadIds = new Set(
    (
      await prisma.request.findMany({
        where: { id: { in: rows.map((r) => r.id) }, ...unreadWhere(user) },
        select: { id: true },
      })
    ).map((r) => r.id),
  );

  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { tab, status, urgency, q, unread: onlyUnread ? "1" : "", page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "status" && v === "open") && !(k === "page" && v === "1")) p.set(k, v);
    return `/board?${p}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <nav className="-mx-4 overflow-x-auto px-4" aria-label="분야">
        <ul className="flex gap-1.5">
          {TABS.map((c) => {
            const active = c === tab;
            const n = counts.byCategory[c];
            const mine = user.field === c;
            return (
              <li key={c}>
                <Link
                  href={`/board?tab=${c}`}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${
                    active ? "bg-brand-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"
                  }`}
                >
                  {c === "UNCLASSIFIED" ? "미분류" : FIELD_SHORT[c as Field]}
                  {mine && <span className={`text-[10px] ${active ? "text-brand-100" : "text-brand-600"}`}>내 분야</span>}
                  {n > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1 text-center text-xs leading-5 text-white">{n}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <BoardFilters tab={tab} status={status} urgency={urgency} q={q} unread={onlyUnread} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-600">
          <b>{CATEGORY_LABEL[tab]}</b> {total}건
        </span>
        {counts.byCategory[tab] > 0 && <MarkAllReadButton category={tab} />}
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-stone-500">해당하는 신청이 없습니다.</div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id}>
              <RequestCard r={r} unread={unreadIds.has(r.id)} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="btn-outline py-1.5">이전</Link> : <span className="btn-outline py-1.5 opacity-40">이전</span>}
          <span className="text-stone-500">{page} / {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} className="btn-outline py-1.5">다음</Link> : <span className="btn-outline py-1.5 opacity-40">다음</span>}
        </div>
      )}
    </div>
  );
}
