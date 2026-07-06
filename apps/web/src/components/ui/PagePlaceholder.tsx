import type { NavItem } from "@/components/shell/navigation";

const PHASE_LABEL: Record<NavItem["phase"], string> = {
  P1: "Arrives in Phase 1 — Twin + Simulation",
  P2: "Arrives in Phase 2 — Incidents + Root Cause",
  P3: "Arrives in Phase 3 — Knowledge + Search",
  P4: "Arrives in Phase 4 — Breadth",
  P5: "Arrives in Phase 5 — Ship",
};

/**
 * Designed placeholder for surfaces whose phase hasn't landed yet.
 * Honest by design: names the phase instead of faking data.
 */
export function PagePlaceholder({ item }: { item: NavItem }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-8">
      <div className="w-full max-w-xl rounded-2xl border border-dashed border-hairline bg-surface/50 p-10 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl border border-hairline bg-raised">
          <item.icon className="size-6 text-accent" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {item.label}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          {item.description}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
          <span aria-hidden className="size-1 rounded-full bg-accent" />
          {PHASE_LABEL[item.phase]}
        </span>
      </div>
    </div>
  );
}
