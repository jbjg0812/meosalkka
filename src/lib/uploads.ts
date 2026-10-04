import "server-only";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 3;

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

/** 확장자가 아니라 파일 앞부분(매직 바이트)으로 실제 이미지 형식을 판별 */
export function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}

/** 업로드 파일 목록 검증. 문제가 있으면 오류 메시지 반환 */
export async function readImages(files: File[]): Promise<{ error: string } | { images: { buf: Buffer; mime: string; ext: string }[] }> {
  const real = files.filter((f) => f && typeof f === "object" && f.size > 0);
  if (real.length > MAX_IMAGES) return { error: `사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.` };
  const images = [];
  for (const f of real) {
    if (f.size > MAX_IMAGE_BYTES) return { error: "사진 한 장의 크기는 5MB 이하여야 합니다." };
    const buf = Buffer.from(await f.arrayBuffer());
    const t = detectImageType(buf);
    if (!t) return { error: "사진은 JPG, PNG, WEBP 형식만 첨부할 수 있습니다." };
    images.push({ buf, ...t });
  }
  return { images };
}

/** uploads/<dir>/yyyy/mm/<uuid>.<ext> 로 저장하고 상대경로 반환 */
export async function saveImage(dir: "requests" | "posts", img: { buf: Buffer; ext: string }): Promise<string> {
  const now = new Date();
  const rel = path.posix.join(
    dir,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${img.ext}`,
  );
  const abs = path.join(uploadRoot(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, img.buf, { flag: "wx" });
  return rel;
}

/** 상대경로를 업로드 폴더 내부의 절대경로로 변환. 폴더 밖을 가리키면 null */
export function resolveUpload(rel: string): string | null {
  const root = uploadRoot();
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) return null;
  return abs;
}

/** 업로드 파일 삭제 (실패해도 무시) */
export async function removeUpload(rel: string) {
  const abs = resolveUpload(rel);
  if (abs) await unlink(abs).catch(() => {});
}
