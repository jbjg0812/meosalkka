import "server-only";
import { sign, verify } from "./sign";

// 신청자 조회 권한 쿠키: 접수번호 + 전화번호 뒷4자리를 서명한 값.
// 전화번호 자체는 쿠키에 담지 않는다.
export function trackCookieName(receiptNo: string) {
  return `trk_${receiptNo.replace("-", "_")}`;
}

export function trackCookieValue(receiptNo: string, phone: string) {
  return sign(`track:${receiptNo}:${phone.slice(-4)}`);
}

export function verifyTrackCookie(receiptNo: string, phone: string, value: string | undefined) {
  if (!value) return false;
  return verify(`track:${receiptNo}:${phone.slice(-4)}`, value);
}
