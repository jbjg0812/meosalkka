import { headers } from "next/headers";

// server.mjs가 X-Forwarded-For를 실제 접속 IP로 덮어쓴다 (TRUST_PROXY=true면 프록시가 넣은 값 사용)
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
