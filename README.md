# RotateOps

RotateOps is a deterministic credential rotation orchestrator for teams that need safer key lifecycle management with audit-first evidence. It runs scheduled or manual rotations, verifies propagation before revocation, records provenance-rich audit events, and supports provider-mode execution through a Token Vault adapter (`issue -> introspect -> revoke`).

## Why This Project Matters

- Secret rotation often fails at the dangerous moment between key issuance and revocation.
- Most demos show success, but weak traceability during failure handling.
- RotateOps focuses on operational safety:
  - verify before revoke
  - resumable pending states for protected actions
  - explicit provenance for who authorized and who executed each sensitive step

## Quickstart For Judges

Use this path to get to a live demo quickly.

1. Install dependencies.

```bash
npm install
```

2. Create local env files.

```powershell
Copy-Item .env.example apps/api/.env
Copy-Item apps/web/.env.local.example apps/web/.env.local
```

3. Generate Prisma client and run migrations.

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Seed demo integrations.

```bash
npm run seed
```

5. Start both services.

```bash
npm run dev:all
```

6. Open:
- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

Judge shortcut: if auth configuration is unavailable in your environment, use local demo bypass values documented in `.env.example` and run in `APP_MODE=demo`.

## Architecture Summary

### Frontend

- Next.js dashboard for integrations, policies, jobs, and audit timeline.
- Located in `apps/web`.

### API + Orchestration

- Express API with typed routes and middleware.
- Rotation orchestration in `apps/api/src/services/rotationService.ts`.
- Step-up authentication gating for high-risk actions with secure resume path.

### Connectors + Token Vault

- Connector abstraction for provider-specific behavior.
- Demo mode uses generated mock secrets.
- Provider mode uses Token Vault client for:
  - issuing tokens
  - introspecting active status
  - revoking old tokens after verification

### Data + Auditability

- PostgreSQL + Prisma for jobs, integrations, policies, consent grants, and audit events.
- Audit events include:
  - initiator identity
  - consent grant linkage
  - execution context metadata

### Reliability + Safety Controls

- Verify before revoke ordering.
- Rollback and manual intervention state on propagation/verification failure.
- Pending/resume flow when step-up auth is required but incomplete.

## 3-Minute Demo Script

Use this exact script during judging.

1. `00:00-00:20` — Problem framing.
- Explain why blind key revocation causes outages.
- State RotateOps promise: deterministic rotation with evidence.

2. `00:20-00:45` — System overview.
- Show dashboard + API health endpoint.
- Mention demo vs provider mode.

3. `00:45-01:20` — Trigger rotation.
- Open Integrations.
- Click `Rotate Now` on one demo integration.
- Call out pipeline stages visible in Jobs/Audit.

4. `01:20-01:55` — Show safety logic.
- Highlight verify-before-revoke ordering in audit entries.
- Show failure handling path (manual intervention/rollback events if configured).

5. `01:55-02:25` — Show auth + consent traceability.
- Show step-up-required/pending event behavior (if enabled in your run).
- Show consent-linked audit records and provenance fields.

6. `02:25-03:00` — Token Vault value.
- Explain provider-mode path (`issue/introspect/revoke`).
- Close with incident-readiness: who did what, under what authorization, and what executed the action.

## API Endpoints (Core)

- `GET /health`
- `GET /integrations`
- `POST /integrations`
- `POST /integrations/:id/rotate-now`
- `GET /policies`
- `POST /policies`
- `GET /jobs`
- `POST /jobs`
- `POST /jobs/:id/run`
- `POST /jobs/:id/resume`
- `GET /jobs/:id`
- `GET /audit-events`
- `POST /seed-demo`
- `GET|POST|DELETE /integrations/:id/consent*`

All endpoints except `GET /health` require a valid Auth0 Bearer token unless local demo bypass is enabled.

## Testing + Coverage

```bash
npm run lint --workspace @rotateops/api
npm run typecheck --workspace @rotateops/api
npm run test:coverage --workspace @rotateops/api
```

Coverage reports are written to `apps/api/coverage` (`text`, `lcov`, `html`).

## Bonus Blog (Token Vault Achievements)

Building RotateOps forced us to confront a hard truth: many rotation demos are “happy-path only,” and they quietly assume credential changes are always safe, immediate, and reversible. In production, that assumption fails quickly. The most meaningful achievement in this project was integrating a Token Vault execution path that turns risky secret handling into a controlled lifecycle with observable checkpoints.

Before this integration, issuing a new secret and propagating it downstream looked simple, but it left several unanswered questions during incidents: Was the secret actually active? Which token was replaced? Who authorized this operation? Could we revoke safely without collateral damage? By introducing a Token Vault adapter, we changed that model from opaque updates to a staged protocol: issue, introspect, verify, then revoke. This sequencing gave us a concrete safety boundary. Revocation became an explicit post-verification action, not an optimistic side effect.

A second achievement was traceability quality. We now enrich audit events with provenance metadata for initiator identity, consent grant linkage, and agent execution context. That sounds like “just logging,” but operationally it is much more. It gives reviewers and judges a trustworthy incident narrative: who initiated the action, what authorization covered it, and which system component executed each step. During a failed run, this context turns debugging from guesswork into timeline-based analysis.

Third, Token Vault integration created design pressure that improved our architecture. We had to separate connector responsibilities, formalize provider-mode behavior, and tighten failure semantics around rollback and manual intervention. That made our system more resilient even in demo mode, because the contract for “safe rotation” became explicit across all paths.

Finally, this work improved submission readiness. In three minutes, we can demonstrate not only that RotateOps rotates credentials, but that it does so with governance-grade evidence and controlled authorization boundaries. The Token Vault layer is not a cosmetic add-on; it is the core enabler for credible, auditable, and incident-friendly credential lifecycle management.

## Security Notes

See [`SECURITY.md`](./SECURITY.md) for hardening limitations and production checklist items.
