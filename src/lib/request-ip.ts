import { headers } from "next/headers";

// 리버스 프록시(nginx 등) 뒤에서 운영할 경우 X-Forwarded-For의 첫 값을 사용
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
