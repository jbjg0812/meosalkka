"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetPasswordAction, updateUserAction } from "@/app/actions/users";
import { CATEGORY_LABEL, FIELDS, ROLE_LABEL, type Field, type Role } from "@/lib/constants";
import TempPasswordBox from "./TempPasswordBox";

export type UserRowData = {
  id: number;
  username: string;
  name: string;
  role: Role;
  field: Field | null;
  active: boolean;
  mustChangePw: boolean;
  lastLogin: string | null;
  isMe: boolean;
};

export default function UserRow({ u }: { u: UserRowData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: u.name, role: u.role, field: (u.field ?? "") as Field | "", active: u.active });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next = f) {
    setMsg(null);
    start(async () => {
      const r = await updateUserAction({ id: u.id, ...next });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <li className={`p-4 ${u.active ? "" : "bg-stone-50"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`font-semibold ${u.active ? "" : "text-stone-400 line-through"}`}>{u.name}</span>
            {u.isMe && <span className="rounded bg-brand-100 px-1.5 text-[11px] font-semibold text-brand-800">나</span>}
            <span className={`rounded px-1.5 text-[11px] font-semibold ${u.role === "ADMIN" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700"}`}>
              {u.role === "ADMIN" ? "관리자" : u.field ? CATEGORY_LABEL[u.field] : "분야 미지정"}
            </span>
            {!u.active && <span className="rounded bg-stone-200 px-1.5 text-[11px] font-semibold text-stone-600">비활성</span>}
            {u.active && u.mustChangePw && <span className="rounded bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">비밀번호 변경 대기</span>}
          </div>
          <div className="mt-0.5 text-xs text-stone-500">
            <span className="font-mono">{u.username}</span> · 최근 로그인 {u.lastLogin ?? "없음"}
          </div>
        </div>
        {!editing && (
          <button type="button" className="shrink-0 rounded-md border border-stone-300 px-2.5 py-1 text-xs" onClick={() => setEditing(true)}>
            관리
          </button>
        )}
      </div>

      {temp && <div className="mt-3"><TempPasswordBox username={u.username} password={temp} onClose={() => setTemp(null)} /></div>}

      {editing && (
        <div className="mt-3 space-y-3 rounded-lg border border-stone-200 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={30} className="input py-2 text-sm" aria-label="계급·성명" />
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} disabled={u.isMe} className="input py-2 text-sm" aria-label="권한">
              {(["STAFF", "ADMIN"] as const).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <select value={f.field} onChange={(e) => setF({ ...f, field: e.target.value as Field | "" })} className="input py-2 text-sm" aria-label="담당 분야">
              <option value="">{f.role === "ADMIN" ? "전체" : "선택하세요"}</option>
              {FIELDS.map((x) => (
                <option key={x} value={x}>{CATEGORY_LABEL[x]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={pending} onClick={() => save()}>저장</button>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => { setEditing(false); setF({ name: u.name, role: u.role, field: (u.field ?? "") as Field | "", active: u.active }); }}>취소</button>
            {!u.isMe && (
              <>
                <button
                  type="button"
                  className="btn-outline px-4 py-2 text-sm"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`${u.name}의 비밀번호를 초기화할까요? 로그인 중이면 로그아웃됩니다.`)) return;
                    start(async () => {
                      const r = await resetPasswordAction(u.id);
                      setMsg({ ok: r.ok, text: r.message });
                      if (r.tempPassword) {
                        setTemp(r.tempPassword);
                        setEditing(false);
                        router.refresh();
                      }
                    });
                  }}
                >
                  비밀번호 초기화
                </button>
                <button
                  type="button"
                  className={`btn px-4 py-2 text-sm ${u.active ? "border border-red-200 text-red-600" : "border border-brand-200 text-brand-700"}`}
                  disabled={pending}
                  onClick={() => {
                    if (u.active && !confirm(`${u.name} 계정을 비활성화할까요? 즉시 로그아웃되고 로그인할 수 없습니다.`)) return;
                    save({ ...f, active: !u.active });
                  }}
                >
                  {u.active ? "비활성화" : "다시 활성화"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
    </li>
  );
}
