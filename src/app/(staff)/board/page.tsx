import ComingSoon from "@/components/ComingSoon";
import { requireStaff } from "@/lib/auth";
import { CATEGORY_LABEL } from "@/lib/constants";

export const metadata = { title: "분야 게시판" };

export default async function BoardPage() {
  const user = await requireStaff();
  return (
    <ComingSoon title="분야 게시판" stage={4}>
      <p className="text-sm text-stone-600">
        {user.name}님, 담당 분야는 <b>{user.field ? CATEGORY_LABEL[user.field] : "전체"}</b>입니다.
      </p>
    </ComingSoon>
  );
}
