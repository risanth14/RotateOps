import { beforeEach, describe, expect, it, vi } from "vitest";

const connectorMock = {
  rotate: vi.fn(),
  propagate: vi.fn(),
  verify: vi.fn(),
  revokeOld: vi.fn(),
  rollback: vi.fn()
};

const prismaMock = {
  rotationJob: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn()
  },
  secretTarget: {
    findMany: vi.fn()
  },
  integration: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  rotationPolicy: {
    update: vi.fn()
  },
  auditEvent: {
    create: vi.fn()
  }
};

const createAuditEventMock = vi.fn();
const slackMock = vi.fn();
const aiSummaryMock = vi.fn();

vi.mock("../src/connectors/index.js", () => ({
  getConnector: () => connectorMock
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: prismaMock
}));

vi.mock("../src/services/auditService.js", () => ({
  createAuditEvent: createAuditEventMock
}));

vi.mock("../src/services/slackService.js", () => ({
  sendSlackNotification: slackMock
}));

vi.mock("../src/services/aiSummaryService.js", () => ({
  generateComplianceSummary: aiSummaryMock
}));

vi.mock("../src/config/env.js", () => ({
  env: {
    APP_MODE: "demo"
  }
}));

describe("rotation pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiSummaryMock.mockResolvedValue("Summary");
    prismaMock.rotationJob.update.mockResolvedValue({});
    prismaMock.integration.update.mockResolvedValue({});
    prismaMock.rotationPolicy.update.mockResolvedValue({});
    prismaMock.secretTarget.findMany.mockResolvedValue([{ id: "target-1", name: "Runtime Env", kind: "runtime_env" }]);
    createAuditEventMock.mockResolvedValue(undefined);
    slackMock.mockResolvedValue(undefined);
  });

  it("runs happy path and revokes old credential after verification", async () => {
    const { runRotationJob } = await import("../src/services/rotationService.js");

    prismaMock.rotationJob.findUnique.mockResolvedValue({
      id: "job-1",
      integrationId: "integration-1",
      startedAt: null,
      integration: {
        id: "integration-1",
        provider: "github",
        name: "GitHub Token",
        mode: "demo",
        secretFingerprint: "old_finger"
      },
      policy: {
        id: "policy-1",
        intervalDays: 30,
        enabled: true
      }
    });

    connectorMock.rotate.mockResolvedValue({
      raw: "ghp_xxxxxx",
      fingerprint: "fp_new_123",
      maskedReference: "gh****xx"
    });
    connectorMock.propagate.mockResolvedValue({
      ok: true,
      targets: [{ targetId: "target-1", name: "Runtime Env", status: "success", detail: "done" }]
    });
    connectorMock.verify.mockResolvedValue({
      ok: true,
      detail: "Verification success"
    });
    connectorMock.revokeOld.mockResolvedValue(undefined);

    await runRotationJob("job-1");

    expect(connectorMock.verify).toHaveBeenCalledTimes(1);
    expect(connectorMock.revokeOld).toHaveBeenCalledTimes(1);
    expect(connectorMock.verify.mock.invocationCallOrder[0]).toBeLessThan(
      connectorMock.revokeOld.mock.invocationCallOrder[0]
    );

    const credentialEvent = createAuditEventMock.mock.calls.find(
      (call) => call[0].eventType === "credential_issued"
    )?.[0];
    expect(credentialEvent?.metadata?.fingerprint).toBe("fp_new_123");
    expect(credentialEvent?.metadata?.raw).toBeUndefined();

    const finalUpdate = prismaMock.rotationJob.update.mock.calls.at(-1)?.[0]?.data;
    expect(finalUpdate.status).toBe("success");
    expect(finalUpdate.failureReason).toBeNull();
  });

  it("marks manual intervention when verification fails and avoids revoking old key", async () => {
    const { runRotationJob } = await import("../src/services/rotationService.js");

    prismaMock.rotationJob.findUnique.mockResolvedValue({
      id: "job-2",
      integrationId: "integration-1",
      startedAt: null,
      integration: {
        id: "integration-1",
        provider: "stripe",
        name: "Stripe Key",
        mode: "demo",
        secretFingerprint: "old_finger"
      },
      policy: null
    });

    connectorMock.rotate.mockResolvedValue({
      raw: "sk_live_xxx",
      fingerprint: "fp_new_456",
      maskedReference: "sk****xx"
    });
    connectorMock.propagate.mockResolvedValue({
      ok: true,
      targets: [{ targetId: "target-1", name: "Runtime Env", status: "success", detail: "done" }]
    });
    connectorMock.verify.mockResolvedValue({
      ok: false,
      detail: "Verification failed"
    });
    connectorMock.rollback.mockResolvedValue(undefined);

    await runRotationJob("job-2");

    expect(connectorMock.rollback).toHaveBeenCalledTimes(1);
    expect(connectorMock.revokeOld).not.toHaveBeenCalled();

    const finalUpdate = prismaMock.rotationJob.update.mock.calls.at(-1)?.[0]?.data;
    expect(finalUpdate.status).toBe("manual_intervention");
    expect(finalUpdate.rollbackPerformed).toBe(true);
  });
});
