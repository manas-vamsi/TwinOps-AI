# Database Connection Pool Exhaustion

## Symptoms
Latency on the database climbs sharply, error rate rises, and dependent
services (orders, checkout) begin timing out. The database CPU may look normal
while requests queue waiting for a free connection.

## Likely causes
- Traffic spike beyond the configured pool size
- A slow query holding connections open
- A connection leak in an upstream service

## Remediation
1. Increase the connection pool size as an immediate relief valve.
2. Identify and kill long-running queries; add a statement timeout.
3. Fail over reads to a replica to shed load.
4. Add connection-pool saturation alerts so this is caught earlier next time.

## Prevention
Right-size pools per service, cap slow queries, and load-test the checkout path.
