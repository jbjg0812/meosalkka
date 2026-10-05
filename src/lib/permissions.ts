import type { SessionUser } from "./auth";

/**
 * 신청 건 처리 권한 (상태 변경, 조치내용, 답글, 분류 변경)
 *  - 관리자: 전체
 *  - 정비인원: 본인 담당 분야 + 미분류
 * 조회는 모든 정비인원이 전 분야 가능하다.
 */
export function canHandle(user: Pick<SessionUser, "role" | "field">, category: string): boolean {
  if (user.role === "ADMIN") return true;
  if (category === "UNCLASSIFIED") return true;
  return user.field === category;
}

/** 알림을 받을 분야: 관리자는 전체, 정비인원은 본인 분야 */
export function notifyCategories(user: Pick<SessionUser, "role" | "field">): string[] | null {
  if (user.role === "ADMIN") return null; // null = 전체
  return user.field ? [user.field] : [];
}
