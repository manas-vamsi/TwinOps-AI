"""Seeded e-commerce topology — the source of truth for the twin.
The client renders whatever this serves; it no longer defines its own."""

from twinops.modules.twin.schemas import Scenario, TwinEdge, TwinNode

NODES: list[TwinNode] = [
    TwinNode(id="lb-edge", kind="load-balancer", label="Edge Load Balancer", tier=0),
    TwinNode(id="gw-public", kind="gateway", label="Public API Gateway", tier=1),
    TwinNode(id="svc-web", kind="service", label="Web Storefront", tier=2),
    TwinNode(id="svc-auth", kind="service", label="Auth Service", tier=2),
    TwinNode(id="svc-catalog", kind="service", label="Catalog Service", tier=2),
    TwinNode(id="svc-checkout", kind="service", label="Checkout Service", tier=2),
    TwinNode(id="svc-payment", kind="service", label="Payment Service", tier=3),
    TwinNode(id="svc-orders", kind="service", label="Orders Service", tier=3),
    TwinNode(id="svc-inventory", kind="service", label="Inventory Service", tier=3),
    TwinNode(id="svc-fraud", kind="service", label="Fraud Detection", tier=3),
    TwinNode(id="svc-notify", kind="service", label="Notification Service", tier=3),
    TwinNode(id="q-order-events", kind="queue", label="Order Events Queue", tier=4),
    TwinNode(id="q-email", kind="queue", label="Email Queue", tier=4),
    TwinNode(id="cache-session", kind="cache", label="Session Cache", tier=4),
    TwinNode(id="cache-catalog", kind="cache", label="Catalog Cache", tier=4),
    TwinNode(id="db-orders-pg", kind="database", label="Orders Postgres", tier=5),
    TwinNode(id="db-users-pg", kind="database", label="Users Postgres", tier=5),
    TwinNode(id="db-catalog-pg", kind="database", label="Catalog Postgres", tier=5),
    TwinNode(id="db-payments-pg", kind="database", label="Payments Postgres", tier=5),
    TwinNode(id="obj-store", kind="cloud", label="Object Storage", tier=5),
]

# source depends on target
EDGES: list[TwinEdge] = [
    TwinEdge(source="lb-edge", target="gw-public"),
    TwinEdge(source="gw-public", target="svc-web"),
    TwinEdge(source="gw-public", target="svc-auth"),
    TwinEdge(source="gw-public", target="svc-catalog"),
    TwinEdge(source="gw-public", target="svc-checkout"),
    TwinEdge(source="svc-web", target="svc-catalog"),
    TwinEdge(source="svc-web", target="cache-catalog"),
    TwinEdge(source="svc-auth", target="db-users-pg"),
    TwinEdge(source="svc-auth", target="cache-session"),
    TwinEdge(source="svc-catalog", target="db-catalog-pg"),
    TwinEdge(source="svc-catalog", target="cache-catalog"),
    TwinEdge(source="svc-checkout", target="svc-payment"),
    TwinEdge(source="svc-checkout", target="svc-orders"),
    TwinEdge(source="svc-checkout", target="svc-inventory"),
    TwinEdge(source="svc-payment", target="svc-fraud"),
    TwinEdge(source="svc-payment", target="db-payments-pg"),
    TwinEdge(source="svc-orders", target="db-orders-pg"),
    TwinEdge(source="svc-orders", target="q-order-events"),
    TwinEdge(source="svc-inventory", target="db-catalog-pg"),
    TwinEdge(source="svc-fraud", target="db-payments-pg"),
    TwinEdge(source="q-order-events", target="svc-notify"),
    TwinEdge(source="svc-notify", target="q-email"),
    TwinEdge(source="svc-orders", target="obj-store"),
]

SCENARIOS: list[Scenario] = [
    Scenario(
        id="db-pool-exhaustion",
        label="DB connection pool exhaustion",
        origin="db-orders-pg",
        blurb="Orders Postgres connection pool saturated",
    ),
    Scenario(
        id="cache-stampede",
        label="Cache stampede",
        origin="cache-catalog",
        blurb="Catalog cache miss rate spiking",
    ),
    Scenario(
        id="payment-latency",
        label="Payment provider latency",
        origin="svc-payment",
        blurb="Payment errors cascading to checkout",
    ),
    Scenario(
        id="queue-backlog",
        label="Queue backlog",
        origin="q-order-events",
        blurb="Order events queue backing up",
    ),
]

# dependents: who-depends-on-me (reverse edges) — used by the cascade BFS
DEPENDENTS: dict[str, list[str]] = {n.id: [] for n in NODES}
for _e in EDGES:
    DEPENDENTS[_e.target].append(_e.source)
