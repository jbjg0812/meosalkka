import ComingSoon from "@/components/ComingSoon";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "관리자 대시보드" };

export default async function AdminPage() {
  await requireAdmin();
  return <ComingSoon title="관리자 대시보드" stage={6} />;
}
