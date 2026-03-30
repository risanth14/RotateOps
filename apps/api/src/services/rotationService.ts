import dayjs from "dayjs";
import type { JobStatus } from "@prisma/client";
import { getConnector } from "../connectors/index.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { createAuditEvent } from "./auditService.js";
import { generateComplianceSummary } from "./aiSummaryService.js";
import { sendSlackNotification } from "./slackService.js";

type TriggerSource = "manual" | "scheduler" | "api";
type HighRiskAction = "revoke_old_credential" | "privileged_provider_rotation";

const STEP_UP_PENDING_REASON = "Step-up authentication is required before high-risk rotation actions can continue.";

function getHighRiskActions(input: { integrationMode: "demo" | "provider"; hasOldCredential: boolean }): HighRiskAction[] {
  const actions: HighRiskAction[] = [];
  if (input.integrationMode === "provider") {
    actions.push("privileged_provider_rotation");
  }
  if (input.hasOldCredential) {
    actions.push("revoke_old_credential");
  }
  return actions;
}

export interface RunRotationJobOptions {
  stepUpSatisfied?: boolean;
  stepUpMethod?: string | null;
  stepUpReason?: string | null;
}

export interface RunRotationJobResult {
  jobId: string;
  status: JobStatus;
  started: boolean;
  stepUpRequired: boolean;
}

export async function createRotationJob(input: {
  integrationId: string;
  policyId?: string | null;
  triggeredBy: TriggerSource;
  organizationId: string;
  actor?: string | null;
  consentGrantId?: string | null;
}) {
  const integration = await prisma.integration.findFirst({
    where: {
      id: input.integrationId,
      organizationId: input.organizationId
    }
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

export async function runRotationJob(jobId: string, options: RunRotationJobOptions = {}): Promise<RunRotationJobResult> {
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
    return {
      jobId: job.id,
      status: "running",
      started: false,
      stepUpRequired: false
    };
  }

  const highRiskActions = getHighRiskActions({
    integrationMode: job.integration.mode,
    hasOldCredential: Boolean(job.integration.secretFingerprint)
  });
  const stepUpRequired = highRiskActions.length > 0;
  const initiatorId = job.actor ?? null;
  const initiatorType = job.triggeredBy === "scheduler" ? "scheduler" : initiatorId ? "user" : "system";
  const auditAgentContextBase = {
    agentId: "rotation-orchestrator",
    executionPath: "rotation_service",
    triggerSource: job.triggeredBy,
    runMode: job.integration.mode === "provider" ? "provider" : env.APP_MODE,
    jobId: job.id
  };
  const emitAuditEvent = (payload: {
    jobId?: string | null;
    integrationId: string;
    eventType: string;
    message: string;
    actor?: string | null;
    consentGrantId?: string | null;
    metadata?: Record<string, unknown>;
    agentContext?: Record<string, unknown>;
  }) =>
    createAuditEvent({
      ...payload,
      actor: payload.actor ?? initiatorId,
      consentGrantId: payload.consentGrantId ?? job.consentGrantId ?? null,
      initiatorId,
      initiatorType,
      authorizationType: job.consentGrantId ? "consent_grant" : "policy_or_manual",
      agentContext: {
        ...auditAgentContextBase,
        ...(payload.agentContext ?? {})
      }
    });

  if (stepUpRequired && !options.stepUpSatisfied) {
    await prisma.rotationJob.update({
      where: { id: job.id },
      data: {
        status: "pending",
        startedAt: null,
        completedAt: null,
        failureReason: STEP_UP_PENDING_REASON
      }
    });

    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "step_up_required",
      message: "Rotation paused pending step-up authentication.",
      metadata: {
        highRiskActions,
        resumePath: `/jobs/${job.id}/resume`,
        reason: options.stepUpReason ?? "missing_step_up_authentication"
      },
      agentContext: {
        stepUpRequired: true,
        stepUpSatisfied: false
      }
    });

    return {
      jobId: job.id,
      status: "pending",
      started: false,
      stepUpRequired: true
    };
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
  await prisma.rotationJob.update({
    where: { id: job.id },
    data: {
      status: "running",
      startedAt,
      failureReason: null,
      ...(stepUpRequired
        ? {
            actor: job.actor,
            consentGrantId: job.consentGrantId
          }
        : {})
    }
  });

  if (stepUpRequired) {
    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "step_up_verified",
      message: "Step-up authentication satisfied. Rotation resumed.",
      metadata: {
        highRiskActions,
        method: options.stepUpMethod ?? null
      },
      agentContext: {
        stepUpRequired: true,
        stepUpSatisfied: true,
        stepUpMethod: options.stepUpMethod ?? null
      }
    });
  }

  await emitAuditEvent({
    jobId: job.id,
    integrationId: job.integrationId,
    eventType: "rotation_started",
    message: `Rotation started for ${job.integration.name}.`,
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

    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "credential_issued",
      message: "New credential issued.",
      metadata: {
        fingerprint: nextSecret.fingerprint,
        maskedReference: nextSecret.maskedReference,
        vaultTokenId: nextSecret.vaultTokenId ?? null
      }
    });

    const propagation = await connector.propagate(ctx, nextSecret);
    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: propagation.ok ? "propagation_succeeded" : "propagation_failed",
      message: propagation.ok ? "Credential propagation completed." : "Credential propagation failed.",
      metadata: {
        targets: propagation.targets
      }
    });

    if (!propagation.ok) {
      await connector.rollback(ctx, nextSecret);
      await emitAuditEvent({
        jobId: job.id,
        integrationId: job.integrationId,
        eventType: "rollback_performed",
        message: "Rollback completed due to propagation failure."
      });
      finalStatus = "manual_intervention";
      failureReason = "Propagation failed. Manual intervention required.";
      throw new Error(failureReason);
    }

    const verification = await connector.verify(ctx, nextSecret);
    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: verification.ok ? "verification_succeeded" : "verification_failed",
      message: verification.detail
    });

    if (!verification.ok) {
      await connector.rollback(ctx, nextSecret);
      await emitAuditEvent({
        jobId: job.id,
        integrationId: job.integrationId,
        eventType: "rollback_performed",
        message: "Rollback completed due to failed verification."
      });
      finalStatus = "manual_intervention";
      failureReason = "Verification failed. Old credential was preserved.";
      throw new Error(failureReason);
    }

    await connector.revokeOld(ctx, job.integration.secretFingerprint);
    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "old_credential_revoked",
      message: "Old credential revoked after verification succeeded.",
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
        metadata: {
          ...(job.integration.metadata as Record<string, unknown> | null),
          vaultTokenId: nextSecret.vaultTokenId ?? null
        },
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

    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "job_completed",
      message: "Rotation completed successfully."
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    failureReason = failureReason ?? reason;
    completedAt = new Date();

    await emitAuditEvent({
      jobId: job.id,
      integrationId: job.integrationId,
      eventType: "job_failed",
      message: "Rotation failed.",
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

  return {
    jobId: job.id,
    status: finalStatus,
    started: true,
    stepUpRequired
  };
}
