// 브라우저에서 사진을 축소해 업로드 용량을 줄인다 (모바일 데이터·서버 저장공간 절약).
const MAX_SIDE = 1600;
const QUALITY = 0.85;

/** 축소한 파일을 반환. 이미지로 읽을 수 없으면 null */
export async function shrinkImage(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // 이미지가 아니거나 브라우저가 읽지 못하는 형식(HEIC 등)
    return null;
  }
}
