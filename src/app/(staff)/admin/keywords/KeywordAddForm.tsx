"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addKeywordAction } from "@/app/actions/classify";
import { FIELDS, CATEGORY_LABEL, type Field } from "@/lib/constants";

export default function KeywordAddForm({ defaultCategory }: { defaultCategory?: Field }) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [category, setCategory] = useState<Field>(defaultCategory ?? "FIREPOWER");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await addKeywordAction({ word, category });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setWord("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-2 p-4">
      <h2 className="font-bold">키워드 추가</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="예: 견인포, PRC-999K" maxLength={50} className="input" aria-label="키워드" required />
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as Field)} className="input sm:w-36" aria-label="분야">
            {FIELDS.map((f) => (
              <option key={f} value={f}>{CATEGORY_LABEL[f]}</option>
            ))}
          </select>
          <button className="btn-primary shrink-0" disabled={pending || !word.trim()}>추가</button>
        </div>
      </div>
      <p className="text-xs text-stone-500">공백·하이픈은 자동으로 제거되고 영문은 소문자로 저장됩니다. (K-9 → k9)</p>
      {msg && <p className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
