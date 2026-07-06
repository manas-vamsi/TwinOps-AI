"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifyStore } from "@/stores/notifyStore";

const DOT: Record<string, string> = {
  critical: "bg-critical",
  success: "bg-success",
  info: "bg-info",
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const items = useNotifyStore((s) => s.items);
  const markAllRead = useNotifyStore((s) => s.markAllRead);
  const unread = items.filter((i) => !i.read).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative flex size-9 items-center justify-center rounded-xl border border-hairline bg-surface text-muted transition-colors hover:text-text"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" aria-hidden />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-hairline bg-surface shadow-2xl shadow-black/20">
          <div className="border-b border-hairline px-4 py-2.5 text-xs uppercase tracking-wide text-faint">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-faint">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="flex gap-2.5 border-b border-hairline px-4 py-3 last:border-0">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", DOT[n.kind])} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-text">{n.title}</div>
                    {n.body && <div className="text-[11px] text-muted">{n.body}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
