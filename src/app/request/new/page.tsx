import Link from "next/link";

export const metadata = { title: "정비 신청" };

export default function NewRequestPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center text-sm text-stone-500">
      정비 신청 화면은 2단계에서 구현됩니다. <Link href="/" className="underline">처음으로</Link>
    </main>
  );
}
