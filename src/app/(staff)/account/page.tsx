import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { IconLogout } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { CATEGORY_LABEL, ROLE_LABEL } from "@/lib/constants";

export const metadata = { title: "내 정보" };

export default async function AccountPage() {
  const user = await requireStaff();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-lg font-bold">내 정보</h1>
      <dl className="card divide-y divide-stone-100 text-sm">
        {[
          ["이름", user.name],
          ["아이디", user.username],
          ["권한", ROLE_LABEL[user.role]],
          ["담당 분야", user.field ? CATEGORY_LABEL[user.field] : "전체"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-3">
            <dt className="text-stone-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href="/account/password" className="btn-outline w-full">비밀번호 변경</Link>
      <form action={logoutAction}>
        <button className="btn-outline w-full text-red-600">
          <IconLogout className="size-5" /> 로그아웃
        </button>
      </form>
    </div>
  );
}
