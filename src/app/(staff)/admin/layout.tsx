import AdminTabs from "@/components/AdminTabs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const unclassified = await prisma.request.count({ where: { category: "UNCLASSIFIED", status: { not: "DONE" } } });
  return (
    <>
      <AdminTabs unclassified={unclassified} />
      {children}
    </>
  );
}
