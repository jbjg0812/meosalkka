"use client";

import { useActionState, useState, useTransition } from "react";
import { createPostAction, updatePostAction } from "@/app/actions/forum";
import FormMessage from "@/components/FormMessage";
import PhotoPicker, { type PickedPhoto } from "@/components/PhotoPicker";
import { CATEGORY_LABEL, FIELDS } from "@/lib/constants";

type Initial = { title: string; content: string; fieldTag: string; sourceRequestId?: number; sourceLabel?: string };

export default function PostForm({ initial, postId }: { initial: Initial; postId?: number }) {
  const editing = postId !== undefined;
  const [state, action] = useActionState(editing ? updatePostAction : createPostAction, undefined);
  const [pending, start] = useTransition();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const fe = state?.fieldErrors ?? {};

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photos");
        photos.forEach((p) => fd.append("photos", p.file));
        start(() => action(fd));
      }}
    >
      {editing && <input type="hidden" name="postId" value={postId} />}
      {initial.sourceRequestId && <input type="hidden" name="sourceRequestId" value={initial.sourceRequestId} />}
      {initial.sourceLabel && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">완료된 신청 <b>{initial.sourceLabel}</b>에서 가져온 내용입니다. 원인·노하우를 보충해 주세요.</p>
      )}
      <div>
        <label htmlFor="fieldTag" className="label">분야 태그</label>
        <select id="fieldTag" name="fieldTag" defaultValue={initial.fieldTag} className="input">
          <option value="">공통</option>
          {FIELDS.map((f) => (
            <option key={f} value={f}>{CATEGORY_LABEL[f]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="title" className="label">제목</label>
        <input id="title" name="title" defaultValue={initial.title} maxLength={100} required className="input" />
        {fe.title && <p className="mt-1 text-xs text-red-600">{fe.title}</p>}
      </div>
      <div>
        <label htmlFor="content" className="label">내용</label>
        <textarea id="content" name="content" defaultValue={initial.content} maxLength={10000} rows={14} required className="input resize-y leading-relaxed" />
        {fe.content && <p className="mt-1 text-xs text-red-600">{fe.content}</p>}
      </div>
      {!editing && (
        <div>
          <span className="label">사진 (선택, 최대 3장)</span>
          <PhotoPicker photos={photos} onChange={setPhotos} error={fe.photos} />
        </div>
      )}
      <FormMessage state={state?.error ? { error: state.error } : undefined} />
      <button className="btn-primary w-full py-3" disabled={pending}>{pending ? "저장 중…" : editing ? "수정 완료" : "등록"}</button>
    </form>
  );
}
