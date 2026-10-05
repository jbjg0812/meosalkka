# 배포·운영 가이드

정비지원 시스템을 서버 한 대에서 운영하는 방법입니다. 외부 API·CDN을 쓰지 않으므로
설치가 끝나면 인터넷 없이 동작합니다. (설치할 때 `npm ci`만 인터넷이 필요)

- [1. 준비물](#1-준비물)
- [2. 설치 (인터넷 환경 시범 운영)](#2-설치-인터넷-환경-시범-운영)
- [3. 상시 실행](#3-상시-실행)
- [4. HTTPS (선택)](#4-https-선택)
- [5. 백업과 복구](#5-백업과-복구)
- [6. 업데이트](#6-업데이트)
- [7. 폐쇄망으로 이전](#7-폐쇄망으로-이전)
- [8. 운영 전 체크리스트](#8-운영-전-체크리스트)

---

## 1. 준비물

| 항목 | 내용 |
|---|---|
| 서버 | Linux(Ubuntu 22.04 이상 권장) 또는 Windows 10/11·Server. 메모리 2GB 이상 |
| Node.js | 22 LTS (20 이상) — https://nodejs.org 에서 설치 파일 |
| 저장공간 | 프로그램 약 1GB + 사진 (신청 1건당 사진 3장 기준 약 1MB) |
| 네트워크 | 사용자 PC·휴대폰이 서버의 포트(기본 3000)에 접속 가능해야 함 |

## 2. 설치 (인터넷 환경 시범 운영)

```bash
git clone https://github.com/jbjg0812/meosalkka.git
cd meosalkka
git checkout claude/maintenance-support-website-1nly32   # main에 병합 전까지
npm ci
cp .env.example .env        # Windows: copy .env.example .env
```

`.env`를 열어 반드시 바꿉니다.

```ini
ADMIN_PASSWORD="처음-로그인할-관리자-비밀번호"
APP_SECRET="(아래 명령으로 만든 64자리 값)"
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

DB 생성, 초기 데이터, 빌드, 실행:

```bash
npx prisma db push          # prisma/dev.db 생성
npm run db:seed             # 관리자 계정 + 기본 키워드 (운영에서는 --demo 빼기)
npm run build
npm start                   # http://서버IP:3000
```

관리자로 로그인해 비밀번호를 바꾼 뒤 **관리 → 계정 관리**에서 정비인원 계정을 만듭니다.
임시 비밀번호는 만들 때 한 번만 표시되니 본인에게 직접 전달하세요.

> `npm start`는 `server.mjs`를 실행합니다. 일반 `next start`와 같지만, 접속자 IP를
> 위조해 도배 방지·로그인 제한을 피하지 못하도록 실제 접속 IP를 사용합니다.

## 3. 상시 실행

서버가 재부팅돼도 자동으로 켜지도록 등록합니다.

### Linux (systemd)

`/etc/systemd/system/maint-support.service`

```ini
[Unit]
Description=정비지원 웹사이트
After=network.target

[Service]
Type=simple
User=maint
WorkingDirectory=/opt/meosalkka
ExecStart=/usr/bin/node server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now maint-support
sudo systemctl status maint-support      # 상태 확인
journalctl -u maint-support -f           # 로그 보기
```

### Windows (작업 스케줄러, 추가 설치 없음)

1. `C:\meosalkka\start.bat` 파일을 만듭니다.
   ```bat
   cd /d C:\meosalkka
   node server.mjs >> logs.txt 2>&1
   ```
2. 작업 스케줄러 → **작업 만들기**
   - 일반: "사용자의 로그온 여부에 관계없이 실행", "가장 높은 수준의 권한으로 실행"
   - 트리거: **시작할 때**
   - 동작: 프로그램 시작 → `C:\meosalkka\start.bat`
   - 설정: "작업이 실패하면 다시 시작" 1분 간격
3. Windows 방화벽에서 TCP 3000 포트 인바운드 허용

## 4. HTTPS (선택)

내부망에서는 http로도 동작합니다. 다만 **브라우저 알림(다른 탭에서 받는 알림)은 HTTPS에서만**
동작하고, 로그인 정보 보호를 위해 가능하면 HTTPS를 권장합니다.

nginx 예시 (인증서는 부대 내부 인증서 사용):

```nginx
server {
    listen 443 ssl;
    server_name maint.example.mil;
    ssl_certificate     /etc/nginx/certs/maint.crt;
    ssl_certificate_key /etc/nginx/certs/maint.key;
    client_max_body_size 25m;                       # 사진 업로드

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;   # 덮어쓰기 (추가 X)
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

`.env`에 추가하고 재시작:

```ini
HOST="127.0.0.1"        # 외부에서 3000 포트로 직접 접속 못 하게
TRUST_PROXY="true"
COOKIE_SECURE="true"
```

## 5. 백업과 복구

```bash
npm run backup                  # backups/날짜_시각/ 에 app.db + uploads/ 저장 (최근 14개 보관)
npm run backup -- /mnt/usb/백업  # 다른 위치에 저장
```

서버가 켜져 있어도 안전하게 백업됩니다. 매일 자동으로 돌리려면:

- Linux: `crontab -e` → `30 2 * * * cd /opt/meosalkka && /usr/bin/npm run backup >> backup.log 2>&1`
- Windows: 작업 스케줄러에서 매일 02:30, `cmd /c "cd /d C:\meosalkka && npm run backup"`

백업 폴더는 **다른 디스크나 외부 매체에도 복사**해 두세요.

**복구**

1. 서버 중지
2. 백업의 `app.db` → `prisma/dev.db`로 복사 (기존 파일 덮어쓰기)
3. 백업의 `uploads/` → 프로젝트의 `uploads/`로 복사
4. 서버 시작

## 6. 업데이트

```bash
npm run backup              # 먼저 백업
git pull
npm ci
npx prisma db push          # DB 구조 변경 반영 (데이터 유지)
npm run build
# 서버 재시작 (systemctl restart maint-support 또는 작업 다시 실행)
```

## 7. 폐쇄망으로 이전

인터넷이 되는 PC에서 실행 가능한 상태로 만든 뒤 폴더째 옮깁니다.

**중요: 준비 PC와 폐쇄망 서버의 OS 종류가 같아야 합니다** (Linux↔Linux, Windows↔Windows).
DB 엔진 파일이 OS별로 다르기 때문입니다. Node.js 버전도 맞추세요.

### 인터넷 PC에서

```bash
git clone https://github.com/jbjg0812/meosalkka.git
cd meosalkka
git checkout claude/maintenance-support-website-1nly32
npm ci
npm run build
```

옮길 것:

| 항목 | 비고 |
|---|---|
| `meosalkka` 폴더 전체 | `node_modules/`, `.next/` 포함 (약 1GB). `.env`, `prisma/dev.db`, `uploads/`, `backups/`는 제외 |
| Node.js 설치 파일 | 서버 OS용 (예: `node-v22.x-x64.msi`, `node-v22.x-linux-x64.tar.xz`) |
| (시범 운영 데이터를 이어 쓸 경우) | 시범 서버에서 `npm run backup` 한 폴더 |

### 폐쇄망 서버에서

1. Node.js 설치
2. 폴더 복사 후 `.env` 작성 ([2. 설치](#2-설치-인터넷-환경-시범-운영)와 동일, `APP_SECRET`은 새로 생성)
3. DB 준비 — 둘 중 하나
   - 새로 시작: `npx prisma db push` → `npm run db:seed`
   - 시범 운영 데이터 이어 쓰기: 백업의 `app.db` → `prisma/dev.db`, `uploads/` → `uploads/` 복사 후 `npx prisma db push`
4. `npm start`로 확인 후 [3. 상시 실행](#3-상시-실행) 등록

설치 후에는 인터넷 연결이 전혀 필요 없습니다. (`npx prisma db push`도 네트워크 없이 동작하는 것을 확인함)

## 8. 운영 전 체크리스트

- [ ] `.env`의 `ADMIN_PASSWORD`, `APP_SECRET`을 바꿨다
- [ ] `npm run db:seed`를 `--demo` 없이 실행했다 (테스트 계정 fire1 등이 있다면 계정 관리에서 비활성화)
- [ ] 관리자 첫 로그인 후 비밀번호를 바꿨다
- [ ] 정비인원 계정을 만들고 담당 분야를 지정했다
- [ ] 키워드 사전을 부대 실제 장비명에 맞게 보완했다 (관리 → 키워드 사전 → 분류 테스트로 확인)
- [ ] 상시 실행 등록 후 서버 재부팅 시 자동으로 켜지는지 확인했다
- [ ] 매일 자동 백업을 등록하고, 복구를 한 번 연습했다
- [ ] 방화벽에서 필요한 포트만 열었다
