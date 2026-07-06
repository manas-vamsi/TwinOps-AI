/** Bottom-left health legend — consistent color meaning across the app. */
const ITEMS = [
  { dot: "bg-success", label: "Healthy" },
  { dot: "bg-warn", label: "Degraded" },
  { dot: "bg-critical", label: "Critical" },
] as const;

export function HealthLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-xl border border-hairline bg-chrome/80 px-3 py-2 backdrop-blur">
      {ITEMS.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className={`size-1.5 rounded-full ${i.dot}`} aria-hidden />
          {i.label}
        </span>
      ))}
    </div>
  );
}
