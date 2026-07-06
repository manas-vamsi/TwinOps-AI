import { CheckCircle2, Lightbulb, Search } from "lucide-react";
import type { RootCause } from "./types";

/** The explainable-AI verdict: root cause + evidence-weighted confidence +
 *  recommended actions. Confidence is computed, not hallucinated (§0.3). */
export function RootCauseCard({ rca }: { rca: RootCause }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <Search className="size-4 text-accent" aria-hidden />
          Root-Cause Analysis
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-faint">confidence</span>
          <span className="font-mono text-lg font-semibold text-accent">
            {rca.confidence}%
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text">
        <span className="font-semibold">{rca.label}</span> — {rca.summary}
      </p>

      {/* confidence bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-accent" style={{ width: `${rca.confidence}%` }} />
      </div>

      {/* evidence */}
      <div className="mt-5">
        <div className="mb-2 text-xs uppercase tracking-wide text-faint">Evidence</div>
        <ul className="space-y-1.5">
          {rca.evidence.map((e, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-muted">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </div>

      {/* recommended actions */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-faint">
          <Lightbulb className="size-3.5" aria-hidden />
          Recommended actions
        </div>
        <ul className="space-y-1.5">
          {rca.recommended_actions.map((a, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-text">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-hairline pt-3 text-xs text-muted">
        <span>Estimated recovery</span>
        <span className="font-mono text-text">{rca.estimated_recovery}</span>
      </div>
    </div>
  );
}
