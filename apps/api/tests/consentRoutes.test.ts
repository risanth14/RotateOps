import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consentRouter } from "../src/routes/consent.js";

const { prismaMock, createAuditEventMock } = vi.hoisted(() => ({
  prismaMock: {
    integration: {
      findUnique: vi.fn()
    },
    consentGrant: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  },
  createAuditEventMock: vi.fn()
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: prismaMock
}));

vi.mock("../src/services/auditService.js", () => ({
  createAuditEvent: createAuditEventMock
}));

describe("consent lifecycle routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/integrations/:id/consent", consentRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates, lists, completes callback, and revokes consent grants", async () => {
    prismaMock.integration.findUnique
      .mockResolvedValueOnce({ id: "integration-1", provider: "github" })
      .mockResolvedValueOnce({ id: "integration-1", provider: "github" })
      .mockResolvedValueOnce({ id: "integration-1", provider: "github" })
      .mockResolvedValueOnce({ id: "integration-1", provider: "github" });

    prismaMock.consentGrant.create.mockResolvedValue({
      id: "grant-1",
      integrationId: "integration-1",
      provider: "github",
      scopes: ["repo", "admin:repo_hook"],
      grantedBy: "auth0|user_1",
      expiresAt: null,
      revokedAt: null,
      callbackState: "state-abc"
    });

    prismaMock.consentGrant.findMany.mockResolvedValue([
      {
        id: "grant-1",
        integrationId: "integration-1",
        scopes: ["repo", "admin:repo_hook"],
        grantedBy: "auth0|user_1",
        revokedAt: null
      }
    ]);

    prismaMock.consentGrant.findFirst
      .mockResolvedValueOnce({
        id: "grant-1",
        integrationId: "integration-1",
        grantedBy: "auth0|user_1",
        scopes: ["repo", "admin:repo_hook"],
        revokedAt: null,
        callbackState: "state-abc"
      })
      .mockResolvedValueOnce({
        id: "grant-1",
        integrationId: "integration-1",
        grantedBy: "auth0|user_1",
        scopes: ["repo", "admin:repo_hook"],
        revokedAt: null
      });

    prismaMock.consentGrant.update
      .mockResolvedValueOnce({
        id: "grant-1",
        callbackState: null
      })
      .mockResolvedValueOnce({
        id: "grant-1",
        revokedAt: new Date("2026-01-01T00:00:00.000Z")
      });

    const created = await request(app).post("/integrations/integration-1/consent").send({
      scopes: ["repo", "admin:repo_hook"],
      grantedBy: "auth0|user_1"
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toBe("grant-1");

    const listed = await request(app).get("/integrations/integration-1/consent");
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const callback = await request(app).get("/integrations/integration-1/consent/callback?state=state-abc&code=1234");
    expect(callback.status).toBe(200);
    expect(callback.body.ok).toBe(true);

    const revoked = await request(app).delete("/integrations/integration-1/consent/grant-1");
    expect(revoked.status).toBe(200);

    const eventTypes = createAuditEventMock.mock.calls.map((call) => call[0].eventType);
    expect(eventTypes).toEqual(["consent_granted", "consent_callback_completed", "consent_revoked"]);
  });
});
