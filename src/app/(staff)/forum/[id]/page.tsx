import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { CATEGORY_LABEL, type Field } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { CommentForm, DeleteCommentButton, DeletePostButton } from "./PostClient";

export const metadata = { title: "게시글" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      images: true,
      sourceRequest: { select: { id: true, receiptNo: true, equipmentName: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!post) notFound();
  const mine = post.authorId === user.id;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link href="/forum" className="inline-flex items-center text-sm text-stone-500">
        <IconChevronLeft className="size-4" /> 정비인원 게시판
      </Link>
      <article className="card p-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="rounded bg-brand-100 px-1.5 py-0.5 font-semibold text-brand-800">{post.fieldTag ? CATEGORY_LABEL[post.fieldTag as Field] : "공통"}</span>
          {post.sourceRequest && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">정비사례</span>}
        </div>
        <h1 className="mt-2 text-xl font-bold">{post.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
          <span className="font-semibold text-stone-700">{post.author.name}</span>
          <span>{formatDateTime(post.createdAt)}</span>
          {post.updatedAt.getTime() - post.createdAt.getTime() > 1000 && <span>(수정됨)</span>}
          {(mine || user.role === "ADMIN") && (
            <span className="ml-auto flex gap-3">
              {mine && <Link href={`/forum/${post.id}/edit`} className="text-sm text-stone-600">수정</Link>}
              <DeletePostButton postId={post.id} />
            </span>
          )}
        </div>
        {post.sourceRequest && (
          <Link href={`/requests/${post.sourceRequest.id}`} className="mt-3 block rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 hover:bg-stone-100">
            원본 신청: <span className="font-mono">{post.sourceRequest.receiptNo}</span> {post.sourceRequest.equipmentName} →
          </Link>
        )}
        <div className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</div>
        {post.images.length > 0 && (
          <div className="mt-4 grid gap-2">
            {post.images.map((img, i) => (
              <a key={img.id} href={`/files/${img.path}`} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/files/${img.path}`} alt={`첨부 사진 ${i + 1}`} className="w-full rounded-lg" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </article>

      <section className="card p-4">
        <h2 className="mb-3 font-bold">댓글 {post.comments.length}</h2>
        <ul className="mb-3 space-y-3">
          {post.comments.map((c) => (
            <li key={c.id} className="border-b border-stone-100 pb-3 last:border-0">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-semibold text-stone-700">{c.author.name}</span>
                <span>{formatDateTime(c.createdAt)}</span>
                {(c.authorId === user.id || user.role === "ADMIN") && <span className="ml-auto"><DeleteCommentButton commentId={c.id} /></span>}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
        <CommentForm postId={post.id} />
      </section>
    </div>
  );
}
