import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { createRotationJob, runRotationJob } from "../services/rotationService.js";

const createSchema = z.object({
  integrationId: z.string().min(1),
  policyId: z.string().optional(),
  triggeredBy: z.enum(["manual", "scheduler", "api"]).default("api")
});

export const jobsRouter = Router();

jobsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
  const jobs = await prisma.rotationJob.findMany({
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
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job = await createRotationJob(parsed.data);
  return res.status(201).json(job);
  })
);

jobsRouter.post(
  "/:id/run",
  asyncHandler(async (req, res) => {
  const job = await prisma.rotationJob.findUnique({
    where: { id: req.params.id }
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
  const job = await prisma.rotationJob.findUnique({
    where: { id: req.params.id },
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
