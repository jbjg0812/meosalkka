import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/Badges";
import { IconChevronLeft, IconPhone } from "@/components/icons";
import ReclassifyControl from "@/components/ReclassifyControl";
import { requireStaff } from "@/lib/auth";
import { normalizeKeyword } from "@/lib/classify";
import { CATEGORY_LABEL, STATUS_LABEL, type Category, type Field, type Status } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { canHandle } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import { markRead } from "@/lib/unread";
import NoteComposer from "./NoteComposer";
import StatusChanger from "./StatusChanger";

export const metadata = { title: "신청 상세" };

type Stored = { reason?: string; matches?: { word: string; category: Field; where: string }[] };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const req = await prisma.request.findUnique({
    where: { id },
    include: {
      photos: true,
      assignee: { select: { name: true } },
      history: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      actions: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!req) notFound();

  await markRead(user.id, req.id);

  const handle = canHandle(user, req.category);
  const known = await prisma.keyword.findUnique({ where: { word: normalizeKeyword(req.equipmentName) }, select: { category: true } });
  let stored: Stored = {};
  try {
    stored = req.matchedWords ? JSON.parse(req.matchedWords) : {};
  } catch {}

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link href={`/board?tab=${req.category}`} className="inline-flex items-center text-sm text-stone-500">
        <IconChevronLeft className="size-4" /> {CATEGORY_LABEL[req.category as Category]} 게시판
      </Link>

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <UrgencyBadge urgency={req.urgency} />
          <StatusBadge status={req.status} />
          <CategoryBadge category={req.category} />
          <span className="ml-auto font-mono text-xs text-stone-500">{req.receiptNo}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold">{req.equipmentName}</h1>
        <p className="mt-0.5 text-xs text-stone-500">
          접수 {formatDateTime(req.createdAt)}
          {req.assignee && <> · 담당 {req.assignee.name}</>}
          {req.completedAt && <> · 완료 {formatDateTime(req.completedAt)}</>}
        </p>
        <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm whitespace-pre-wrap">{req.symptom}</div>
        {req.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {req.photos.map((p, i) => (
              <a key={p.id} href={`/files/${p.path}`} target="_blank" rel="noopener" className="block aspect-square overflow-hidden rounded-lg bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/files/${p.path}`} alt={`첨부 사진 ${i + 1}`} className="size-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-sm font-bold text-stone-500">신청자</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{req.applicantName}</div>
            <div className="text-sm text-stone-600">{req.unit}</div>
          </div>
          <a href={`tel:${req.phone}`} className="btn-outline shrink-0 gap-2 py-2">
            <IconPhone className="size-4" />
            {formatPhone(req.phone)}
          </a>
        </div>
      </section>

      {!handle && (
        <p className="rounded-lg bg-stone-200/60 px-3 py-2 text-sm text-stone-600">
          담당 분야({user.field ? CATEGORY_LABEL[user.field] : "-"})가 아니라 조회만 가능합니다.
        </p>
      )}

      {handle && (
        <section className="card p-4">
          <h2 className="mb-3 font-bold">상태 처리</h2>
          <StatusChanger requestId={req.id} current={req.status as Status} />
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-1 font-bold">분류</h2>
        <p className="mb-2 text-xs text-stone-500">
          {req.classifiedBy === "MANUAL" ? "수동 분류" : "자동 분류"}
          {req.classifiedBy === "AUTO" && stored.matches?.length ? ` · 근거: ${stored.matches.map((m) => m.word).join(", ")}` : ""}
          {req.classifiedBy === "AUTO" && req.category === "UNCLASSIFIED" ? (stored.reason === "tie" ? " · 여러 분야 동점" : " · 일치 키워드 없음") : ""}
        </p>
        {handle ? (
          <ReclassifyControl requestId={req.id} current={req.category} equipmentName={req.equipmentName} knownKeywordCategory={known?.category ?? null} />
        ) : (
          <CategoryBadge category={req.category} />
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-bold">신청자 답글 <span className="text-xs font-normal text-amber-700">(신청자 공개)</span></h2>
        <ul className="my-3 space-y-2">
          {req.replies.length === 0 && <li className="text-sm text-stone-500">아직 답글이 없습니다.</li>}
          {req.replies.map((r) => (
            <li key={r.id} className="rounded-lg bg-amber-50 p-3">
              <div className="mb-1 flex justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">{r.author.name}</span>
                <span>{formatDateTime(r.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.content}</p>
            </li>
          ))}
        </ul>
        {handle && <NoteComposer requestId={req.id} kind="reply" />}
      </section>

      <section className="card p-4">
        <h2 className="font-bold">조치내용 <span className="text-xs font-normal text-stone-500">(내부 기록)</span></h2>
        <ul className="my-3 space-y-2">
          {req.actions.length === 0 && <li className="text-sm text-stone-500">기록된 조치내용이 없습니다.</li>}
          {req.actions.map((a) => (
            <li key={a.id} className="rounded-lg bg-stone-50 p-3">
              <div className="mb-1 flex justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">{a.author.name}</span>
                <span>{formatDateTime(a.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
            </li>
          ))}
        </ul>
        {handle && <NoteComposer requestId={req.id} kind="action" />}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-bold">처리 이력</h2>
        <ol className="space-y-3 border-l-2 border-stone-200 pl-4">
          {req.history.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-brand-600" aria-hidden />
              <div className="text-sm">
                {h.from === h.to ? (
                  <span className="text-stone-700">{h.note}</span>
                ) : (
                  <>
                    <b>{STATUS_LABEL[h.to as Status] ?? h.to}</b>
                    {h.note && <span className="text-stone-600"> — {h.note}</span>}
                  </>
                )}
              </div>
              <div className="text-xs text-stone-500">
                {formatDateTime(h.createdAt)} · {h.actor?.name ?? "신청자"}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
