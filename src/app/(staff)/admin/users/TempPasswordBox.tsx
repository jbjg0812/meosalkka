"use client";

import { useState } from "react";

/** 임시 비밀번호는 한 번만 보여준다 (DB에는 해시만 저장) */
export default function TempPasswordBox({ username, password, onClose }: { username: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-sm" role="status">
      <div className="font-semibold text-amber-900">임시 비밀번호 — 지금만 표시됩니다</div>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-lg tracking-wider select-all" data-testid="temp-password">{password}</code>
        <button
          type="button"
          className="btn-outline px-3 py-2 text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(password);
              setCopied(true);
            } catch {}
          }}
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-800">
        아이디 <b>{username}</b>와 함께 본인에게 직접 전달하세요. 첫 로그인 때 비밀번호를 바꿔야 합니다.
      </p>
      <button type="button" onClick={onClose} className="mt-2 text-xs font-semibold text-amber-900 underline">확인했습니다</button>
    </div>
  );
}
