"use client";

import Link from "next/link";
import { IconBell } from "./icons";
import { useNotifications } from "./NotificationProvider";

export default function NotificationBell({ defaultTab }: { defaultTab: string }) {
  const { mine, unread } = useNotifications();
  // 미확인이 있는 첫 탭(내 분야 우선)으로 이동
  const tab = unread[defaultTab] ? defaultTab : (Object.keys(unread).find((k) => unread[k] > 0) ?? defaultTab);
  return (
    <Link href={`/board?tab=${tab}&unread=1`} className="relative flex size-10 items-center justify-center rounded-full hover:bg-white/10" aria-label={`미확인 ${mine}건`}>
      <IconBell className="size-6" />
      {mine > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] leading-5 font-bold text-white">
          {mine > 99 ? "99+" : mine}
        </span>
      )}
    </Link>
  );
}
