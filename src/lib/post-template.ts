import "server-only";
import { CATEGORY_LABEL, type Category } from "./constants";
import { prisma } from "./db";
import { formatDateTime } from "./format";

function duration(days: number) {
  const hours = days * 24;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}분`;
  if (days < 1) return `${Math.round(hours)}시간`;
  return `${days.toFixed(1)}일`;
}

/** 완료된 신청 건으로 정비 사례 글 초안 만들기 (신청자 개인정보는 넣지 않음) */
export async function draftFromRequest(requestId: number) {
  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      actions: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      assignee: { select: { name: true } },
    },
  });
  if (!req || req.status !== "DONE") return null;

  const days = req.completedAt ? Math.max(0, (req.completedAt.getTime() - req.createdAt.getTime()) / 86_400_000) : null;
  const firstLine = req.symptom.split("\n")[0].slice(0, 40);
  const lines = [
    `■ 장비: ${req.equipmentName}`,
    `■ 분야: ${CATEGORY_LABEL[req.category as Category] ?? req.category}`,
    `■ 접수번호: ${req.receiptNo}`,
    `■ 처리기간: ${formatDateTime(req.createdAt)} ~ ${req.completedAt ? formatDateTime(req.completedAt) : "-"}${days !== null ? ` (${duration(days)})` : ""}`,
    req.assignee ? `■ 담당: ${req.assignee.name}` : "",
    "",
    "■ 증상",
    req.symptom,
    "",
    "■ 조치내용",
    ...(req.actions.length ? req.actions.map((a) => `- ${a.content} (${a.author.name}, ${formatDateTime(a.createdAt).slice(0, 10)})`) : ["- "]),
    "",
    "■ 원인 / 노하우",
    "- ",
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === "") && l !== undefined);

  return {
    title: `[정비사례] ${req.equipmentName} - ${firstLine}`.slice(0, 100),
    content: lines.join("\n"),
    fieldTag: req.category === "UNCLASSIFIED" ? "" : req.category,
    sourceRequestId: req.id,
  };
}
