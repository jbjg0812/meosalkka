"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reclassifyAction } from "@/app/actions/classify";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/constants";

/**
 * 분류 수동 변경. 정비 분야로 바꾸면 "장비명을 사전에 추가할까요?"를 묻는다.
 * knownKeywordCategory: 장비명이 이미 사전에 있다면 그 분야 (같은 분야로 바꾸면 묻지 않음)
 */
export default function ReclassifyControl({
  requestId,
  current,
  equipmentName,
  knownKeywordCategory,
  compact = false,
}: {
  requestId: number;
  current: string;
  equipmentName: string;
  knownKeywordCategory?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Category>(current as Category);
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(addKeyword: boolean) {
    setAsking(false);
    start(async () => {
      const r = await reclassifyAction({ requestId, category: value, addKeyword });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });
  }

  function onApply() {
    setMsg(null);
    if (value === "UNCLASSIFIED" || knownKeywordCategory === value) {
      if (value === current) return setMsg({ ok: false, text: "현재와 같은 분류입니다." });
      return run(false);
    }
    setAsking(true);
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as Category)}
          className={`input ${compact ? "py-2 text-sm" : ""}`}
          aria-label="분류 선택"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onApply} disabled={pending} className={`btn-primary shrink-0 ${compact ? "px-3 py-2 text-sm" : ""}`}>
          {pending ? "저장 중…" : "분류 변경"}
        </button>
      </div>
      {msg && <p className={`mt-1 text-xs ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}

      {asking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold">키워드 사전에 추가할까요?</h3>
            <p className="mt-2 text-sm text-stone-600">
              장비명 <b className="text-stone-900">‘{equipmentName}’</b>을(를) <b className="text-brand-700">{CATEGORY_LABEL[value]}</b> 키워드로
              등록하면, 다음부터 같은 장비명은 자동으로 분류됩니다.
            </p>
            {knownKeywordCategory && knownKeywordCategory !== value && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                이 장비명은 현재 {CATEGORY_LABEL[knownKeywordCategory as Category]} 키워드로 등록되어 있습니다. 추가하면 분야가 바뀝니다.
              </p>
            )}
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn-primary" onClick={() => run(true)}>사전에 추가하고 변경</button>
              <button type="button" className="btn-outline" onClick={() => run(false)}>분류만 변경</button>
              <button type="button" className="btn text-stone-500" onClick={() => setAsking(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
