# Incident Response Playbook

## First five minutes
1. Acknowledge the incident and confirm the blast radius on the Digital Twin.
2. Identify the most-upstream failing component — that is usually the origin.
3. Check recent deploys and config changes to that component.
4. Apply the fastest safe mitigation (scale, restart, fail over, rate-limit).

## Roles
- Incident commander coordinates and communicates.
- One responder drives the fix; others investigate in parallel.

## After resolution
Write a blameless postmortem: timeline, root cause, contributing factors, and
the follow-up actions to prevent recurrence.
