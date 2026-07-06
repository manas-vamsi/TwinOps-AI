"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

interface Doc {
  id: string;
  title: string;
  body: string;
}
interface Hit {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export function KnowledgeView() {
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [selected, setSelected] = useState<Doc | null>(null);
  const docParam = useSearchParams().get("doc");

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/knowledge/docs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Doc[]) => {
        setDocs(d);
        setSelected(d.find((x) => x.id === docParam) ?? d[0] ?? null);
      })
      .catch(() => setDocs([]));
  }, [docParam]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return; // empty query: derived list shows all docs (no setState here)
    const t = setTimeout(() => {
      fetch(`${API_BASE}/api/v1/knowledge/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setHits)
        .catch(() => setHits([]));
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const searching = query.trim().length > 0;
  const listItems = searching
    ? (hits ?? [])
    : docs.map((d) => ({ id: d.id, title: d.title, snippet: "", score: 0 }));

  return (
    <div className="flex h-full">
      {/* list + search */}
      <div className="flex w-80 shrink-0 flex-col border-r border-hairline">
        <div className="p-4">
          <h1 className="font-display text-lg font-semibold tracking-tight text-text">
            Knowledge Hub
          </h1>
          <div className="mt-3 flex h-9 items-center gap-2 rounded-xl border border-hairline bg-surface px-3">
            <Search className="size-4 text-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search runbooks…"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-faint"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {listItems.length === 0 && (
            <p className="px-3 py-4 text-sm text-faint">No matching runbooks.</p>
          )}
          {listItems.map((item) => {
            const doc = docs.find((d) => d.id === item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => doc && setSelected(doc)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selected?.id === item.id
                    ? "border-hairline bg-raised"
                    : "border-transparent hover:bg-surface",
                )}
              >
                <span className="text-[13px] font-medium text-text">{item.title}</span>
                {item.snippet && (
                  <span className="line-clamp-2 text-[11px] text-faint">{item.snippet}</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="border-t border-hairline px-4 py-2 text-[10px] text-faint">
          Keyword search today; semantic RAG with citations is the next layer.
        </p>
      </div>

      {/* doc viewer */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <article className="mx-auto max-w-2xl p-6">
            <Markdown body={selected.body} />
          </article>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <BookOpen className="size-6 text-faint" aria-hidden />
            <p className="text-sm">Select a runbook.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tiny markdown renderer — headings, bullets, paragraphs. ponytail: no md dep
 *  for a handful of runbooks; swap for a real renderer if content grows. */
function Markdown({ body }: { body: string }) {
  return (
    <div className="space-y-2">
      {body.split("\n").map((line, i) => {
        if (line.startsWith("## "))
          return (
            <h2 key={i} className="pt-3 font-display text-sm font-semibold uppercase tracking-wide text-accent">
              {line.slice(3)}
            </h2>
          );
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="font-display text-xl font-semibold text-text">
              {line.slice(2)}
            </h1>
          );
        if (/^\d+\.\s/.test(line) || line.startsWith("- "))
          return (
            <p key={i} className="pl-4 text-[13px] leading-relaxed text-muted">
              {line}
            </p>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-[13px] leading-relaxed text-muted">
            {line}
          </p>
        );
      })}
    </div>
  );
}
