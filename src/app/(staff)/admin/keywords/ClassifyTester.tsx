"use client";

import { useState, useTransition } from "react";
import { previewClassifyAction } from "@/app/actions/classify";
import { CategoryBadge } from "@/components/Badges";
import type { ClassifyResult } from "@/lib/classify";
import { CATEGORY_LABEL, FIELDS } from "@/lib/constants";

export default function ClassifyTester() {
  const [eq, setEq] = useState("");
  const [sy, setSy] = useState("");
  const [r, setR] = useState<ClassifyResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-bold">분류 테스트</summary>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setR(await previewClassifyAction(eq, sy)));
        }}
      >
        <input value={eq} onChange={(e) => setEq(e.target.value)} placeholder="장비명" className="input" maxLength={100} aria-label="테스트 장비명" />
        <textarea value={sy} onChange={(e) => setSy(e.target.value)} placeholder="증상" rows={2} className="input" maxLength={2000} aria-label="테스트 증상" />
        <button className="btn-outline w-full" disabled={pending}>{pending ? "확인 중…" : "어떻게 분류되는지 확인"}</button>
      </form>
      {r && (
        <div className="mt-3 space-y-2 rounded-lg bg-stone-50 p-3 text-sm" data-testid="classify-result">
          <div className="flex items-center gap-2">
            결과: <CategoryBadge category={r.category} />
            {r.reason === "tie" && <span className="text-xs text-orange-700">(분야 간 동점)</span>}
            {r.reason === "none" && <span className="text-xs text-orange-700">(일치하는 키워드 없음)</span>}
          </div>
          {r.matches.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {r.matches.map((m) => (
                <li key={m.word} className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-stone-200">
                  {m.word} <span className="text-stone-400">→ {CATEGORY_LABEL[m.category]} ({m.where === "equipment" ? "장비명" : "증상"})</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-stone-500">
            점수 {FIELDS.map((f) => `${CATEGORY_LABEL[f].replace("장비", "")} ${r.scores[f]}`).join(" · ")} — 장비명 일치를 우선하고, 증상은 동점일 때나 장비명에 일치가 없을 때 사용합니다.
          </p>
        </div>
      )}
    </details>
  );
}
