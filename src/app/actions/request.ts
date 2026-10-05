"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { classifyWithDb, matchedWordsJson } from "@/lib/classify-db";
import { kstDateKey } from "@/lib/format";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { hitRateLimit, isRateLimited } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { checkFormToken, sign } from "@/lib/sign";
import { readImages, saveImage } from "@/lib/uploads";
import { trackCookieName, trackCookieValue } from "@/lib/track";

export type RequestFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const MIN_FILL_MS = 3_000; // 폼을 연 뒤 3초 안에 제출하면 봇으로 간주
const MAX_FILL_MS = 6 * 60 * 60 * 1000;
const IP_LIMIT = 5; // IP당 10분에 5건
const IP_WINDOW = 10 * 60 * 1000;
const PHONE_LIMIT = 5; // 전화번호당 1시간에 5건
const PHONE_WINDOW = 60 * 60 * 1000;

const text = (label: string, max: number) =>
  z
    .string({ error: `${label}을(를) 입력하세요.` })
    .trim()
    .min(1, `${label}을(를) 입력하세요.`)
    .max(max, `${label}은(는) ${max}자 이하로 입력하세요.`);

const requestSchema = z.object({
  equipmentName: text("장비명", 100),
  symptom: z
    .string({ error: "증상을 입력하세요." })
    .trim()
    .min(5, "증상을 5자 이상 입력하세요.")
    .max(2000, "증상은 2000자 이하로 입력하세요."),
  unit: text("소속", 100),
  applicantName: text("이름", 30),
  phone: z
    .string({ error: "전화번호를 입력하세요." })
    .transform(normalizePhone)
    .refine(isValidPhone, "전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)"),
  urgency: z.enum(["URGENT", "NORMAL"], { error: "긴급도를 선택하세요." }),
});

export async function createRequestAction(_: RequestFormState, formData: FormData): Promise<RequestFormState> {
  // 1) 도배 방지: 숨김 필드(사람은 비워둠) + 폼 작성 시간
  if (String(formData.get("website") ?? "") !== "") {
    return { error: "신청을 처리할 수 없습니다." };
  }
  const tokenCheck = checkFormToken(String(formData.get("formToken") ?? ""), MIN_FILL_MS, MAX_FILL_MS);
  if (tokenCheck === "fast") return { error: "너무 빨리 제출되었습니다. 잠시 후 다시 눌러주세요." };
  if (tokenCheck === "invalid") return { error: "신청서가 만료되었습니다. 새로고침 후 다시 작성해주세요." };

  // 2) 입력값 검증
  const parsed = requestSchema.safeParse({
    equipmentName: formData.get("equipmentName"),
    symptom: formData.get("symptom"),
    unit: formData.get("unit"),
    applicantName: formData.get("applicantName"),
    phone: formData.get("phone") ?? "",
    urgency: formData.get("urgency"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { error: "입력 내용을 확인해주세요.", fieldErrors };
  }
  const data = parsed.data;

  const imgs = await readImages(formData.getAll("photos") as File[]);
  if ("error" in imgs) return { error: imgs.error, fieldErrors: { photos: imgs.error } };

  // 3) 횟수 제한 (IP, 전화번호)
  const ip = await getClientIp();
  const ipKey = `req:ip:${ip}`;
  const phoneKey = `req:phone:${data.phone}`;
  if ((await isRateLimited(ipKey, IP_LIMIT, IP_WINDOW)) || (await isRateLimited(phoneKey, PHONE_LIMIT, PHONE_WINDOW))) {
    return { error: "짧은 시간에 신청이 너무 많습니다. 잠시 후 다시 시도하거나 정비반에 전화로 문의하세요." };
  }
  await hitRateLimit(ipKey, IP_LIMIT, IP_WINDOW);
  await hitRateLimit(phoneKey, PHONE_LIMIT, PHONE_WINDOW);

  // 4) 사진 저장 후 신청 등록 (접수번호 충돌 시 재시도)
  const paths: { path: string; mime: string; size: number }[] = [];
  for (const img of imgs.images) {
    paths.push({ path: await saveImage("requests", img), mime: img.mime, size: img.buf.length });
  }

  const cls = await classifyWithDb(data.equipmentName, data.symptom);

  let receiptNo = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      receiptNo = await prisma.$transaction(async (tx) => {
        const prefix = kstDateKey() + "-";
        const last = await tx.request.findFirst({
          where: { receiptNo: { startsWith: prefix } },
          orderBy: { receiptNo: "desc" },
          select: { receiptNo: true },
        });
        const seq = last ? Number(last.receiptNo.slice(prefix.length)) + 1 : 1;
        const no = prefix + String(seq).padStart(4, "0");
        await tx.request.create({
          data: {
            receiptNo: no,
            ...data,
            category: cls.category,
            classifiedBy: "AUTO",
            matchedWords: matchedWordsJson(cls),
            photos: { create: paths },
            history: { create: { from: null, to: "RECEIVED", note: "신청 접수" } },
          },
        });
        return no;
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  if (!receiptNo) return { error: "접수 중 오류가 발생했습니다. 다시 시도해주세요." };

  // 신청한 기기에서는 바로 진행 상황을 볼 수 있도록 조회 쿠키 발급
  const jar = await cookies();
  jar.set(trackCookieName(receiptNo), trackCookieValue(receiptNo, data.phone), trackCookieOptions());

  redirect(`/request/done?no=${receiptNo}&s=${sign("done:" + receiptNo)}`);
}

function trackCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/track",
    maxAge: 30 * 24 * 60 * 60,
  };
}

export type TrackFormState = { error?: string; values?: { receiptNo: string } } | undefined;

const TRACK_FAIL_LIMIT = 10; // IP당 10분에 10회 실패
const TRACK_WINDOW = 10 * 60 * 1000;

export async function trackAction(_: TrackFormState, formData: FormData): Promise<TrackFormState> {
  const receiptNo = String(formData.get("receiptNo") ?? "")
    .trim()
    .replace(/\s/g, "");
  const last4 = String(formData.get("last4") ?? "").replace(/\D/g, "");
  const values = { receiptNo: receiptNo.slice(0, 20) };

  if (!/^\d{8}-\d{4}$/.test(receiptNo)) return { error: "접수번호 형식이 올바르지 않습니다. (예: 20261004-0001)", values };
  if (!/^\d{4}$/.test(last4)) return { error: "전화번호 뒷 4자리를 입력하세요.", values };

  const ip = await getClientIp();
  const failKey = `track:ip:${ip}`;
  if (await isRateLimited(failKey, TRACK_FAIL_LIMIT, TRACK_WINDOW)) {
    return { error: "조회 실패가 너무 많습니다. 10분 후 다시 시도하세요.", values };
  }

  const req = await prisma.request.findUnique({ where: { receiptNo }, select: { phone: true } });
  if (!req || !req.phone.endsWith(last4)) {
    await hitRateLimit(failKey, TRACK_FAIL_LIMIT, TRACK_WINDOW);
    return { error: "일치하는 신청 내역이 없습니다. 접수번호와 전화번호를 확인하세요.", values };
  }

  const jar = await cookies();
  jar.set(trackCookieName(receiptNo), trackCookieValue(receiptNo, req.phone), trackCookieOptions());
  redirect(`/track/${receiptNo}`);
}
