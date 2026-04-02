import { IntegrationMode, IntegrationStatus, Provider } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { createRotationJob, runRotationJob } from "../services/rotationService.js";
import { assessStepUpFromToken } from "../services/stepUpService.js";

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
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const items = await prisma.integration.findMany({
    where: {
      organizationId: auth.organizationId
    },
    include: {
      policy: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(items);
  })
);

integrationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const item = await prisma.integration.findFirst({
    where: {
      id: req.params.id,
      organizationId: auth.organizationId
    },
    include: {
      policy: true
    }
  });

  if (!item) {
    return res.status(404).json({ error: "Integration not found." });
  }

  return res.json(item);
  })
);

integrationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const created = await prisma.integration.create({
    data: {
      organizationId: auth.organizationId,
      createdByUserId: auth.userId,
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
  const auth = requireAuth(req);
  const integration = await prisma.integration.findFirst({
    where: {
      id: req.params.id,
      organizationId: auth.organizationId
    },
    include: { policy: true }
  });

  if (!integration) {
    return res.status(404).json({ error: "Integration not found." });
  }

  const actor = (req.headers["x-actor"] as string) || null;
  const consentGrantId = (req.body as { consentGrantId?: string }).consentGrantId || null;
  const stepUp = assessStepUpFromToken(auth.token, env.STEP_UP_MAX_AGE_SECONDS);

  const job = await createRotationJob({
    integrationId: integration.id,
    policyId: integration.policy?.id ?? null,
    triggeredBy: "manual",
    organizationId: auth.organizationId,
    actor: actor ?? auth.auth0UserId,
    consentGrantId
  });

  void runRotationJob(job.id, {
    stepUpSatisfied: stepUp.satisfied,
    stepUpMethod: stepUp.method,
    stepUpReason: stepUp.reason
  });

  return res.status(202).json(job);
  })
);
