import { readFile } from "fs/promises";
import { getStaffOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveUpload } from "@/lib/uploads";

// 업로드 사진 제공: 정비인원/관리자만 접근 가능, DB에 등록된 파일만 제공
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getStaffOrNull();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rel = (await params).path.join("/");
  const row =
    (await prisma.requestPhoto.findFirst({ where: { path: rel }, select: { mime: true } })) ??
    (await prisma.postImage.findFirst({ where: { path: rel }, select: { mime: true } }));
  const abs = row && resolveUpload(rel);
  if (!row || !abs) return new Response("Not Found", { status: 404 });

  try {
    const buf = await readFile(abs);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": row.mime,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
