import Link from "next/link";
import { formatRelative } from "@/lib/format";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "./Badges";
import { IconCamera } from "./icons";

export type RequestCardData = {
  id: number;
  receiptNo: string;
  equipmentName: string;
  symptom: string;
  unit: string;
  urgency: string;
  status: string;
  category: string;
  createdAt: Date;
  _count: { photos: number };
};

export default function RequestCard({ r, unread, showCategory }: { r: RequestCardData; unread: boolean; showCategory?: boolean }) {
  return (
    <Link
      href={`/requests/${r.id}`}
      className={`card block p-4 transition hover:border-brand-500 ${r.urgency === "URGENT" && r.status !== "DONE" ? "border-l-4 border-l-red-500" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        {unread && <span className="rounded bg-red-500 px-1.5 text-[11px] font-bold text-white">NEW</span>}
        <UrgencyBadge urgency={r.urgency} />
        <StatusBadge status={r.status} />
        {showCategory && <CategoryBadge category={r.category} />}
        <span className="ml-auto shrink-0 text-xs text-stone-500" title={r.createdAt.toISOString()}>
          {formatRelative(r.createdAt)}
        </span>
      </div>
      <div className={`mt-1.5 truncate font-bold ${unread ? "text-stone-900" : "text-stone-800"}`}>{r.equipmentName}</div>
      <p className="line-clamp-1 text-sm text-stone-600">{r.symptom}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
        <span className="font-mono">{r.receiptNo}</span>
        <span>·</span>
        <span className="truncate">{r.unit}</span>
        {r._count.photos > 0 && (
          <span className="ml-auto flex items-center gap-0.5">
            <IconCamera className="size-3.5" />
            {r._count.photos}
          </span>
        )}
      </div>
    </Link>
  );
}
