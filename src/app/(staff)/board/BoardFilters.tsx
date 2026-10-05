"use client";

import { STATUSES, STATUS_LABEL } from "@/lib/constants";

/** GET 폼: 선택을 바꾸면 바로 적용 */
export default function BoardFilters({ tab, status, urgency, q, unread }: { tab: string; status: string; urgency: string; q: string; unread: boolean }) {
  const submit = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => e.currentTarget.form?.requestSubmit();
  return (
    <form className="space-y-2" action="/board">
      <input type="hidden" name="tab" value={tab} />
      <div className="flex gap-2">
        <select name="status" defaultValue={status} onChange={submit} className="input py-2 text-sm" aria-label="상태 필터">
          <option value="open">미완료 전체</option>
          <option value="all">전체</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select name="urgency" defaultValue={urgency} onChange={submit} className="input py-2 text-sm" aria-label="긴급도 필터">
          <option value="">긴급도 전체</option>
          <option value="URGENT">긴급</option>
          <option value="NORMAL">보통</option>
        </select>
      </div>
      <div className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="장비명·증상·소속·접수번호 검색" maxLength={50} className="input py-2 text-sm" type="search" />
        <button className="btn-outline shrink-0 py-2 text-sm">검색</button>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" name="unread" value="1" defaultChecked={unread} onChange={submit} className="size-4 accent-brand-600" />
        미확인만 보기
      </label>
    </form>
  );
}
