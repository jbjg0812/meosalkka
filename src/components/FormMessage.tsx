export default function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role="alert"
      className={`rounded-lg px-3 py-2 text-sm ${
        state.error ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"
      }`}
    >
      {state.error ?? state.ok}
    </p>
  );
}
