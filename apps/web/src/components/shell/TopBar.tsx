"use client";

import { ChevronDown, Search } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./NotificationsBell";

export function TopBar() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-chrome/80 px-4 backdrop-blur">
      {/* search field: opens the command palette */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-xl border border-hairline bg-surface px-3 text-sm text-faint transition-colors hover:border-accent/40 hover:text-muted"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">
          Search infrastructure, incidents, knowledge…
        </span>
        <kbd className="rounded-md border border-hairline bg-raised px-1.5 py-0.5 font-sans text-[10px] text-muted">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* workspace selector */}
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-xl border border-hairline bg-surface px-3 text-xs text-muted transition-colors hover:text-text"
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-success"
          />
          demo-workspace
          <ChevronDown className="size-3.5 text-faint" aria-hidden />
        </button>

        {/* theme toggle */}
        <ThemeToggle />

        {/* notifications */}
        <NotificationsBell />

        {/* profile */}
        <div
          aria-label="Signed in as Manas"
          className="flex size-9 items-center justify-center rounded-xl bg-accent-soft font-display text-xs font-semibold text-accent"
        >
          M
        </div>
      </div>
    </header>
  );
}
