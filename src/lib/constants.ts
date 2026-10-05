export const FIELDS = ["FIREPOWER", "MOBILITY", "COMMS", "GENERAL"] as const;
export type Field = (typeof FIELDS)[number];

export const CATEGORIES = [...FIELDS, "UNCLASSIFIED"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  FIREPOWER: "화력장비",
  MOBILITY: "기동장비",
  COMMS: "통신장비",
  GENERAL: "일반장비",
  UNCLASSIFIED: "미분류",
};

export const FIELD_SHORT: Record<Field, string> = {
  FIREPOWER: "화력",
  MOBILITY: "기동",
  COMMS: "통신",
  GENERAL: "일반",
};

export const STATUSES = ["RECEIVED", "CONFIRMED", "IN_PROGRESS", "DONE", "ON_HOLD"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  RECEIVED: "접수",
  CONFIRMED: "확인",
  IN_PROGRESS: "정비중",
  DONE: "완료",
  ON_HOLD: "보류",
};

export const URGENCIES = ["URGENT", "NORMAL"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const URGENCY_LABEL: Record<Urgency, string> = {
  URGENT: "긴급",
  NORMAL: "보통",
};

export const ROLES = ["ADMIN", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "관리자(정비통제장교)",
  STAFF: "정비인원",
};

export function isField(v: unknown): v is Field {
  return typeof v === "string" && (FIELDS as readonly string[]).includes(v);
}
