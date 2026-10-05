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

/** 소요 시간 표시: 45분, 3시간 20분, 2.5일 */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(1, min)}분`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h}시간 ${min % 60}분` : `${h}시간`;
  return `${(ms / 86_400_000).toFixed(1)}일`;
}

/** KST 기준 오늘 0시 */
export function kstStartOfToday(now = new Date()): Date {
  const k = kstDateKey(now);
  return new Date(`${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T00:00:00+09:00`);
}
