import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("auth-protected routes", () => {
  const app = buildApp();

  it("allows unauthenticated access to /health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("blocks unauthenticated access to protected routes", async () => {
    const integrations = await request(app).get("/integrations");
    const jobs = await request(app).get("/jobs");
    const auditEvents = await request(app).get("/audit-events");

    expect(integrations.status).toBe(401);
    expect(jobs.status).toBe(401);
    expect(auditEvents.status).toBe(401);
    expect(integrations.body).toEqual({ error: "Unauthorized" });
  });
});

