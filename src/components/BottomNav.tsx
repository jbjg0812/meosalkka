"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChart, IconChat, IconList, IconUser } from "./icons";
import { useNotifications } from "./NotificationProvider";

type Item = { href: string; label: string; icon: React.ReactNode; badge?: number };

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { mine } = useNotifications();
  const items: Item[] = [
    { href: "/board", label: "분야 게시판", icon: <IconList />, badge: mine },
    { href: "/forum", label: "정비인원 게시판", icon: <IconChat /> },
    ...(isAdmin ? [{ href: "/admin", label: "관리", icon: <IconChart /> }] : []),
    { href: "/account", label: "내 정보", icon: <IconUser /> },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-3xl">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-brand-700" : "text-stone-500"
                }`}
              >
                {it.icon}
                {!!it.badge && (
                  <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-bold text-white">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                )}
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/board", label: "분야 게시판" },
    { href: "/forum", label: "정비인원 게시판" },
    ...(isAdmin ? [{ href: "/admin", label: "관리" }] : []),
    { href: "/account", label: "내 정보" },
  ];
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
