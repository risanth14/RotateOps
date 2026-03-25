import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function createAuditEvent(input: {
  jobId: string;
  integrationId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      jobId: input.jobId,
      integrationId: input.integrationId,
      eventType: input.eventType,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
