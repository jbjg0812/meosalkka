"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CATEGORY_LABEL, type Category } from "@/lib/constants";

type Fresh = { id: number; receiptNo: string; equipmentName: string; urgency: string; category: string; createdAt: string };
type Counts = { unread: Record<string, number>; mine: number };

const Ctx = createContext<Counts & { refresh: () => void }>({ unread: {}, mine: 0, refresh: () => {} });
export const useNotifications = () => useContext(Ctx);

const POLL_MS = 20_000;

/**
 * 20초마다 서버에 새 신청을 확인한다 (외부 푸시 서비스 불필요).
 * 담당 분야 신규 신청이 오면 화면 알림(토스트)과, 허용된 경우 브라우저 알림을 띄운다.
 */
export default function NotificationProvider({ initial, enabled = true, children }: { initial: Counts; enabled?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>(initial);
  const [toasts, setToasts] = useState<Fresh[]>([]);
  const since = useRef(new Date().toISOString());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [active, setActive] = useState(enabled);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
      if (res.status === 401) return setActive(false); // 로그아웃·비활성화된 경우 폴링 중단
      if (!res.ok) return;
      const data: Counts & { now: string; fresh: Fresh[] } = await res.json();
      since.current = data.now;
      setCounts({ unread: data.unread, mine: data.mine });
      if (data.fresh.length) {
        setToasts((t) => [...data.fresh, ...t].slice(0, 3));
        notifyBrowser(data.fresh);
        if (pathRef.current.startsWith("/board")) router.refresh();
      }
    } catch {
      // 네트워크 오류는 다음 주기에 재시도
    }
  }, [router]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(poll, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll, active]);

  // 상세 화면을 열면(읽음 처리) 배지를 바로 갱신
  useEffect(() => {
    if (active) poll();
  }, [pathname, poll, active]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(0, -1)), 10_000);
    return () => clearTimeout(t);
  }, [toasts]);

  return (
    <Ctx.Provider value={{ ...counts, refresh: poll }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl bg-stone-900 p-3 text-white shadow-lg">
            <Link href={`/requests/${t.id}`} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="flex-1">
              <div className="text-xs text-stone-300">
                새 정비신청 · {CATEGORY_LABEL[t.category as Category]}
                {t.urgency === "URGENT" && <span className="ml-1.5 rounded bg-red-600 px-1 font-bold text-white">긴급</span>}
              </div>
              <div className="font-semibold">{t.equipmentName}</div>
            </Link>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="px-1 text-stone-400" aria-label="알림 닫기">
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function notifyBrowser(items: Fresh[]) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  for (const it of items) {
    const n = new Notification(`${it.urgency === "URGENT" ? "[긴급] " : ""}새 정비신청 · ${CATEGORY_LABEL[it.category as Category]}`, {
      body: `${it.equipmentName} (${it.receiptNo})`,
      tag: `req-${it.id}`,
    });
    n.onclick = () => {
      window.focus();
      location.href = `/requests/${it.id}`;
    };
  }
}
