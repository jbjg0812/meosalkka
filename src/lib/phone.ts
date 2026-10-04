/** 숫자만 남긴다 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/** 휴대폰(010…)·일반전화(02…, 0xx…) 형식 확인 */
export function isValidPhone(digits: string): boolean {
  return /^0\d{8,10}$/.test(digits);
}

export function formatPhone(d: string): string {
  if (/^02\d{7,8}$/.test(d)) return d.replace(/^(02)(\d{3,4})(\d{4})$/, "$1-$2-$3");
  if (/^0\d{9,10}$/.test(d)) return d.replace(/^(0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");
  return d;
}
