type BadgeTone = "success" | "warning" | "error" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border border-amber-200 bg-amber-50 text-amber-700",
  error: "border border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border border-slate-200 bg-slate-100 text-slate-700"
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
