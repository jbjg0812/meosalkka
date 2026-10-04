import PublicHeader from "@/components/PublicHeader";
import { issueFormToken } from "@/lib/sign";
import RequestForm from "./RequestForm";

export const metadata = { title: "정비 신청" };
export const dynamic = "force-dynamic"; // 폼 토큰을 매 요청마다 새로 발급

export default function NewRequestPage() {
  return (
    <>
      <PublicHeader title="정비 신청" />
      <main className="mx-auto max-w-xl px-4 py-4 pb-10">
        <RequestForm formToken={issueFormToken()} />
      </main>
    </>
  );
}
