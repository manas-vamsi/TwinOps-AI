# Cache Stampede

## Symptoms
Cache miss rate spikes, and the backing store (database) sees a sudden surge of
identical requests. Catalog and storefront latency degrades.

## Likely causes
A popular key expires and many requests miss simultaneously, all rushing to
recompute the same value against the origin.

## Remediation
1. Add request coalescing (single-flight) so only one request recomputes a key.
2. Serve stale-while-revalidate to keep responses fast during recompute.
3. Increase TTL and add jitter to expiry so keys do not expire together.
4. Warm the cache for known-hot keys after a deploy or flush.

## Prevention
Never let hot keys share an exact expiry; always jitter TTLs.
