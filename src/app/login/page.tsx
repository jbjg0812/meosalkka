import Link from "next/link";
import { redirect } from "next/navigation";
import { IconWrench } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "정비인원 로그인" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePw ? "/account/password" : user.role === "ADMIN" ? "/admin" : "/board");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-700 text-white">
          <IconWrench className="size-7" />
        </div>
        <h1 className="text-xl font-bold">정비인원 로그인</h1>
        <p className="mt-1 text-sm text-stone-500">정비부대 소속 인원 전용입니다.</p>
      </div>
      <div className="card p-5">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        정비 신청은 로그인 없이 할 수 있습니다.{" "}
        <Link href="/" className="font-semibold text-brand-700 underline">처음으로</Link>
      </p>
    </main>
  );
}
