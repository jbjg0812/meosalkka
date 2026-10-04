import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "관리자 대시보드" };

export default async function AdminPage() {
  await requireAdmin();
  const [unclassified, keywords] = await Promise.all([
    prisma.request.count({ where: { category: "UNCLASSIFIED", status: { not: "DONE" } } }),
    prisma.keyword.count({ where: { active: true } }),
  ]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/unclassified" className="card p-4">
          <div className="text-xs text-stone-500">미분류 신청</div>
          <div className={`mt-1 text-2xl font-bold ${unclassified ? "text-orange-600" : ""}`}>{unclassified}건</div>
        </Link>
        <Link href="/admin/keywords" className="card p-4">
          <div className="text-xs text-stone-500">활성 키워드</div>
          <div className="mt-1 text-2xl font-bold">{keywords}개</div>
        </Link>
      </div>
      <div className="card p-6 text-center text-sm text-stone-500">분야별·상태별 현황, 평균 처리시간은 6단계에서 구현됩니다.</div>
    </div>
  );
}
