import { CATEGORY_LABEL, STATUS_LABEL, URGENCY_LABEL, type Category, type Status, type Urgency } from "@/lib/constants";

const STATUS_STYLE: Record<Status, string> = {
  RECEIVED: "bg-sky-100 text-sky-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  DONE: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-stone-200 text-stone-700",
};

const pill = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap";

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return <span className={`${pill} ${STATUS_STYLE[s] ?? ""}`}>{STATUS_LABEL[s] ?? status}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const u = urgency as Urgency;
  return (
    <span className={`${pill} ${u === "URGENT" ? "bg-red-600 text-white" : "bg-stone-100 text-stone-600"}`}>
      {URGENCY_LABEL[u] ?? urgency}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const c = category as Category;
  return (
    <span className={`${pill} ${c === "UNCLASSIFIED" ? "bg-orange-100 text-orange-800" : "bg-brand-100 text-brand-800"}`}>
      {CATEGORY_LABEL[c] ?? category}
    </span>
  );
}
