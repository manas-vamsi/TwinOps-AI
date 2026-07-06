import type { Scenario, TwinEdgeSpec, TwinNodeSpec } from "./types";

/** Seeded e-commerce infrastructure — the same "company" every run.
 *  Left-to-right dependency flow: edge -> services -> data stores.
 *  This is the client-side stand-in for the backend simulation engine;
 *  the shape matches what /twin/graph will return in Phase 1 backend. */

export const NODES: TwinNodeSpec[] = [
  // tier 0 — edge
  { id: "lb-edge", kind: "load-balancer", label: "Edge Load Balancer", tier: 0 },
  { id: "gw-public", kind: "gateway", label: "Public API Gateway", tier: 1 },

  // tier 2 — customer-facing services
  { id: "svc-web", kind: "service", label: "Web Storefront", tier: 2 },
  { id: "svc-auth", kind: "service", label: "Auth Service", tier: 2 },
  { id: "svc-catalog", kind: "service", label: "Catalog Service", tier: 2 },
  { id: "svc-checkout", kind: "service", label: "Checkout Service", tier: 2 },

  // tier 3 — core domain services
  { id: "svc-payment", kind: "service", label: "Payment Service", tier: 3 },
  { id: "svc-orders", kind: "service", label: "Orders Service", tier: 3 },
  { id: "svc-inventory", kind: "service", label: "Inventory Service", tier: 3 },
  { id: "svc-fraud", kind: "service", label: "Fraud Detection", tier: 3 },
  { id: "svc-notify", kind: "service", label: "Notification Service", tier: 3 },

  // tier 4 — infrastructure: queues + caches
  { id: "q-order-events", kind: "queue", label: "Order Events Queue", tier: 4 },
  { id: "q-email", kind: "queue", label: "Email Queue", tier: 4 },
  { id: "cache-session", kind: "cache", label: "Session Cache", tier: 4 },
  { id: "cache-catalog", kind: "cache", label: "Catalog Cache", tier: 4 },

  // tier 5 — data stores + cloud
  { id: "db-orders-pg", kind: "database", label: "Orders Postgres", tier: 5 },
  { id: "db-users-pg", kind: "database", label: "Users Postgres", tier: 5 },
  { id: "db-catalog-pg", kind: "database", label: "Catalog Postgres", tier: 5 },
  { id: "db-payments-pg", kind: "database", label: "Payments Postgres", tier: 5 },
  { id: "obj-store", kind: "cloud", label: "Object Storage", tier: 5 },
];

/** source depends on target */
export const EDGES: TwinEdgeSpec[] = [
  { source: "lb-edge", target: "gw-public" },
  { source: "gw-public", target: "svc-web" },
  { source: "gw-public", target: "svc-auth" },
  { source: "gw-public", target: "svc-catalog" },
  { source: "gw-public", target: "svc-checkout" },

  { source: "svc-web", target: "svc-catalog" },
  { source: "svc-web", target: "cache-catalog" },
  { source: "svc-auth", target: "db-users-pg" },
  { source: "svc-auth", target: "cache-session" },
  { source: "svc-catalog", target: "db-catalog-pg" },
  { source: "svc-catalog", target: "cache-catalog" },

  { source: "svc-checkout", target: "svc-payment" },
  { source: "svc-checkout", target: "svc-orders" },
  { source: "svc-checkout", target: "svc-inventory" },

  { source: "svc-payment", target: "svc-fraud" },
  { source: "svc-payment", target: "db-payments-pg" },
  { source: "svc-orders", target: "db-orders-pg" },
  { source: "svc-orders", target: "q-order-events" },
  { source: "svc-inventory", target: "db-catalog-pg" },
  { source: "svc-fraud", target: "db-payments-pg" },

  { source: "q-order-events", target: "svc-notify" },
  { source: "svc-notify", target: "q-email" },
  { source: "svc-orders", target: "obj-store" },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "db-pool-exhaustion",
    label: "DB connection pool exhaustion",
    origin: "db-orders-pg",
    blurb: "Orders Postgres connection pool saturated",
  },
  {
    id: "cache-stampede",
    label: "Cache stampede",
    origin: "cache-catalog",
    blurb: "Catalog cache miss rate spiking",
  },
  {
    id: "payment-latency",
    label: "Payment provider latency",
    origin: "svc-payment",
    blurb: "Payment errors cascading to checkout",
  },
  {
    id: "queue-backlog",
    label: "Queue backlog",
    origin: "q-order-events",
    blurb: "Order events queue backing up",
  },
];
