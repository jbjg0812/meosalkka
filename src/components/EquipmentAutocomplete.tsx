"use client";

import { useId, useMemo, useRef, useState } from "react";
import { normalizeKeyword } from "@/lib/classify";
import { CATEGORY_LABEL, type Category } from "@/lib/constants";
import { toJamo } from "@/lib/hangul";

export type Suggestion = { word: string; category: string };

const MAX_ITEMS = 8;

/** 사전 키워드는 소문자로 저장되므로 화면에는 영문을 대문자로 보여준다 (k9 → K9) */
function display(word: string) {
  return word.replace(/[a-z]+/g, (m) => m.toUpperCase());
}

/**
 * 장비명 입력 + 키워드 사전 기반 자동완성.
 * 입력값으로 시작하는 키워드를 먼저, 두 글자 이상이면 단어 중간(글자 시작)에서 일치하는 키워드도 보여준다.
 * 한글은 자모 단위로 비교해 입력 중인 글자도 맞춘다 ("바" → 박격포, 발전기).
 * 여러 단어를 입력한 경우(예: "K9 자")에는 마지막 단어로도 찾아 그 단어만 바꾼다.
 */
export default function EquipmentAutocomplete({
  suggestions,
  name,
  id,
  placeholder,
  maxLength,
}: {
  suggestions: Suggestion[];
  name: string;
  id: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // 비교용 인덱스(정규화 + 자모 분해)는 한 번만 만든다
  const index = useMemo(
    () =>
      suggestions.map((s) => {
        const chars = [...s.word];
        // 글자 경계마다 시작하는 자모열 (중간 일치는 글자 시작에서만 허용)
        const tails = chars.slice(1).map((_, i) => toJamo(chars.slice(i + 1).join("")));
        return { ...s, label: display(s.word), jamo: toJamo(s.word), tails };
      }),
    [suggestions],
  );

  const { items, replaceLast } = useMemo(() => {
    const search = (q: string) => {
      const nq = normalizeKeyword(q);
      const jq = toJamo(nq);
      if (!jq) return [];
      const starts = index.filter((s) => s.jamo.startsWith(jq));
      // 두 글자 이상 입력했을 때만 단어 중간 일치도 보여준다 (예: "통신" → 전술정보통신)
      const contains =
        [...nq].length < 2 ? [] : index.filter((s) => !s.jamo.startsWith(jq) && s.tails.some((t) => t.startsWith(jq)));
      const byLen = (a: { word: string }, b: { word: string }) => a.word.length - b.word.length || a.word.localeCompare(b.word);
      return [...starts.sort(byLen), ...contains.sort(byLen)].slice(0, MAX_ITEMS);
    };
    const whole = search(value);
    if (whole.length) return { items: whole, replaceLast: false };
    const tokens = value.trim().split(/\s+/);
    if (tokens.length > 1) return { items: search(tokens[tokens.length - 1]), replaceLast: true };
    return { items: [], replaceLast: false };
  }, [value, index]);

  const showList = open && items.length > 0;

  function choose(i: number) {
    const s = items[i];
    if (!s) return;
    const next = replaceLast ? value.trim().split(/\s+/).slice(0, -1).concat(s.label).join(" ") : s.label;
    setValue(next);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중에는 방향키·엔터를 IME에 맡김
    if (!showList) {
      if (e.key === "ArrowDown" && items.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // 폼 제출 대신 항목 선택
      choose(active);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className="input"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {items.map((s, i) => (
            <li
              key={s.word}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown에서 선택해야 input blur로 목록이 먼저 닫히지 않음
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 ${i === active ? "bg-brand-50" : ""}`}
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-stone-400">{CATEGORY_LABEL[s.category as Category] ?? ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
