"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteKeywordAction, updateKeywordAction } from "@/app/actions/classify";
import { FIELDS, CATEGORY_LABEL, type Field } from "@/lib/constants";

type K = { id: number; word: string; category: string; active: boolean; createdBy: string | null };

export default function KeywordRow({ k }: { k: K }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [word, setWord] = useState(k.word);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; message: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.message);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <li className={`px-4 py-3 ${k.active ? "" : "bg-stone-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <input value={word} onChange={(e) => setWord(e.target.value)} maxLength={50} className="input w-40 py-1.5 text-sm" aria-label="키워드 수정" autoFocus />
        ) : (
          <span className={`font-mono text-sm font-semibold ${k.active ? "" : "text-stone-400 line-through"}`}>{k.word}</span>
        )}
        {k.createdBy && <span className="text-xs text-stone-400">· {k.createdBy}</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={k.category}
            disabled={pending}
            onChange={(e) => act(() => updateKeywordAction({ id: k.id, category: e.target.value as Field }))}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs"
            aria-label={`${k.word} 분야`}
          >
            {FIELDS.map((f) => (
              <option key={f} value={f}>{CATEGORY_LABEL[f]}</option>
            ))}
          </select>
          {editing ? (
            <>
              <button className="rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white" disabled={pending} onClick={() => act(() => updateKeywordAction({ id: k.id, word }))}>저장</button>
              <button className="rounded-md px-2 py-1 text-xs text-stone-500" onClick={() => { setEditing(false); setWord(k.word); }}>취소</button>
            </>
          ) : (
            <>
              <button className="rounded-md border border-stone-300 px-2 py-1 text-xs" onClick={() => setEditing(true)}>수정</button>
              <button className="rounded-md border border-stone-300 px-2 py-1 text-xs" disabled={pending} onClick={() => act(() => updateKeywordAction({ id: k.id, active: !k.active }))}>
                {k.active ? "끄기" : "켜기"}
              </button>
              <button
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                disabled={pending}
                onClick={() => confirm(`'${k.word}' 키워드를 삭제할까요?`) && act(() => deleteKeywordAction(k.id))}
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </li>
  );
}
