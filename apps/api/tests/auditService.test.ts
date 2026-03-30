import { describe, expect, it, vi } from "vitest";

const prismaMock = {
  auditEvent: {
    create: vi.fn()
  }
};

vi.mock("../src/lib/prisma.js", () => ({
  prisma: prismaMock
}));

describe("audit provenance enrichment", () => {
  it("adds normalized provenance and queryable fields to metadata", async () => {
    const { createAuditEvent } = await import("../src/services/auditService.js");

    prismaMock.auditEvent.create.mockResolvedValue({});

    await createAuditEvent({
      integrationId: "integration-1",
      jobId: "job-1",
      eventType: "rotation_started",
      message: "Rotation started.",
      actor: "auth0|user_1",
      consentGrantId: "consent-1",
      initiatorId: "auth0|user_1",
      initiatorType: "user",
      authorizationType: "consent_grant",
      agentContext: {
        agentId: "rotation-orchestrator",
        executionPath: "rotation_service",
        triggerSource: "manual",
        runMode: "demo"
      },
      metadata: {
        provider: "github"
      }
    });

    const createInput = prismaMock.auditEvent.create.mock.calls.at(0)?.[0]?.data;
    expect(createInput.actor).toBe("auth0|user_1");
    expect(createInput.consentGrantId).toBe("consent-1");
    expect(createInput.metadata.provider).toBe("github");
    expect(createInput.metadata.provenance).toMatchObject({
      initiatedBy: {
        id: "auth0|user_1",
        type: "user"
      },
      authorization: {
        consentGrantId: "consent-1",
        type: "consent_grant"
      },
      executedBy: {
        agentId: "rotation-orchestrator",
        executionPath: "rotation_service",
        triggerSource: "manual",
        runMode: "demo"
      }
    });
    expect(createInput.metadata.queryable).toMatchObject({
      initiatorId: "auth0|user_1",
      consentGrantId: "consent-1",
      agentId: "rotation-orchestrator",
      triggerSource: "manual"
    });
  });
});

