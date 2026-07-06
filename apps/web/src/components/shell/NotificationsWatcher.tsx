"use client";

import { useEffect, useRef } from "react";
import { useTwinStore } from "@/stores/twinStore";
import { useNotifyStore } from "@/stores/notifyStore";

/** Turns the incident lifecycle into notifications: an incident appearing in
 *  the live open-set is "detected"; one leaving it is "resolved". Runs app-wide
 *  from the shell so notifications arrive on any page. */
export function NotificationsWatcher() {
  const incidents = useTwinStore((s) => s.incidents);
  const add = useNotifyStore((s) => s.add);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(incidents.map((i) => i.id));
    for (const inc of incidents) {
      if (!seen.current.has(inc.id)) {
        seen.current.add(inc.id);
        add({
          kind: "critical",
          title: inc.title,
          body: inc.root_cause ? `Root cause: ${inc.root_cause.label}` : "Investigating…",
        });
      }
    }
    for (const id of [...seen.current]) {
      if (!currentIds.has(id)) {
        seen.current.delete(id);
        add({ kind: "success", title: "Incident resolved", body: "All systems recovered" });
      }
    }
  }, [incidents, add]);

  return null;
}
