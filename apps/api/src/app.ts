import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { auditEventsRouter } from "./routes/auditEvents.js";
import { integrationsRouter } from "./routes/integrations.js";
import { jobsRouter } from "./routes/jobs.js";
import { policiesRouter } from "./routes/policies.js";
import { seedDemoRouter } from "./routes/seedDemo.js";

export function buildApp() {
  const app = express();
  app.use(
    cors({
      // In development, Next may run on a fallback port (3001/3002/...) if 3000 is busy.
      // Keep production strict while allowing local multi-port workflows.
      origin: env.NODE_ENV === "production" ? [env.WEB_BASE_URL] : true,
      credentials: false
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, mode: env.APP_MODE, now: new Date().toISOString() });
  });

  app.use("/integrations", integrationsRouter);
  app.use("/policies", policiesRouter);
  app.use("/jobs", jobsRouter);
  app.use("/audit-events", auditEventsRouter);
  app.use("/seed-demo", seedDemoRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    res.status(500).json({ error: message });
  });

  return app;
}
