import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function createAuditEvent(input: {
  jobId?: string | null;
  integrationId: string;
  eventType: string;
  message: string;
  actor?: string | null;
  consentGrantId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      jobId: input.jobId ?? null,
      integrationId: input.integrationId,
      eventType: input.eventType,
      message: input.message,
      actor: input.actor ?? null,
      consentGrantId: input.consentGrantId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
