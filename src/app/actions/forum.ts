"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStaffOrNull, type SessionUser } from "@/lib/auth";
import { FIELDS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { readImages, removeUpload, saveImage } from "@/lib/uploads";

export type PostFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;
export type ActionResult = { ok: boolean; message: string };

async function staff(): Promise<SessionUser> {
  const u = await getStaffOrNull();
  if (!u) throw new Error("로그인이 필요합니다.");
  return u;
}

const postSchema = z.object({
  title: z.string().trim().min(2, "제목을 2자 이상 입력하세요.").max(100, "제목은 100자 이하로 입력하세요."),
  content: z.string().trim().min(5, "내용을 5자 이상 입력하세요.").max(10000, "내용은 10000자 이하로 입력하세요."),
  fieldTag: z.union([z.enum(FIELDS), z.literal("")]),
});

function parsePost(formData: FormData) {
  const r = postSchema.safeParse({
    title: formData.get("title") ?? "",
    content: formData.get("content") ?? "",
    fieldTag: formData.get("fieldTag") ?? "",
  });
  if (r.success) return { data: r.data } as const;
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { error: { error: "입력 내용을 확인해주세요.", fieldErrors } } as const;
}

export async function createPostAction(_: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await getStaffOrNull();
  if (!user) redirect("/login");

  const parsed = parsePost(formData);
  if ("error" in parsed) return parsed.error;
  const imgs = await readImages(formData.getAll("photos") as File[]);
  if ("error" in imgs) return { error: imgs.error, fieldErrors: { photos: imgs.error } };

  // 완료된 신청 건에서 가져온 글이면 연결
  let sourceRequestId: number | null = null;
  const src = Number(formData.get("sourceRequestId"));
  if (Number.isInteger(src) && src > 0) {
    const req = await prisma.request.findUnique({ where: { id: src }, select: { status: true } });
    if (req?.status === "DONE") sourceRequestId = src;
  }

  const images = [];
  for (const img of imgs.images) images.push({ path: await saveImage("posts", img), mime: img.mime, size: img.buf.length });

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      fieldTag: parsed.data.fieldTag || null,
      sourceRequestId,
      images: { create: images },
    },
  });
  revalidatePath("/forum");
  redirect(`/forum/${post.id}`);
}

export async function updatePostAction(_: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await getStaffOrNull();
  if (!user) redirect("/login");
  const id = Number(formData.get("postId"));
  const post = Number.isInteger(id) ? await prisma.post.findUnique({ where: { id } }) : null;
  if (!post) return { error: "글을 찾을 수 없습니다." };
  if (post.authorId !== user.id) return { error: "본인이 쓴 글만 수정할 수 있습니다." };

  const parsed = parsePost(formData);
  if ("error" in parsed) return parsed.error;
  await prisma.post.update({
    where: { id },
    data: { title: parsed.data.title, content: parsed.data.content, fieldTag: parsed.data.fieldTag || null },
  });
  revalidatePath("/forum");
  redirect(`/forum/${id}`);
}

export async function deletePostAction(postId: number): Promise<ActionResult> {
  try {
    const user = await staff();
    const post = await prisma.post.findUnique({ where: { id: z.number().int().positive().parse(postId) }, include: { images: true } });
    if (!post) return { ok: false, message: "글을 찾을 수 없습니다." };
    if (post.authorId !== user.id && user.role !== "ADMIN") return { ok: false, message: "본인 글 또는 관리자만 삭제할 수 있습니다." };
    await prisma.post.delete({ where: { id: post.id } });
    await Promise.all(post.images.map((i) => removeUpload(i.path)));
    revalidatePath("/forum");
    return { ok: true, message: "삭제했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

const commentSchema = z.object({
  postId: z.number().int().positive(),
  content: z.string().trim().min(1, "댓글을 입력하세요.").max(1000, "댓글은 1000자 이하로 입력하세요."),
});

export async function addCommentAction(input: z.input<typeof commentSchema>): Promise<ActionResult> {
  try {
    const user = await staff();
    const { postId, content } = commentSchema.parse(input);
    if (!(await prisma.post.findUnique({ where: { id: postId }, select: { id: true } }))) return { ok: false, message: "글을 찾을 수 없습니다." };
    await prisma.comment.create({ data: { postId, content, authorId: user.id } });
    revalidatePath(`/forum/${postId}`);
    return { ok: true, message: "댓글을 등록했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteCommentAction(commentId: number): Promise<ActionResult> {
  try {
    const user = await staff();
    const c = await prisma.comment.findUnique({ where: { id: z.number().int().positive().parse(commentId) } });
    if (!c) return { ok: false, message: "댓글을 찾을 수 없습니다." };
    if (c.authorId !== user.id && user.role !== "ADMIN") return { ok: false, message: "본인 댓글 또는 관리자만 삭제할 수 있습니다." };
    await prisma.comment.delete({ where: { id: c.id } });
    revalidatePath(`/forum/${c.postId}`);
    return { ok: true, message: "삭제했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}
