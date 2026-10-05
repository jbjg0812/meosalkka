import { requireAdmin } from "@/lib/auth";
import type { Field, Role } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import CreateUserForm from "./CreateUserForm";
import UserRow from "./UserRow";

export const metadata = { title: "계정 관리" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { field: "asc" }, { name: "asc" }],
  });
  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-3">
      <CreateUserForm />
      <p className="text-sm text-stone-600">
        활성 {activeCount}명 / 전체 {users.length}명 · 계정은 삭제 대신 비활성화합니다 (처리 이력 보존).
      </p>
      <ul className="card divide-y divide-stone-100 overflow-hidden">
        {users.map((u) => (
          <UserRow
            key={u.id}
            u={{
              id: u.id,
              username: u.username,
              name: u.name,
              role: u.role as Role,
              field: (u.field as Field | null) ?? null,
              active: u.active,
              mustChangePw: u.mustChangePw,
              lastLogin: u.lastLoginAt ? formatDateTime(u.lastLoginAt) : null,
              isMe: u.id === me.id,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
