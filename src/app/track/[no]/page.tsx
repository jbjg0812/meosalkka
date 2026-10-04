import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/Badges";
import PublicHeader from "@/components/PublicHeader";
import StatusStepper from "@/components/StatusStepper";
import { STATUS_LABEL, type Status } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { trackCookieName, verifyTrackCookie } from "@/lib/track";

export const metadata = { title: "진행 상황", robots: { index: false } };

export default async function TrackResultPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  if (!/^\d{8}-\d{4}$/.test(no)) redirect("/track");

  const req = await prisma.request.findUnique({
    where: { receiptNo: no },
    include: {
      history: { orderBy: { createdAt: "asc" } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      _count: { select: { photos: true } },
    },
  });

  // 조회 권한(접수번호+전화번호 뒷4자리 확인 쿠키)이 없으면 조회 폼으로
  const jar = await cookies();
  if (!req || !verifyTrackCookie(no, req.phone, jar.get(trackCookieName(no))?.value)) {
    redirect(`/track?no=${no}`);
  }

  return (
    <>
      <PublicHeader title="진행 상황" back="/track" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-4 pb-10">
        <section className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold text-stone-500">{req.receiptNo}</span>
            <StatusBadge status={req.status} />
          </div>
          <h2 className="mt-1 text-lg font-bold">{req.equipmentName}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <UrgencyBadge urgency={req.urgency} />
            <CategoryBadge category={req.category} />
          </div>
          <div className="mt-5">
            <StatusStepper status={req.status} />
          </div>
        </section>

        <section className="card p-4">
          <h3 className="mb-2 font-bold">신청 내용</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-stone-500">신청자</dt><dd>{req.unit} {req.applicantName}</dd></div>
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-stone-500">접수일시</dt><dd>{formatDateTime(req.createdAt)}</dd></div>
            {req._count.photos > 0 && (
              <div className="flex gap-3"><dt className="w-16 shrink-0 text-stone-500">사진</dt><dd>{req._count.photos}장 첨부</dd></div>
            )}
            <div>
              <dt className="mb-1 text-stone-500">증상</dt>
              <dd className="rounded-lg bg-stone-50 p-3 whitespace-pre-wrap">{req.symptom}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-bold">정비반 답글</h3>
          {req.replies.length === 0 ? (
            <p className="text-sm text-stone-500">아직 답글이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {req.replies.map((r) => (
                <li key={r.id} className="rounded-lg bg-brand-50 p-3">
                  <div className="mb-1 flex justify-between text-xs text-stone-500">
                    <span className="font-semibold text-brand-800">{r.author.name}</span>
                    <span>{formatDateTime(r.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-bold">처리 이력</h3>
          <ol className="relative space-y-3 border-l-2 border-stone-200 pl-4">
            {req.history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-brand-600" aria-hidden />
                <div className="text-sm font-semibold">{STATUS_LABEL[h.to as Status] ?? h.to}</div>
                <div className="text-xs text-stone-500">{formatDateTime(h.createdAt)}</div>
              </li>
            ))}
          </ol>
        </section>

        <Link href="/" className="btn-outline w-full">처음으로</Link>
      </main>
    </>
  );
}
