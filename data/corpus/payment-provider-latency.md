# Payment Provider Latency

## Symptoms
Payment service latency and error rate rise, cascading into checkout. Customers
see slow or failed purchases.

## Likely causes
- Upstream payment provider degradation
- Fraud-detection calls timing out and blocking the payment path
- Retry storms amplifying load

## Remediation
1. Enable a circuit breaker on the provider call; fail fast instead of hanging.
2. Make fraud checks asynchronous or best-effort so they cannot block payment.
3. Cap retries with exponential backoff and jitter.
4. Queue payment confirmations for later reconciliation if the provider is down.

## Prevention
Every third-party call needs a timeout, a circuit breaker, and a fallback.
