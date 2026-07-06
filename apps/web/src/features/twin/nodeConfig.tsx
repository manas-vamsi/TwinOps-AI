import {
  Boxes,
  Database,
  HardDrive,
  Network,
  Server,
  Layers,
  Cloud,
  type LucideIcon,
} from "lucide-react";
import type { HealthStatus, NodeKind } from "./types";

export const KIND_ICON: Record<NodeKind, LucideIcon> = {
  "load-balancer": Network,
  gateway: Boxes,
  service: Server,
  database: Database,
  queue: Layers,
  cache: HardDrive,
  cloud: Cloud,
};

export const KIND_LABEL: Record<NodeKind, string> = {
  "load-balancer": "Load Balancer",
  gateway: "Gateway",
  service: "Service",
  database: "Database",
  queue: "Queue",
  cache: "Cache",
  cloud: "Cloud",
};

/** Health → token utility classes (semantic status colors, theme-aware). */
export const STATUS_STYLE: Record<
  HealthStatus,
  { dot: string; ring: string; text: string }
> = {
  healthy: { dot: "bg-success", ring: "border-success/40", text: "text-success" },
  degraded: { dot: "bg-warn", ring: "border-warn/60", text: "text-warn" },
  critical: { dot: "bg-critical", ring: "border-critical", text: "text-critical" },
};

export const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  critical: "Critical",
};
