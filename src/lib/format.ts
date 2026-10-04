const TZ = "Asia/Seoul";

const dtf = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 2026. 10. 04. 14:05 → "2026-10-04 14:05" */
export function formatDateTime(d: Date): string {
  const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** "방금 전", "5분 전", "3시간 전", 하루 이상은 날짜 */
export function formatRelative(d: Date, now = new Date()): string {
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return formatDateTime(d).slice(0, 10);
}

/** KST 기준 yyyymmdd */
export function kstDateKey(d = new Date()): string {
  const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}${p.month}${p.day}`;
}
