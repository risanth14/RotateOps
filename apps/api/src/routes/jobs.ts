import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { createRotationJob, runRotationJob } from "../services/rotationService.js";

const createSchema = z.object({
  integrationId: z.string().min(1),
  policyId: z.string().optional(),
  triggeredBy: z.enum(["manual", "scheduler", "api"]).default("api")
});

export const jobsRouter = Router();

jobsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const jobs = await prisma.rotationJob.findMany({
    where: {
      integration: {
        organizationId: auth.organizationId
      }
    },
    include: {
      integration: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json(jobs);
  })
);

jobsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const integration = await prisma.integration.findFirst({
    where: {
      id: parsed.data.integrationId,
      organizationId: auth.organizationId
    }
  });

  if (!integration) {
    return res.status(404).json({ error: "Integration not found." });
  }

  const job = await createRotationJob({
    integrationId: parsed.data.integrationId,
    policyId: parsed.data.policyId,
    triggeredBy: parsed.data.triggeredBy,
    organizationId: auth.organizationId
  });
  return res.status(201).json(job);
  })
);

jobsRouter.post(
  "/:id/run",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const job = await prisma.rotationJob.findFirst({
    where: {
      id: req.params.id,
      integration: {
        organizationId: auth.organizationId
      }
    }
  });

  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  void runRotationJob(job.id);
  return res.status(202).json({ ok: true, jobId: job.id });
  })
);

jobsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const job = await prisma.rotationJob.findFirst({
    where: {
      id: req.params.id,
      integration: {
        organizationId: auth.organizationId
      }
    },
    include: {
      integration: true,
      auditEvents: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }

  return res.json(job);
  })
);
