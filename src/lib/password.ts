import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// 8자 이상, 영문·숫자·특수문자 중 3종류 이상
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (pw.length > 72) return "비밀번호는 72자 이하여야 합니다.";
  const kinds = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length;
  if (kinds < 3) return "영문, 숫자, 특수문자를 모두 포함해야 합니다.";
  return null;
}
