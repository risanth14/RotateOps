import { IntegrationMode, IntegrationStatus, Provider } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { createRotationJob, runRotationJob } from "../services/rotationService.js";

const createSchema = z.object({
  provider: z.nativeEnum(Provider),
  name: z.string().min(2),
  mode: z.nativeEnum(IntegrationMode).default("demo"),
  status: z.nativeEnum(IntegrationStatus).default("active"),
  metadata: z.record(z.string()).optional()
});

export const integrationsRouter = Router();

integrationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
  const items = await prisma.integration.findMany({
    include: {
      policy: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(items);
  })
);

integrationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const created = await prisma.integration.create({
    data: {
      provider: parsed.data.provider,
      name: parsed.data.name,
      mode: parsed.data.mode,
      status: parsed.data.status,
      metadata: parsed.data.metadata
    }
  });

  return res.status(201).json(created);
  })
);

integrationsRouter.post(
  "/:id/rotate-now",
  asyncHandler(async (req, res) => {
  const integration = await prisma.integration.findUnique({
    where: { id: req.params.id },
    include: { policy: true }
  });

  if (!integration) {
    return res.status(404).json({ error: "Integration not found." });
  }

  const actor = (req.headers["x-actor"] as string) || null;
  const consentGrantId = (req.body as { consentGrantId?: string }).consentGrantId || null;

  const job = await createRotationJob({
    integrationId: integration.id,
    policyId: integration.policy?.id ?? null,
    triggeredBy: "manual",
    actor,
    consentGrantId
  });

  void runRotationJob(job.id);

  return res.status(202).json(job);
  })
);
