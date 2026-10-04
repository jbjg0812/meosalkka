import Link from "next/link";
import { notFound } from "next/navigation";
import { verify } from "@/lib/sign";
import CopyButton from "./CopyButton";

export const metadata = { title: "접수 완료" };

export default async function DonePage({ searchParams }: { searchParams: Promise<{ no?: string; s?: string }> }) {
  const { no = "", s = "" } = await searchParams;
  if (!/^\d{8}-\d{4}$/.test(no) || !verify("done:" + no, s)) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <h1 className="text-xl font-bold">정비 신청이 접수되었습니다</h1>
        <p className="mt-4 text-sm text-stone-500">접수번호</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-brand-800 select-all">{no}</p>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          접수번호를 꼭 메모하거나 캡처해 두세요.
          <br />
          접수번호와 전화번호 뒷 4자리로 진행 상황을 조회할 수 있습니다.
        </p>
        <div className="mt-5 grid gap-2">
          <Link href={`/track/${no}`} className="btn-primary w-full">진행 상황 보기</Link>
          <CopyButton text={no} />
          <Link href="/" className="btn w-full text-stone-500">처음으로</Link>
        </div>
      </div>
    </main>
  );
}
