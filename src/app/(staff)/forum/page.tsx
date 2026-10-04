import ComingSoon from "@/components/ComingSoon";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "정비인원 게시판" };

export default async function ForumPage() {
  await requireStaff();
  return <ComingSoon title="정비인원 게시판" stage={5} />;
}
