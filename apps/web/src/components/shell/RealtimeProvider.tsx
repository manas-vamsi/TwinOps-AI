"use client";

import { useTwinSocket } from "@/features/twin/useTwinSocket";

/** Owns the single app-wide twin WebSocket (§9 "one WS connection").
 *  Mounted once in the shell layout so every page reads live twin state. */
export function RealtimeProvider() {
  useTwinSocket();
  return null;
}
