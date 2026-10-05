"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";

export default function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="label">아이디</label>
        <input id="username" name="username" autoComplete="username" required maxLength={50} defaultValue={state?.values?.username} className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="로그인 중…">로그인</SubmitButton>
    </form>
  );
}
