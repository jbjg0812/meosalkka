# 정비지원 웹사이트

장비 정비 신청(로그인 없음) → 자동 분류 → 분야별 정비인원 처리 → 관리자 현황 조회.
Next.js 15 + TypeScript + Tailwind CSS 4 + SQLite(Prisma 6). 외부 API·CDN을 쓰지 않습니다.

## 로컬 실행

필요: Node.js 20 이상 (권장 22)

```bash
npm install
cp .env.example .env           # 필요 시 관리자 초기 비밀번호 등 수정
npx prisma db push             # prisma/dev.db 생성
npm run db:seed -- --demo      # 관리자 + 키워드 사전 + 테스트 정비인원 계정
npm run dev                    # http://localhost:3000
```

같은 와이파이의 휴대폰에서 확인하려면 `npm run dev -- -H 0.0.0.0` 후 `http://<PC IP>:3000` 접속.

운영 모드: `npm run build && npm start`

### 환경 변수

`.env`의 `APP_SECRET`에 임의의 긴 문자열을 넣으세요 (비우면 서버 재시작마다 신청자 조회 쿠키가 초기화됨).

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

업로드 사진은 `uploads/` 폴더에 저장됩니다 (`UPLOAD_DIR`로 변경 가능). DB와 함께 백업하세요.

### 초기 계정

| 구분 | 아이디 | 비밀번호 | 비고 |
|---|---|---|---|
| 관리자 | admin | `.env`의 `ADMIN_PASSWORD` (기본 `ChangeMe!2026`) | 첫 로그인 시 비밀번호 변경 |
| 정비인원(화력/기동/통신/일반) | fire1 / move1 / comm1 / gen1 | `Test1234!` | `--demo` 옵션일 때만 생성 |

DB 초기화: `prisma/dev.db` 삭제 후 `npx prisma db push && npm run db:seed -- --demo`

## 구현 단계

- [x] 1단계: 프로젝트 기본 틀, DB 스키마, 로그인·역할별 접근 제어
- [x] 2단계: 정비신청, 접수번호, 진행 조회, 사진 첨부, 도배 방지
- [ ] 3단계: 키워드 자동 분류, 키워드 관리
- [ ] 4단계: 분야별 게시판, 상세 처리, 미확인 배지·알림
- [ ] 5단계: 정비인원 게시판
- [ ] 6단계: 관리자 대시보드, 계정 관리, 배포(폐쇄망) 가이드

## 보안 요약

- 비밀번호 bcrypt 해시, 세션 토큰은 SHA-256 해시로만 DB 저장, httpOnly 쿠키
- 로그인 실패 제한 (계정당 15분 5회, IP당 20회)
- 모든 정비인원/관리자 화면은 서버에서 세션·역할 재확인
- 신청 폼 도배 방지: IP당 10분 5건, 전화번호당 1시간 5건, 숨김 함정 필드, 3초 이내 제출 거부
- 진행 조회: 접수번호 + 전화번호 뒷 4자리 확인 후 서명된 쿠키로 열람, 실패 시 IP당 10분 10회 제한
- 사진: 파일 내용으로 형식 확인(JPG/PNG/WEBP), 장당 5MB·최대 3장, 정비인원만 열람
- CSP로 자기 서버 외 리소스 로드 차단
- HTTPS로 운영 시 `.env`의 `COOKIE_SECURE="true"`
