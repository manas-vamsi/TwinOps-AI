"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-hairline bg-charcoal">
      {/* brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <div
          aria-hidden
          className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong font-display text-lg font-bold text-cream shadow-lg shadow-accent/20"
        >
          T
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold tracking-wide">
            TwinOps <span className="text-accent">AI</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint">
            Intelligent · Predictive
          </div>
        </div>
      </div>

      {/* navigation */}
      <nav aria-label="Primary" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-raised text-text"
                  : "text-muted hover:bg-surface hover:text-text",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                />
              )}
              <item.icon
                className={cn(
                  "size-[18px] transition-colors",
                  active ? "text-accent" : "text-faint group-hover:text-muted",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className="border-t border-hairline px-5 py-4">
        <div className="flex items-center justify-between text-[11px] text-faint">
          <span>v0.1.0 · Phase 0</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            shell online
          </span>
        </div>
      </div>
    </aside>
  );
}
