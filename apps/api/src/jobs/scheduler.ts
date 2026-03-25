import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { createRotationJob, runRotationJob } from "../services/rotationService.js";

let started = false;

export function startScheduler(): void {
  if (started) {
    return;
  }
  started = true;

  cron.schedule("*/1 * * * *", async () => {
    try {
      const duePolicies = await prisma.rotationPolicy.findMany({
        where: {
          enabled: true,
          nextRunAt: { lte: new Date() },
          integration: {
            status: "active"
          }
        },
        include: {
          integration: true
        }
      });

      for (const policy of duePolicies) {
        const existing = await prisma.rotationJob.findFirst({
          where: {
            integrationId: policy.integrationId,
            status: { in: ["pending", "running"] }
          }
        });

        if (existing) {
          continue;
        }

        const job = await createRotationJob({
          integrationId: policy.integrationId,
          policyId: policy.id,
          triggeredBy: "scheduler",
          organizationId: policy.integration.organizationId
        });

        void runRotationJob(job.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduler error";
      console.error("[scheduler] tick failed:", message);
    }
  });
}
