"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { fetchNarrative, type Narrative } from "./api";

/** On-demand AI explanation of an incident. Lazy-loads per incident; shows a
 *  source badge (LLM provider vs deterministic fallback). */
// Reset per incident via `key` at the call site (below), so the effect never
// needs a synchronous setState to clear stale state.
export function AiNarrative({ incidentId }: { incidentId: string }) {
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNarrative(incidentId)
      .then((n) => !cancelled && setNarrative(n))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-accent" aria-hidden />
        <span className="text-sm font-medium text-text">AI explanation</span>
        {narrative && (
          <span className="ml-auto rounded-full bg-raised px-2 py-0.5 text-[10px] text-faint">
            {narrative.source === "llm"
              ? `LLM · ${narrative.provider ?? "provider"}`
              : "deterministic"}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Generating explanation…
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted">
          {narrative?.text ?? "Explanation unavailable."}
        </p>
      )}
    </div>
  );
}
