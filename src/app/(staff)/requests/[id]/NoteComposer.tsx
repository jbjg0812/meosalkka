"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addActionNoteAction, addReplyAction } from "@/app/actions/handle";

export default function NoteComposer({ requestId, kind }: { requestId: number; kind: "action" | "reply" }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const isReply = kind === "reply";

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await (isReply ? addReplyAction : addActionNoteAction)({ requestId, content });
          setMsg({ ok: r.ok, text: r.message });
          if (r.ok) {
            setContent("");
            router.refresh();
          }
        });
      }}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={3}
        required
        placeholder={isReply ? "신청자에게 보낼 답글 (예: 내일 오전 방문 예정입니다)" : "조치내용 (예: 유압펌프 씰 교체, 누유 점검 완료)"}
        className="input text-sm"
        aria-label={isReply ? "답글 내용" : "조치내용"}
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${isReply ? "text-amber-700" : "text-stone-500"}`}>
          {isReply ? "⚠ 신청자 조회 화면에 공개됩니다" : "정비부대 내부에만 보입니다"}
        </span>
        <button className="btn-primary shrink-0 px-4 py-2 text-sm" disabled={pending || !content.trim()}>
          {pending ? "저장 중…" : isReply ? "답글 등록" : "기록"}
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
