import Link from "next/link";
import { IconChevronLeft } from "./icons";

export default function PublicHeader({ title, back = "/" }: { title: string; back?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-2">
        <Link href={back} className="flex size-10 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100" aria-label="뒤로">
          <IconChevronLeft />
        </Link>
        <h1 className="text-base font-bold">{title}</h1>
      </div>
    </header>
  );
}
