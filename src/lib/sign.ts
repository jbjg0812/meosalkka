import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

let fallbackSecret: string | null = null;

function secret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 16) return s;
  // 설정이 없으면 프로세스 단위 임시 키 사용 (서버 재시작 시 조회 쿠키가 무효화됨)
  if (!fallbackSecret) {
    fallbackSecret = randomBytes(32).toString("hex");
    console.warn("[정비지원] APP_SECRET이 설정되지 않아 임시 키를 사용합니다. .env에 설정하세요.");
  }
  return fallbackSecret;
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function verify(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** 신청 폼 토큰: 폼을 연 시각을 서명해 두고, 너무 빨리 제출되면(봇) 거부한다. */
export function issueFormToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign("form:" + ts)}`;
}

export function checkFormToken(token: string, minMs: number, maxMs: number): "ok" | "fast" | "invalid" {
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts) || !verify("form:" + ts, sig)) return "invalid";
  const age = Date.now() - Number(ts);
  if (age < minMs) return "fast";
  if (age > maxMs) return "invalid";
  return "ok";
}
