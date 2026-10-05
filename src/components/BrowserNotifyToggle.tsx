"use client";

import { useEffect, useState } from "react";

export default function BrowserNotifyToggle() {
  const [state, setState] = useState<"unsupported" | "insecure" | NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification === "undefined") setState(window.isSecureContext ? "unsupported" : "insecure");
    else setState(Notification.permission);
  }, []);

  const text: Record<string, string> = {
    granted: "브라우저 알림이 켜져 있습니다.",
    denied: "브라우저 알림이 차단되어 있습니다. 브라우저 설정에서 이 사이트의 알림을 허용하세요.",
    unsupported: "이 브라우저는 알림을 지원하지 않습니다. 화면 상단 알림으로 표시됩니다.",
    insecure: "브라우저 알림은 HTTPS 또는 localhost에서만 사용할 수 있습니다. 화면 상단 알림으로 표시됩니다.",
  };

  return (
    <div className="card space-y-2 p-4 text-sm">
      <div className="font-semibold">새 신청 알림</div>
      <p className="text-stone-600">
        사이트를 열어두면 담당 분야에 새 신청이 들어올 때 화면 상단에 알림이 뜹니다.
        {state === "default" && " 다른 탭을 보고 있을 때도 받으려면 브라우저 알림을 켜세요."}
      </p>
      {state === "default" ? (
        <button className="btn-outline w-full" onClick={async () => setState(await Notification.requestPermission())}>
          브라우저 알림 켜기
        </button>
      ) : (
        <p className="text-xs text-stone-500">{text[state]}</p>
      )}
    </div>
  );
}
