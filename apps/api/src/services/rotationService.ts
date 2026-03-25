import dayjs from "dayjs";
import type { JobStatus } from "@prisma/client";
import { getConnector } from "../connectors/index.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { createAuditEvent } from "./auditService.js";
import { generateComplianceSummary } from "./aiSummaryService.js";
import { sendSlackNotification } from "./slackService.js";

type TriggerSource = "manual" | "scheduler" | "api";

export async function createRotationJob(input: {
  integrationId: string;
  policyId?: string | null;
  triggeredBy: TriggerSource;
  actor?: string | null;
  consentGrantId?: string | null;
}) {
  const integration = await prisma.integration.findUnique({
    where: { id: input.integrationId }
  });

  if (!integration) {
    throw new Error("Integration not found.");
  }

  return prisma.rotationJob.create({
    data: {
      integrationId: integration.id,
      policyId: input.policyId ?? null,
      triggeredBy: input.triggeredBy,
      actor: input.actor ?? null,
      consentGrantId: input.consentGrantId ?? null,
      status: "pending"
    }
  });
}

export async function runRotationJob(jobId: string): Promise<void> {
  const job = await prisma.rotationJob.findUnique({
    where: { id: jobId },
    include: {
      integration: true,
      policy: true
    }
  });

  if (!job) {
    throw new Error("Rotation job not found.");
  }

  if (job.status === "running") {
    return;
  }

  const targets = await prisma.secretTarget.findMany({
    where: { integrationId: job.integrationId }
  });

  const connector = getConnector(job.integration.provider);
  const mode = job.integration.mode === "provider" ? "provider" : env.APP_MODE;
  const startedAt = new Date();
  const ctx = {
    integration: job.integration,
    targets,
    mode
  } as const;

  // Audit context carried from the job for every event in this pipeline run
  const auditCtx = {
    actor: job.actor ?? null,
    consentGrantId: job.consentGrantId ?? null
  };

  await prisma.rotationJob.update({
    where: { id: job.id },
    data: {
      status: "running",
      startedAt,
      failureReason: null
    }
  });

  await createAuditEvent({
    jobId: job.id,
    integrationId: job.integrationId,
    eventType: "rotation_started",
    message: `Rotation started for ${job.integration.name}.`,
    ...auditCtx,
    metadata: {
      provider: job.integration.provider,
      mode
    }
  });

  let finalStatus: JobStatus = "failed";
  let failureReason: string | null = null;
  let newFingerprint: string | null = null;
  let completedAt: Date | null = null;

  try {
    const nextSecret = await connector.rotate(ctx);
    newFingerprint = nextSecret.fingerprint;

    await createAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "credential_issued",
      message: "New credential issued.",
      ...auditCtx,
      metadata: {
        fingerprint: nextSecret.fingerprint,
        maskedReference: nextSecret.maskedReference
      }
    });

    const propagation = await connector.propagate(ctx, nextSecret);
    await createAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: propagation.ok ? "propagation_succeeded" : "propagation_failed",
      message: propagation.ok ? "Credential propagation completed." : "Credential propagation failed.",
      ...auditCtx,
      metadata: {
        targets: propagation.targets
      }
    });

    if (!propagation.ok) {
      await connector.rollback(ctx, nextSecret);
      await createAuditEvent({
        jobId: job.id,
        integrationId: job.integrationId,
        eventType: "rollback_performed",
        message: "Rollback completed due to propagation failure.",
        ...auditCtx
      });
      finalStatus = "manual_intervention";
      failureReason = "Propagation failed. Manual intervention required.";
      throw new Error(failureReason);
    }

    const verification = await connector.verify(ctx, nextSecret);
    await createAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: verification.ok ? "verification_succeeded" : "verification_failed",
      message: verification.detail,
      ...auditCtx
    });

    if (!verification.ok) {
      await connector.rollback(ctx, nextSecret);
      await createAuditEvent({
        jobId: job.id,
        integrationId: job.integrationId,
        eventType: "rollback_performed",
        message: "Rollback completed due to failed verification.",
        ...auditCtx
      });
      finalStatus = "manual_intervention";
      failureReason = "Verification failed. Old credential was preserved.";
      throw new Error(failureReason);
    }

    await connector.revokeOld(ctx, job.integration.secretFingerprint);
    await createAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "old_credential_revoked",
      message: "Old credential revoked after verification succeeded.",
      ...auditCtx,
      metadata: {
        oldFingerprint: job.integration.secretFingerprint
      }
    });

    await prisma.integration.update({
      where: { id: job.integrationId },
      data: {
        // Store only masked reference + fingerprint in MVP. Raw secrets should live in a secure vault.
        secretFingerprint: nextSecret.fingerprint,
        maskedReference: nextSecret.maskedReference,
        lastRotatedAt: new Date(),
        status: "active"
      }
    });

    if (job.policy?.enabled) {
      await prisma.rotationPolicy.update({
        where: { id: job.policy.id },
        data: {
          nextRunAt: dayjs().add(job.policy.intervalDays, "day").toDate()
        }
      });
    }

    finalStatus = "success";
    completedAt = new Date();

    await createAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "job_completed",
      message: "Rotation completed successfully.",
      ...auditCtx
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    failureReason = failureReason ?? reason;
    completedAt = new Date();

    await createAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "job_failed",
      message: "Rotation failed.",
      ...auditCtx,
      metadata: {
        reason: failureReason
      }
    });
  }

  const summary = await generateComplianceSummary({
    provider: job.integration.provider,
    integrationName: job.integration.name,
    status: finalStatus,
    startedAt,
    completedAt,
    failureReason,
    newFingerprint
  });

  await prisma.rotationJob.update({
    where: { id: job.id },
    data: {
      status: finalStatus,
      completedAt,
      failureReason,
      newFingerprint,
      rollbackPerformed: finalStatus === "manual_intervention",
      aiSummary: summary
    }
  });

  await sendSlackNotification({
    title: `RotateOps ${finalStatus === "success" ? "Rotation Success" : "Rotation Failure"}`,
    status: finalStatus === "success" ? "success" : "failed",
    lines: [
      `*Integration*: ${job.integration.name} (${job.integration.provider})`,
      `*Job*: ${job.id}`,
      `*Status*: ${finalStatus}`,
      `*Failure reason*: ${failureReason ?? "n/a"}`
    ]
  });
}
