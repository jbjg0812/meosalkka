import Link from "next/link";
import { UrgencyBadge } from "@/components/Badges";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, CATEGORY_LABEL, FIELD_SHORT, FIELDS, STATUSES, STATUS_LABEL, type Category } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDuration, formatRelative, kstStartOfToday } from "@/lib/format";

export const metadata = { title: "관리자 대시보드" };

const PERIODS = { "7": "최근 7일", "30": "최근 30일", all: "전체" } as const;
type Period = keyof typeof PERIODS;

function Tile({ label, value, sub, tone, href }: { label: string; value: string; sub?: string; tone?: "alert" | "warn"; href?: string }) {
  const body = (
    <>
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone === "alert" ? "text-red-600" : tone === "warn" ? "text-orange-600" : "text-stone-900"}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-stone-500">{sub}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-3.5 hover:border-brand-500">{body}</Link>
  ) : (
    <div className="card p-3.5">{body}</div>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const period: Period = sp.period === "7" || sp.period === "all" ? sp.period : "30";
  const since = period === "all" ? null : new Date(Date.now() - Number(period) * 86_400_000);

  const [matrix, today, waiting, oldestWaiting, urgentOpen, done] = await Promise.all([
    prisma.request.groupBy({ by: ["category", "status"], _count: true }),
    prisma.request.count({ where: { createdAt: { gte: kstStartOfToday() } } }),
    prisma.request.count({ where: { status: "RECEIVED" } }),
    prisma.request.findFirst({ where: { status: "RECEIVED" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.request.findMany({
      where: { urgency: "URGENT", status: { not: "DONE" } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true, equipmentName: true, unit: true, status: true, category: true, createdAt: true, urgency: true },
    }),
    // 평균 처리시간: 기간 내 완료된 건 (완료 시각 기준)
    prisma.request.findMany({
      where: { status: "DONE", completedAt: since ? { gte: since } : { not: null } },
      select: { category: true, createdAt: true, confirmedAt: true, completedAt: true },
    }),
  ]);

  const cell = (c: string, s: string) => matrix.find((m) => m.category === c && m.status === s)?._count ?? 0;
  const rowTotal = (c: string) => STATUSES.reduce((a, s) => a + cell(c, s), 0);
  const colTotal = (s: string) => CATEGORIES.reduce((a, c) => a + cell(c, s), 0);
  const total = CATEGORIES.reduce((a, c) => a + rowTotal(c), 0);
  const open = total - colTotal("DONE");
  const unclassifiedOpen = rowTotal("UNCLASSIFIED") - cell("UNCLASSIFIED", "DONE");

  const avg = (rows: typeof done, pick: (r: (typeof done)[number]) => number | null) => {
    const v = rows.map(pick).filter((x): x is number => x !== null && x >= 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const stats = [...FIELDS, "UNCLASSIFIED" as const].map((c) => {
    const rows = done.filter((d) => d.category === c);
    return {
      category: c as Category,
      count: rows.length,
      complete: avg(rows, (r) => (r.completedAt ? r.completedAt.getTime() - r.createdAt.getTime() : null)),
      confirm: avg(rows, (r) => (r.confirmedAt ? r.confirmedAt.getTime() - r.createdAt.getTime() : null)),
    };
  }).filter((s) => s.category !== "UNCLASSIFIED" || s.count > 0);
  const overall = avg(done, (r) => (r.completedAt ? r.completedAt.getTime() - r.createdAt.getTime() : null));
  const maxAvg = Math.max(1, ...stats.map((s) => s.complete ?? 0));

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="오늘 접수" value={`${today}건`} />
        <Tile label="미완료" value={`${open}건`} sub={`전체 ${total}건`} />
        <Tile
          label="미확인 (접수 상태)"
          value={`${waiting}건`}
          sub={oldestWaiting ? `가장 오래된 건 ${formatRelative(oldestWaiting.createdAt)}` : "대기 없음"}
          tone={waiting ? "alert" : undefined}
        />
        <Tile label="미분류" value={`${unclassifiedOpen}건`} tone={unclassifiedOpen ? "warn" : undefined} href="/admin/unclassified" />
        <Tile label={`평균 처리시간 (${PERIODS[period]})`} value={overall !== null ? formatDuration(overall) : "-"} sub={`완료 ${done.length}건 기준`} />
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-stone-100 px-4 py-3 font-bold">분야별·상태별 건수</h2>
        <div>
          <table className="w-full text-xs tabular-nums sm:text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-2 py-2 text-left font-semibold sm:px-3">분야</th>
                {STATUSES.map((s) => (
                  <th key={s} className="px-1 py-2 text-right font-semibold sm:px-2">{STATUS_LABEL[s]}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold sm:px-3">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {CATEGORIES.map((c) => (
                <tr key={c} className="hover:bg-stone-50">
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap sm:px-3">
                    <Link href={`/board?tab=${c}&status=all`} className="hover:underline">
                      <span className="sm:hidden">{c === "UNCLASSIFIED" ? "미분류" : FIELD_SHORT[c]}</span>
                      <span className="hidden sm:inline">{CATEGORY_LABEL[c]}</span>
                    </Link>
                  </th>
                  {STATUSES.map((s) => {
                    const n = cell(c, s);
                    return (
                      <td key={s} className={`px-1 py-2 text-right sm:px-2 ${n === 0 ? "text-stone-300" : s === "RECEIVED" ? "font-bold text-red-600" : ""}`}>
                        {n === 0 ? "0" : <Link href={`/board?tab=${c}&status=${s}`} className="hover:underline">{n}</Link>}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right font-semibold sm:px-3">{rowTotal(c)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-stone-200 font-semibold">
              <tr>
                <th className="px-2 py-2 text-left sm:px-3">합계</th>
                {STATUSES.map((s) => (
                  <td key={s} className="px-1 py-2 text-right sm:px-2">{colTotal(s)}</td>
                ))}
                <td className="px-2 py-2 text-right sm:px-3">{total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">분야별 평균 처리시간 <span className="text-xs font-normal text-stone-500">(접수 → 완료)</span></h2>
          <div className="flex gap-1" role="group" aria-label="기간">
            {(Object.keys(PERIODS) as Period[]).map((p) => (
              <Link
                key={p}
                href={`/admin?period=${p}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${p === period ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                {PERIODS[p]}
              </Link>
            ))}
          </div>
        </div>
        <ul className="space-y-3">
          {stats.map((s) => (
            <li key={s.category}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-semibold">{CATEGORY_LABEL[s.category]}</span>
                <span className="tabular-nums text-stone-700">
                  {s.complete !== null ? formatDuration(s.complete) : "완료 건 없음"}
                  <span className="ml-1.5 text-xs text-stone-400">
                    {s.count}건{s.confirm !== null && ` · 확인까지 ${formatDuration(s.confirm)}`}
                  </span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-stone-100">
                {s.complete !== null && (
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.max(2, (s.complete / maxAvg) * 100)}%` }}
                    title={`${CATEGORY_LABEL[s.category]} 평균 ${formatDuration(s.complete)} (${s.count}건)`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-400">기간 내 완료된 신청 기준. 보류 기간도 처리시간에 포함됩니다.</p>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-stone-100 px-4 py-3 font-bold">처리 중인 긴급 신청 <span className="text-xs font-normal text-stone-500">(오래된 순)</span></h2>
        {urgentOpen.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">처리 중인 긴급 신청이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {urgentOpen.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="flex items-center gap-2 px-4 py-3 hover:bg-stone-50">
                  <UrgencyBadge urgency={r.urgency} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.equipmentName}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {CATEGORY_LABEL[r.category as Category]} · {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL]} · {r.unit}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">{formatRelative(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
