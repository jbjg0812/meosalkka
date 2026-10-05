import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PostForm from "../../PostForm";

export const metadata = { title: "글 수정" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const id = Number((await params).id);
  const post = Number.isInteger(id) && id > 0 ? await prisma.post.findUnique({ where: { id } }) : null;
  if (!post) notFound();
  if (post.authorId !== user.id) redirect(`/forum/${id}`);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-3 text-lg font-bold">글 수정</h1>
      <div className="card p-4">
        <PostForm postId={post.id} initial={{ title: post.title, content: post.content, fieldTag: post.fieldTag ?? "" }} />
      </div>
    </div>
  );
}
