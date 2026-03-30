import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type AuditInitiatorType = "user" | "scheduler" | "system" | "api" | "agent" | "unknown";

export interface AuditAgentContext {
  agentId?: string;
  executionPath?: string;
  triggerSource?: string;
  runMode?: string;
  [key: string]: unknown;
}

export async function createAuditEvent(input: {
  jobId?: string | null;
  integrationId: string;
  eventType: string;
  message: string;
  actor?: string | null;
  consentGrantId?: string | null;
  initiatorId?: string | null;
  initiatorType?: AuditInitiatorType;
  authorizationType?: string | null;
  agentContext?: AuditAgentContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const initiatorId = input.initiatorId ?? input.actor ?? null;
  const initiatorType = input.initiatorType ?? (initiatorId ? "user" : "unknown");
  const authorizationType = input.authorizationType ?? (input.consentGrantId ? "consent_grant" : "none");
  const agentContext: AuditAgentContext = {
    agentId: input.agentContext?.agentId ?? "rotateops-api",
    ...input.agentContext
  };

  const mergedMetadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    provenance: {
      initiatedBy: {
        id: initiatorId,
        type: initiatorType
      },
      authorization: {
        consentGrantId: input.consentGrantId ?? null,
        type: authorizationType
      },
      executedBy: agentContext
    },
    queryable: {
      initiatorId,
      initiatorType,
      consentGrantId: input.consentGrantId ?? null,
      authorizationType,
      agentId: agentContext.agentId ?? null,
      triggerSource: agentContext.triggerSource ?? null,
      executionPath: agentContext.executionPath ?? null,
      runMode: agentContext.runMode ?? null
    }
  };

  await prisma.auditEvent.create({
    data: {
      jobId: input.jobId ?? null,
      integrationId: input.integrationId,
      eventType: input.eventType,
      message: input.message,
      actor: input.actor ?? initiatorId ?? null,
      consentGrantId: input.consentGrantId ?? null,
      metadata: mergedMetadata as Prisma.InputJsonValue
    }
  });
}
