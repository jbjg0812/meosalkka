import Link from "next/link";
import BottomNav, { SideNav } from "@/components/BottomNav";
import { IconWrench } from "@/components/icons";
import NotificationBell from "@/components/NotificationBell";
import NotificationProvider from "@/components/NotificationProvider";
import { requireStaff } from "@/lib/auth";
import { getUnreadCounts } from "@/lib/unread";

// 정비인원/관리자 공통 화면 틀. 실제 권한 확인은 각 페이지에서도 다시 수행한다.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff({ allowPwChange: true });
  const isAdmin = user.role === "ADMIN";
  const showNav = !user.mustChangePw;
  const counts = showNav ? await getUnreadCounts(user) : { byCategory: {}, mine: 0 };

  return (
    <NotificationProvider initial={{ unread: counts.byCategory, mine: counts.mine }} enabled={showNav}>
      <div className="min-h-dvh pb-20 md:pb-8">
        <header className="sticky top-0 z-20 bg-brand-800 text-white shadow">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <Link href={isAdmin ? "/admin" : "/board"} className="flex items-center gap-2 font-bold">
              <IconWrench className="size-5" />
              정비지원
            </Link>
            {showNav && <SideNav isAdmin={isAdmin} />}
            <div className="ml-auto flex items-center gap-2">
              {showNav && <NotificationBell defaultTab={user.field ?? "FIREPOWER"} />}
              <div className="text-right text-xs leading-tight text-brand-100">
                <div className="font-semibold text-white">{user.name}</div>
                <div>{isAdmin ? "관리자" : "정비인원"}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
        {showNav && <BottomNav isAdmin={isAdmin} />}
      </div>
    </NotificationProvider>
  );
}
