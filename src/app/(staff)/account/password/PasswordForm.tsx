"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";

export default function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="current" className="label">현재 비밀번호</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label htmlFor="next" className="label">새 비밀번호</label>
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className="input" />
        <p className="mt-1 text-xs text-stone-500">8자 이상, 영문·숫자·특수문자 모두 포함</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">새 비밀번호 확인</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="변경 중…">비밀번호 변경</SubmitButton>
    </form>
  );
}
