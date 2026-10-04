import PublicHeader from "@/components/PublicHeader";
import TrackForm from "./TrackForm";

export const metadata = { title: "진행 상태 조회" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const { no = "" } = await searchParams;
  const initialNo = /^\d{8}-\d{4}$/.test(no) ? no : "";
  return (
    <>
      <PublicHeader title="진행 상태 조회" />
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="card p-5">
          <TrackForm initialNo={initialNo} />
        </div>
        <p className="mt-4 text-center text-xs text-stone-500">접수번호를 잊었다면 정비반에 전화로 문의하세요.</p>
      </main>
    </>
  );
}
