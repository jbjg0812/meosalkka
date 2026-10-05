"use client";

import { useActionState } from "react";
import { trackAction } from "@/app/actions/request";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";

export default function TrackForm({ initialNo }: { initialNo: string }) {
  const [state, action] = useActionState(trackAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="receiptNo" className="label">접수번호</label>
        <input
          id="receiptNo"
          name="receiptNo"
          required
          maxLength={20}
          inputMode="numeric"
          placeholder="20261004-0001"
          defaultValue={state?.values?.receiptNo ?? initialNo}
          className="input font-mono tracking-wider"
        />
      </div>
      <div>
        <label htmlFor="last4" className="label">전화번호 뒷 4자리</label>
        <input id="last4" name="last4" required inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="5678" className="input font-mono tracking-widest" autoComplete="off" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="조회 중…">조회하기</SubmitButton>
    </form>
  );
}
