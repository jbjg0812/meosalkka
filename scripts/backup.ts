/**
 * DB + 업로드 사진 백업
 *   npm run backup                 → backups/2026-10-05_1430/ 에 저장
 *   npm run backup -- D:\백업      → 지정 폴더에 저장
 * 서버 실행 중에도 안전하게 동작한다 (SQLite VACUUM INTO 사용).
 */
import { PrismaClient } from "@prisma/client";
import { cp, mkdir, readdir, rm, stat } from "fs/promises";
import path from "path";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 기본값
}

const KEEP = Number(process.env.BACKUP_KEEP || 14); // 기본 폴더 사용 시 최근 N개만 보관

async function main() {
  const arg = process.argv[2];
  const root = path.resolve(arg || "backups");
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const name = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
  const dest = path.join(root, name);
  await mkdir(dest, { recursive: true });

  const prisma = new PrismaClient();
  const dbFile = path.join(dest, "app.db").replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${dbFile}'`);
  await prisma.$disconnect();

  const uploads = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  const hasUploads = await stat(uploads).then(() => true, () => false);
  if (hasUploads) await cp(uploads, path.join(dest, "uploads"), { recursive: true });

  console.log(`백업 완료: ${dest}`);
  console.log(`  - app.db (DB)${hasUploads ? "\n  - uploads/ (사진)" : ""}`);

  // 기본 백업 폴더는 오래된 것부터 정리
  if (!arg) {
    const dirs = (await readdir(root)).filter((d) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(d)).sort();
    for (const old of dirs.slice(0, Math.max(0, dirs.length - KEEP))) {
      await rm(path.join(root, old), { recursive: true, force: true });
      console.log(`  오래된 백업 삭제: ${old}`);
    }
  }
}

main().catch((e) => {
  console.error("백업 실패:", e);
  process.exit(1);
});
