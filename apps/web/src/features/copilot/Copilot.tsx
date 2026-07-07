"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTwinStore } from "@/stores/twinStore";
import { answer, SUGGESTIONS, type CopilotAnswer } from "./intents";

interface Msg {
  role: "user" | "assistant";
  text: string;
  action?: CopilotAnswer["action"];
}

/** Floating infrastructure copilot. Deterministic today (see intents.ts);
 *  answers from live twin state and can navigate the app. */
export function Copilot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Ask me about your infrastructure — what's failing, why, or what to do." },
  ]);

  async function ask(q: string) {
    const query = q.trim();
    if (!query) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: query }]);

    // primary: server copilot (LLM, grounded). fallback: local deterministic.
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
      const res = await fetch(`${base}/api/v1/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      if (!res.ok) throw new Error("chat failed");
      const data = (await res.json()) as {
        text: string;
        action?: CopilotAnswer["action"] | null;
      };
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: data.text, action: data.action ?? undefined },
      ]);
    } catch {
      const { runtime, incidents } = useTwinStore.getState();
      const a = answer(query, runtime, incidents);
      setMsgs((m) => [...m, { role: "assistant", text: a.text, action: a.action }]);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open copilot"
          className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-2xl bg-accent text-cream shadow-lg shadow-accent/30 transition-colors hover:bg-accent-strong"
        >
          <Sparkles className="size-5" aria-hidden />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[30rem] w-80 flex-col overflow-hidden rounded-2xl border border-hairline bg-chrome shadow-2xl shadow-black/30">
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
            <Bot className="size-4 text-accent" aria-hidden />
            <span className="text-[13px] font-medium text-text">Infrastructure Copilot</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close copilot"
              className="ml-auto flex size-6 items-center justify-center rounded-lg text-faint hover:bg-raised hover:text-text"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-[13px]",
                    m.role === "user" ? "bg-accent text-cream" : "bg-surface text-text",
                  )}
                >
                  {m.text}
                  {m.action && (
                    <button
                      type="button"
                      onClick={() => {
                        router.push(m.action!.href);
                        setOpen(false);
                      }}
                      className="mt-2 block w-full rounded-lg border border-hairline bg-raised px-2 py-1 text-center text-xs text-accent transition-colors hover:border-accent/40"
                    >
                      {m.action.label} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {msgs.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-lg border border-hairline bg-surface px-2 py-1 text-[11px] text-muted transition-colors hover:text-text"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-hairline p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the copilot…"
              className="h-9 flex-1 rounded-xl border border-hairline bg-surface px-3 text-sm text-text outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              aria-label="Send"
              className="flex size-9 items-center justify-center rounded-xl bg-accent text-cream transition-colors hover:bg-accent-strong"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
