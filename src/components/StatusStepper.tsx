import { STATUS_LABEL, type Status } from "@/lib/constants";

const FLOW: Status[] = ["RECEIVED", "CONFIRMED", "IN_PROGRESS", "DONE"];

/** 접수 → 확인 → 정비중 → 완료 진행 표시. 보류는 별도 안내 */
export default function StatusStepper({ status }: { status: string }) {
  const onHold = status === "ON_HOLD";
  const idx = FLOW.indexOf(status as Status);
  return (
    <div>
      <ol className="flex items-start">
        {FLOW.map((s, i) => {
          const done = !onHold && i <= idx;
          const current = !onHold && i === idx;
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  className={`absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2 ${done ? "bg-brand-600" : "bg-stone-200"}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-brand-600 text-white" : "bg-stone-200 text-stone-500"
                } ${current ? "ring-4 ring-brand-200" : ""}`}
              >
                {i + 1}
              </span>
              <span className={`mt-1.5 text-xs ${current ? "font-bold text-brand-700" : done ? "text-stone-700" : "text-stone-400"}`}>
                {STATUS_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      {onHold && (
        <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-center text-sm font-semibold text-stone-700">
          현재 <b>보류</b> 상태입니다. 아래 답글이나 정비반 연락을 확인하세요.
        </p>
      )}
    </div>
  );
}
