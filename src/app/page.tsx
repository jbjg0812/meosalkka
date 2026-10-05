import Link from "next/link";
import { IconSearch, IconWrench } from "@/components/icons";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-brand-700 text-white shadow">
          <IconWrench className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">정비지원</h1>
        <p className="mt-1 text-sm text-stone-500">장비 고장 신고부터 정비 완료까지 한 곳에서</p>
      </header>

      <div className="grid gap-3">
        <Link href="/request/new" className="card flex items-center gap-4 p-5 transition hover:border-brand-500">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <IconWrench />
          </span>
          <span>
            <span className="block text-lg font-bold">정비 신청</span>
            <span className="block text-sm text-stone-500">로그인 없이 바로 신청할 수 있습니다</span>
          </span>
        </Link>
        <Link href="/track" className="card flex items-center gap-4 p-5 transition hover:border-brand-500">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-stone-700 text-white">
            <IconSearch />
          </span>
          <span>
            <span className="block text-lg font-bold">진행 상태 조회</span>
            <span className="block text-sm text-stone-500">접수번호와 전화번호 뒷 4자리로 조회</span>
          </span>
        </Link>
      </div>

      <footer className="mt-auto pt-10 text-center">
        <Link href="/login" className="text-sm text-stone-500 underline">정비인원 로그인</Link>
      </footer>
    </main>
  );
}
