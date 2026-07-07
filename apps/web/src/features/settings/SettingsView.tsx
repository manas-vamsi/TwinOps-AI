"use client";

import { useEffect, useState } from "react";
import { Check, CircleSlash, Cpu, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

interface Provider {
  id: string;
  label: string;
  kind: string;
  configured: boolean;
}
interface SystemConfig {
  sim_seed: number;
  workspace: string;
  providers: Provider[];
  llm_tokens_used: Record<string, number>;
  llm_cache: { hits: number; misses: number; size: number; hit_rate_pct: number };
}

export function SettingsView() {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-muted">Workspace, AI providers, and simulation</p>
      </div>

      <Section title="Workspace">
        <Row label="Active workspace" value={config?.workspace ?? "—"} />
        <Row label="Theme" value="Light default · dark toggle in the top bar" />
      </Section>

      <Section title="AI Providers">
        <p className="mb-3 text-xs text-muted">
          The platform runs on any one configured provider. Ollama works locally
          with no API key; cloud providers activate when their key is set.
        </p>
        <div className="space-y-2">
          {(config?.providers ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-raised px-3 py-2.5"
            >
              {p.kind === "local" ? (
                <Cpu className="size-4 text-faint" aria-hidden />
              ) : (
                <Cloud className="size-4 text-faint" aria-hidden />
              )}
              <span className="text-[13px] text-text">{p.label}</span>
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                  p.configured
                    ? "bg-success/10 text-success"
                    : "bg-raised text-faint",
                )}
              >
                {p.configured ? (
                  <>
                    <Check className="size-3" aria-hidden /> Configured
                  </>
                ) : (
                  <>
                    <CircleSlash className="size-3" aria-hidden /> Not configured
                  </>
                )}
              </span>
            </div>
          ))}
          {!config && <p className="text-sm text-faint">Loading…</p>}
        </div>
      </Section>

      <Section title="Simulation">
        <Row label="Seed" value={config ? `${config.sim_seed}` : "—"} mono />
        <p className="mt-1 text-xs text-faint">
          Deterministic: the same seed reproduces the same run, so demos and
          replays are identical.
        </p>
      </Section>

      <Section title="AI Usage">
        {config && Object.keys(config.llm_tokens_used).length > 0 ? (
          Object.entries(config.llm_tokens_used).map(([provider, tokens]) => (
            <Row key={provider} label={provider} value={`${tokens.toLocaleString()} tokens`} mono />
          ))
        ) : (
          <p className="text-xs text-faint">
            No LLM tokens spent yet. Usage is metered per provider once a key is
            configured and the AI features are used.
          </p>
        )}
        {config && (
          <Row
            label="Response cache"
            value={`${config.llm_cache.hit_rate_pct}% hit rate · ${config.llm_cache.size} entries`}
            mono
          />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="mb-3 text-xs uppercase tracking-wide text-faint">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn("text-text", mono && "font-mono")}>{value}</span>
    </div>
  );
}
