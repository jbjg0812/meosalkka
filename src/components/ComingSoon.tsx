export default function ComingSoon({ title, stage, children }: { title: string; stage: number; children?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{title}</h1>
      {children}
      <div className="card p-6 text-center text-sm text-stone-500">{stage}단계에서 구현됩니다.</div>
    </div>
  );
}
