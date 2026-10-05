import PublicHeader from "@/components/PublicHeader";
import { prisma } from "@/lib/db";
import { issueFormToken } from "@/lib/sign";
import RequestForm from "./RequestForm";

export const metadata = { title: "정비 신청" };
export const dynamic = "force-dynamic"; // 폼 토큰을 매 요청마다 새로 발급

export default async function NewRequestPage() {
  // 장비명 자동완성 후보: 활성 키워드 사전
  const suggestions = await prisma.keyword.findMany({
    where: { active: true },
    select: { word: true, category: true },
    orderBy: { word: "asc" },
  });
  return (
    <>
      <PublicHeader title="정비 신청" />
      <main className="mx-auto max-w-xl px-4 py-4 pb-10">
        <RequestForm formToken={issueFormToken()} suggestions={suggestions} />
      </main>
    </>
  );
}
