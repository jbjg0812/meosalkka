import { requireStaff } from "@/lib/auth";
import { draftFromRequest } from "@/lib/post-template";
import PostForm from "../PostForm";

export const metadata = { title: "글쓰기" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireStaff();
  const from = Number((await searchParams).from);
  const draft = Number.isInteger(from) && from > 0 ? await draftFromRequest(from) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-3 text-lg font-bold">{draft ? "정비 사례 작성" : "글쓰기"}</h1>
      <div className="card p-4">
        <PostForm
          initial={
            draft
              ? { ...draft, sourceLabel: draft.title.replace("[정비사례] ", "") }
              : { title: "", content: "", fieldTag: "" }
          }
        />
      </div>
    </div>
  );
}
