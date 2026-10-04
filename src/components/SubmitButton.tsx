"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingText = "처리 중…",
  className = "btn-primary w-full",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
