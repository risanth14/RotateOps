# RotateOps Security Considerations (MVP)

RotateOps MVP is designed for safe local demo workflows and architecture validation.
It is not production-hardened as-is.

## What the MVP does safely

- Never stores raw credential values in the database
- Stores only masked references and fingerprints for auditability
- Uses verification-before-revocation sequencing
- Records immutable-style audit events for each phase

## Current limitations

- Secrets are simulated in demo mode, not issued from real provider APIs
- Provider mode connectors include intentional stubs for dangerous steps
- No dedicated secret manager integration (Vault, AWS Secrets Manager, GCP Secret Manager, etc.)
- No fine-grained RBAC or SSO
- No at-rest application-level encryption for metadata columns
- Slack webhook delivery is best-effort and not signed/verified inbound

## Production hardening checklist

- Integrate a secure secret manager and never expose raw secrets to app memory longer than needed
- Implement provider-specific least-privilege API credentials per connector
- Add dual control / approval workflow for revoke and rollback
- Add tenant isolation + RBAC + SSO + audit export pipeline
- Add cryptographic signing for critical audit events and immutable retention policy
- Add retry strategy, dead-letter queue, and idempotency keys for job steps
- Add end-to-end integration tests against provider sandboxes
- Add network egress controls and secret scanning in CI
- Add full observability (metrics, traces, alerting) for every rotation stage

## Responsible use statement

RotateOps is a deterministic orchestration system. Optional AI summaries are informational only and never control credential lifecycle decisions.
