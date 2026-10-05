"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createUserAction } from "@/app/actions/users";
import { CATEGORY_LABEL, FIELDS, type Field, type Role } from "@/lib/constants";
import TempPasswordBox from "./TempPasswordBox";

export default function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ username: "", name: "", role: "STAFF" as Role, field: "" as Field | "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);
  const [pending, start] = useTransition();

  if (created) return <TempPasswordBox username={created.username} password={created.password} onClose={() => setCreated(null)} />;
  if (!open)
    return (
      <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
        + 계정 추가
      </button>
    );

  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createUserAction(f);
          setMsg({ ok: r.ok, text: r.message });
          if (r.ok && r.tempPassword) {
            setCreated({ username: f.username.trim().toLowerCase(), password: r.tempPassword });
            setF({ username: "", name: "", role: "STAFF", field: "" });
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      <h2 className="font-bold">계정 추가</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nu-username" className="label">아이디</label>
          <input id="nu-username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="영문 소문자·숫자 (예: kim01)" maxLength={20} required className="input" autoCapitalize="none" />
        </div>
        <div>
          <label htmlFor="nu-name" className="label">계급·성명</label>
          <input id="nu-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="예: 중사 김정비" maxLength={30} required className="input" />
        </div>
        <div>
          <label htmlFor="nu-role" className="label">권한</label>
          <select id="nu-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} className="input">
            <option value="STAFF">정비인원</option>
            <option value="ADMIN">관리자(정비통제장교)</option>
          </select>
        </div>
        <div>
          <label htmlFor="nu-field" className="label">담당 분야</label>
          <select id="nu-field" value={f.field} onChange={(e) => setF({ ...f, field: e.target.value as Field | "" })} className="input">
            <option value="">{f.role === "ADMIN" ? "전체 (관리자)" : "선택하세요"}</option>
            {FIELDS.map((x) => (
              <option key={x} value={x}>{CATEGORY_LABEL[x]}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-stone-500">임시 비밀번호가 자동으로 만들어지고, 첫 로그인 때 본인이 바꿉니다.</p>
      {msg && !msg.ok && <p className="text-sm text-red-600">{msg.text}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>취소</button>
        <button className="btn-primary flex-1" disabled={pending}>{pending ? "만드는 중…" : "만들기"}</button>
      </div>
    </form>
  );
}
