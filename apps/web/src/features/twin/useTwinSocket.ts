"use client";

import { useEffect } from "react";
import { useTwinStore } from "@/stores/twinStore";
import { wsUrl } from "./api";
import type { DeltaPayload, SnapshotPayload } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

interface WsMessage {
  topic: string;
  seq: number;
  type: "snapshot" | "delta";
  payload: SnapshotPayload | DeltaPayload;
}

/** Owns the single twin WebSocket: snapshot on connect, sequenced deltas,
 *  seq-gap => REST re-snapshot, reconnect with backoff (§9). */
export function useTwinSocket() {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;

    async function resnapshot() {
      const res = await fetch(`${API_BASE}/api/v1/twin/graph`, {
        credentials: "include",
      });
      if (res.ok) {
        const store = useTwinStore.getState();
        store.applySnapshot((await res.json()) as SnapshotPayload, store.lastSeq);
      }
    }

    function connect() {
      useTwinStore.getState().setStatus("connecting");
      ws = new WebSocket(wsUrl());

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as WsMessage;
        const store = useTwinStore.getState();
        if (msg.type === "snapshot") {
          store.applySnapshot(msg.payload as SnapshotPayload, msg.seq);
        } else if (msg.seq === store.lastSeq + 1) {
          store.applyDelta(msg.payload as DeltaPayload, msg.seq);
        } else {
          void resnapshot(); // gap detected — re-sync
        }
      };

      ws.onopen = () => {
        retry = 0;
      };
      ws.onclose = () => {
        if (closed) return;
        useTwinStore.getState().setStatus("error");
        retry = Math.min(retry + 1, 5);
        setTimeout(connect, 500 * 2 ** (retry - 1)); // backoff, capped ~8s
      };
      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      closed = true;
      ws?.close();
    };
  }, []);
}
