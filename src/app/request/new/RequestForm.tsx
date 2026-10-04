"use client";

import { useActionState, useState, useTransition } from "react";
import { createRequestAction } from "@/app/actions/request";
import FormMessage from "@/components/FormMessage";
import PhotoPicker, { type PickedPhoto } from "@/components/PhotoPicker";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;
}

export default function RequestForm({ formToken }: { formToken: string }) {
  const [state, action] = useActionState(createRequestAction, undefined);
  const [pending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const fe = state?.fieldErrors ?? {};

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    photos.forEach((p) => fd.append("photos", p.file));
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="formToken" value={formToken} />
      {/* 봇 차단용 숨김 필드: 사람은 보지 못하므로 비어 있어야 함 */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          웹사이트
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <section className="card space-y-4 p-4">
        <h2 className="font-bold text-stone-800">장비 정보</h2>
        <div>
          <label htmlFor="equipmentName" className="label">장비명 <span className="text-red-600">*</span></label>
          <input id="equipmentName" name="equipmentName" required maxLength={100} placeholder="예: K-9 자주포, 무전기 PRC-999K" className="input" />
          <FieldError msg={fe.equipmentName} />
        </div>
        <div>
          <label htmlFor="symptom" className="label">증상 <span className="text-red-600">*</span></label>
          <textarea id="symptom" name="symptom" required maxLength={2000} rows={5} placeholder="언제부터, 어떤 상황에서, 어떤 문제가 생기는지 적어주세요." className="input resize-y" />
          <FieldError msg={fe.symptom} />
        </div>
        <fieldset>
          <legend className="label">긴급도 <span className="text-red-600">*</span></legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "NORMAL", label: "보통", cls: "peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-800" },
              { v: "URGENT", label: "긴급", cls: "peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-700" },
            ].map((o) => (
              <label key={o.v} className="cursor-pointer">
                <input type="radio" name="urgency" value={o.v} defaultChecked={o.v === "NORMAL"} className="peer sr-only" />
                <span className={`block rounded-lg border-2 border-stone-200 bg-white py-3 text-center font-semibold text-stone-600 ${o.cls}`}>
                  {o.label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">작전·훈련에 즉시 지장이 있으면 긴급을 선택하세요.</p>
          <FieldError msg={fe.urgency} />
        </fieldset>
        <div>
          <span className="label">사진 첨부 (선택, 최대 3장)</span>
          <PhotoPicker photos={photos} onChange={setPhotos} error={fe.photos} />
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-bold text-stone-800">신청자 정보</h2>
        <div>
          <label htmlFor="unit" className="label">소속 <span className="text-red-600">*</span></label>
          <input id="unit" name="unit" required maxLength={100} placeholder="예: 1대대 2중대" className="input" autoComplete="organization" />
          <FieldError msg={fe.unit} />
        </div>
        <div>
          <label htmlFor="applicantName" className="label">계급·이름 <span className="text-red-600">*</span></label>
          <input id="applicantName" name="applicantName" required maxLength={30} placeholder="예: 병장 홍길동" className="input" autoComplete="name" />
          <FieldError msg={fe.applicantName} />
        </div>
        <div>
          <label htmlFor="phone" className="label">전화번호 <span className="text-red-600">*</span></label>
          <input id="phone" name="phone" required type="tel" inputMode="tel" maxLength={20} placeholder="010-1234-5678" className="input" autoComplete="tel" />
          <p className="mt-1 text-xs text-stone-500">정비인원이 연락할 번호입니다. 정비부대 인원에게만 보입니다.</p>
          <FieldError msg={fe.phone} />
        </div>
      </section>

      <FormMessage state={state?.error ? { error: state.error } : undefined} />
      <button type="submit" disabled={pending} className="btn-primary w-full py-3.5 text-lg">
        {pending ? "접수 중…" : "정비 신청하기"}
      </button>
    </form>
  );
}
