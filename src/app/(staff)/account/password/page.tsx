import { requireStaff } from "@/lib/auth";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "비밀번호 변경" };

export default async function PasswordPage() {
  const user = await requireStaff({ allowPwChange: true });
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-lg font-bold">비밀번호 변경</h1>
      {user.mustChangePw && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          보안을 위해 처음 로그인하면 비밀번호를 바꿔야 합니다.
        </p>
      )}
      <div className="card p-5">
        <PasswordForm />
      </div>
    </div>
  );
}
