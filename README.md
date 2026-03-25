# RotateOps MVP

RotateOps is a deterministic credential rotation orchestrator with an auditable pipeline:

1. scheduler/manual trigger finds due integration
2. connector issues replacement credential
3. credential propagates to downstream targets
4. verification runs
5. old credential revokes only after verification succeeds
6. audit trail is recorded
7. Slack notification is sent

Optional AI summaries can generate plain-English compliance notes, but AI does not make execution decisions.

## Stack

- Frontend: Next.js + TypeScript + Tailwind (`apps/web`)
- Backend: Express + TypeScript (`apps/api`)
- Database: PostgreSQL + Prisma
- Jobs: cron-based scheduler (`node-cron`)
- Notifications: Slack incoming webhook
- Tests: Vitest rotation pipeline tests

## Repository Structure

```text
apps/
  api/
    prisma/
    src/
    tests/
  web/
    app/
    components/
    lib/
packages/
  shared/
```

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (Postgres)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create env files:

```powershell
Copy-Item .env.example apps/api/.env
Copy-Item apps/web/.env.local.example apps/web/.env.local
```

3. Update `apps/api/.env` with your Supabase values:

- `DATABASE_URL`: Supabase pooled connection string (port `6543`)
- `DIRECT_URL`: Supabase direct connection string (port `5432`, `sslmode=require`)

4. Generate Prisma client + apply migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed demo integrations:

```bash
npm run seed
```

6. Start API + Web:

```bash
npm run dev:all
```

Web runs on `http://localhost:3000`, API on `http://localhost:4000`.

## Demo Flow

1. Open `/dashboard`
2. Click **Seed Demo Integrations** (safe to run repeatedly)
3. Open `/integrations` and click **Rotate Now**
4. Watch `/jobs` and `/audit` for status and event timeline

## API Endpoints

- `GET /integrations`
- `POST /integrations`
- `POST /integrations/:id/rotate-now`
- `GET /policies`
- `POST /policies`
- `GET /jobs`
- `POST /jobs`
- `POST /jobs/:id/run`
- `GET /jobs/:id`
- `GET /audit-events`
- `POST /seed-demo`

## Modes

- `APP_MODE=demo`: safe mocked rotations (default)
- `mode=provider` on an integration: production-oriented connector interfaces with explicit stubs where provider-specific safeguards are required

Provider mode currently requires completing connector-specific API calls and revocation/rollback safety checks before production use.

## Testing

```bash
npm test
```

Covers core pipeline behavior:
- verify before revoke in success path
- rollback + manual intervention on verification failure

## Slack Notifications

Set in `apps/api/.env`:

```env
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

## AI Summaries (Optional)

Set:

```env
ENABLE_AI_SUMMARIES=true
OPENAI_API_KEY="..."
```

AI output is informational only and never controls job execution.

## Security Notes

See [`SECURITY.md`](./SECURITY.md) for production limitations and hardening checklist.
