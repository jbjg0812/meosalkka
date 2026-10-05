"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markAllReadAction } from "@/app/actions/handle";
import { useNotifications } from "@/components/NotificationProvider";

export default function MarkAllReadButton({ category }: { category: string }) {
  const router = useRouter();
  const { refresh } = useNotifications();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-medium text-brand-700 underline"
      onClick={() =>
        start(async () => {
          await markAllReadAction(category);
          refresh();
          router.refresh();
        })
      }
    >
      {pending ? "처리 중…" : "모두 확인"}
    </button>
  );
}
