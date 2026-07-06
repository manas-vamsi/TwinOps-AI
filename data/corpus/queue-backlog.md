# Message Queue Backlog

## Symptoms
The order-events queue depth grows, notifications lag, and downstream consumers
fall behind real time.

## Likely causes
- Consumer throughput dropped (crash, slow downstream, poison message)
- Producer surge outpacing consumers

## Remediation
1. Scale out consumers to drain the backlog.
2. Check for a poison message stuck at the head; move it to a dead-letter queue.
3. Apply backpressure upstream if the backlog keeps growing.
4. Temporarily shed low-priority message types.

## Prevention
Alert on queue depth and consumer lag; always run a dead-letter queue.
