/**
 * 운영 서버 실행 스크립트 (npm start)
 *
 * next start와 같지만, 클라이언트가 보낸 X-Forwarded-For 헤더를 실제 접속 IP로 덮어써서
 * 신청 도배 방지·로그인 시도 제한을 헤더 위조로 우회하지 못하게 한다.
 * nginx 등 리버스 프록시 뒤에서 운영할 때만 TRUST_PROXY=true 로 설정한다.
 *
 *   PORT=3000 HOST=0.0.0.0 node server.mjs
 */
import { createServer } from "http";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 환경 변수 사용
}
process.env.NODE_ENV = "production";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const trustProxy = process.env.TRUST_PROXY === "true";

const { default: next } = await import("next");
const app = next({ dev: false, hostname: host, port });
const handle = app.getRequestHandler();
await app.prepare();

createServer((req, res) => {
  if (!trustProxy) {
    req.headers["x-forwarded-for"] = req.socket.remoteAddress ?? "unknown";
    delete req.headers["x-real-ip"];
  }
  handle(req, res);
}).listen(port, host, () => {
  console.log(`정비지원 서버 실행 중: http://${host === "0.0.0.0" ? "localhost" : host}:${port}${trustProxy ? " (프록시 신뢰 모드)" : ""}`);
});
