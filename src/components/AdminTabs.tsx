"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminTabs({ unclassified }: { unclassified?: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "대시보드" },
    { href: "/admin/unclassified", label: "미분류", badge: unclassified },
    { href: "/admin/keywords", label: "키워드 사전" },
  ];
  return (
    <nav className="-mx-4 mb-4 overflow-x-auto border-b border-stone-200 px-4">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap ${
                  active ? "border-brand-600 text-brand-700" : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                {t.label}
                {!!t.badge && <span className="rounded-full bg-orange-500 px-1.5 text-xs text-white">{t.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
