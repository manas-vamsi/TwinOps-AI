"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useUiStore } from "@/stores/uiStore";
import { NAV_ITEMS } from "./navigation";

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const toggle = useUiStore((s) => s.togglePalette);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl shadow-black/50"
    >
      <Command.Input
        placeholder="Where to? Type a page name…"
        className="h-12 w-full border-b border-hairline bg-transparent px-4 text-sm text-text outline-none placeholder:text-faint"
      />
      <Command.List className="max-h-72 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-faint">
          No matches.
        </Command.Empty>
        <Command.Group
          heading="Navigate"
          className="text-[10px] uppercase tracking-[0.15em] text-faint [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
        >
          {NAV_ITEMS.map((item) => (
            <Command.Item
              key={item.href}
              value={item.label}
              onSelect={() => {
                setOpen(false);
                router.push(item.href);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted data-[selected=true]:bg-raised data-[selected=true]:text-text"
            >
              <item.icon className="size-4 text-faint" aria-hidden />
              {item.label}
              <span className="ml-auto text-[10px] text-faint">
                {item.phase}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
