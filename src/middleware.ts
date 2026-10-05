import { NextResponse, type NextRequest } from "next/server";

// 1차 방어: 세션 쿠키가 없으면 로그인 화면으로 보낸다.
// 실제 세션 검증과 역할 확인은 각 페이지/액션에서 서버측으로 수행한다.
const PROTECTED = ["/board", "/requests", "/forum", "/admin", "/account", "/files"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (!req.cookies.get("ms_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
