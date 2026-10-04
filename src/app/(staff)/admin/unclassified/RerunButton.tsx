"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reclassifyUnclassifiedAction } from "@/app/actions/classify";

export default function RerunButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        className="btn-outline w-full text-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await reclassifyUnclassifiedAction();
            setMsg(r.message);
            router.refresh();
          })
        }
      >
        {pending ? "분류 중…" : "현재 사전으로 다시 자동 분류"}
      </button>
      {msg && <p className="mt-1 text-center text-xs text-brand-700">{msg}</p>}
    </div>
  );
}
