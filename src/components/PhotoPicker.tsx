"use client";

import { useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/client-image";
import { IconCamera } from "./icons";

export type PickedPhoto = { file: File; url: string };

/** 사진 선택(카메라 촬영 포함) + 미리보기 + 삭제. 선택 즉시 축소한다. */
export default function PhotoPicker({
  photos,
  onChange,
  max = 3,
  error,
}: {
  photos: PickedPhoto[];
  onChange: (p: PickedPhoto[]) => void;
  max?: number;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setMsg(null);
    const room = max - photos.length;
    const picked = Array.from(list).slice(0, room);
    if (list.length > room) setMsg(`사진은 최대 ${max}장까지 첨부할 수 있습니다.`);
    setBusy(true);
    const out: PickedPhoto[] = [];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) continue;
      const small = await shrinkImage(f);
      if (!small) {
        setMsg("읽을 수 없는 사진은 제외했습니다. JPG·PNG 사진을 선택하세요.");
        continue;
      }
      if (small.size > 5 * 1024 * 1024) {
        setMsg("5MB가 넘는 사진은 제외했습니다.");
        continue;
      }
      out.push({ file: small, url: URL.createObjectURL(small) });
    }
    setBusy(false);
    onChange([...photos, ...out]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(i: number) {
    URL.revokeObjectURL(photos[i].url);
    onChange(photos.filter((_, j) => j !== i));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.url} className="relative size-20 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`첨부 사진 ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              aria-label={`사진 ${i + 1} 삭제`}
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 hover:border-brand-500 hover:text-brand-700"
          >
            <IconCamera className="size-6" />
            {busy ? "처리 중…" : `${photos.length}/${max}`}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {(msg || error) && <p className="mt-1 text-xs text-red-600">{error ?? msg}</p>}
    </div>
  );
}
