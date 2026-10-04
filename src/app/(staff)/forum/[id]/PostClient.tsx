"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCommentAction, deleteCommentAction, deletePostAction } from "@/app/actions/forum";

export function DeletePostButton({ postId }: { postId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-red-600"
      onClick={() => {
        if (!confirm("이 글을 삭제할까요? 댓글과 사진도 함께 삭제됩니다.")) return;
        start(async () => {
          const r = await deletePostAction(postId);
          if (r.ok) router.push("/forum");
          else alert(r.message);
        });
      }}
    >
      삭제
    </button>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-stone-400 hover:text-red-600"
      onClick={() => {
        if (!confirm("댓글을 삭제할까요?")) return;
        start(async () => {
          await deleteCommentAction(commentId);
          router.refresh();
        });
      }}
    >
      삭제
    </button>
  );
}

export function CommentForm({ postId }: { postId: number }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const r = await addCommentAction({ postId, content });
          if (r.ok) {
            setContent("");
            router.refresh();
          } else setErr(r.message);
        });
      }}
    >
      <div className="flex-1">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} maxLength={1000} placeholder="댓글을 입력하세요" className="input text-sm" aria-label="댓글" />
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
      <button className="btn-primary self-start px-4 py-2 text-sm" disabled={pending || !content.trim()}>등록</button>
    </form>
  );
}
