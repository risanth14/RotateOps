import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { createRotationJob, runRotationJob } from "../services/rotationService.js";
import { assessStepUpFromToken } from "../services/stepUpService.js";

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
    organizationId: auth.organizationId,
    actor: auth.auth0UserId
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

  const stepUp = assessStepUpFromToken(auth.token, env.STEP_UP_MAX_AGE_SECONDS);
  void runRotationJob(job.id, {
    stepUpSatisfied: stepUp.satisfied,
    stepUpMethod: stepUp.method,
    stepUpReason: stepUp.reason
  });
  return res.status(202).json({ ok: true, jobId: job.id });
  })
);

jobsRouter.post(
  "/:id/resume",
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

  if (job.status !== "pending") {
    return res.status(409).json({ error: "Only pending jobs can be resumed." });
  }

  const stepUp = assessStepUpFromToken(auth.token, env.STEP_UP_MAX_AGE_SECONDS);
  if (!stepUp.satisfied) {
    return res.status(403).json({
      error: "Step-up authentication required.",
      detail: stepUp.reason
    });
  }

  await prisma.rotationJob.update({
    where: { id: job.id },
    data: {
      actor: auth.auth0UserId
    }
  });

  void runRotationJob(job.id, {
    stepUpSatisfied: true,
    stepUpMethod: stepUp.method,
    stepUpReason: stepUp.reason
  });

  return res.status(202).json({ ok: true, jobId: job.id, resumed: true });
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
