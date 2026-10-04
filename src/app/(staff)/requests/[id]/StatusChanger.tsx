"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeStatusAction } from "@/app/actions/handle";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/constants";
import { withRo } from "@/lib/hangul";

// 다음 단계로 바로 넘어가는 버튼 (자주 쓰는 동작)
const NEXT: Partial<Record<Status, Status>> = { RECEIVED: "CONFIRMED", CONFIRMED: "IN_PROGRESS", IN_PROGRESS: "DONE", ON_HOLD: "IN_PROGRESS" };

export default function StatusChanger({ requestId, current }: { requestId: number; current: Status }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(NEXT[current] ?? current);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(target: Status) {
    setMsg(null);
    start(async () => {
      const r = await changeStatusAction({ requestId, status: target, note });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setNote("");
        router.refresh();
      }
    });
  }

  const next = NEXT[current];
  return (
    <div className="space-y-3">
      {next && (
        <button type="button" disabled={pending} onClick={() => submit(next)} className="btn-primary w-full py-3">
          {STATUS_LABEL[current]} → <b>{withRo(STATUS_LABEL[next])}</b> 변경
        </button>
      )}
      <details className="rounded-lg border border-stone-200 p-3" open={!next}>
        <summary className="cursor-pointer text-sm font-semibold text-stone-700">다른 상태로 변경 / 메모 남기기</summary>
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-5 gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                disabled={s === current}
                className={`rounded-md border py-2 text-xs font-semibold ${
                  s === current ? "border-stone-200 bg-stone-100 text-stone-400" : s === status ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-600"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={status === "ON_HOLD" ? "보류 사유 (필수) — 예: 부품 수급 대기" : "변경 메모 (선택)"}
            className="input text-sm"
            aria-label="상태 변경 메모"
          />
          <button type="button" disabled={pending || status === current} onClick={() => submit(status)} className="btn-outline w-full">
            {pending ? "저장 중…" : `${withRo(STATUS_LABEL[status])} 변경`}
          </button>
        </div>
      </details>
      {msg && <p className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
