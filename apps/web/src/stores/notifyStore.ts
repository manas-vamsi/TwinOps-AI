import { create } from "zustand";

/** Intelligent notifications (one of the five sanctioned stores —
 *  DEVELOPMENT_RULES §6). Fed by the incident lifecycle, not raw alerts. */
export type NotifyKind = "critical" | "success" | "info";

export interface Notification {
  id: string;
  kind: NotifyKind;
  title: string;
  body?: string;
  read: boolean;
}

interface NotifyState {
  items: Notification[];
  seq: number;
  add: (n: { kind: NotifyKind; title: string; body?: string }) => void;
  markAllRead: () => void;
}

export const useNotifyStore = create<NotifyState>((set) => ({
  items: [],
  seq: 0,
  add: (n) =>
    set((s) => ({
      seq: s.seq + 1,
      items: [{ ...n, id: `n${s.seq + 1}`, read: false }, ...s.items].slice(0, 50),
    })),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
}));
