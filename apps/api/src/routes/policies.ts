import dayjs from "dayjs";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const createSchema = z.object({
  integrationId: z.string().min(1),
  intervalDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  enabled: z.boolean().default(true)
});

export const policiesRouter = Router();

policiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const items = await prisma.rotationPolicy.findMany({
    where: {
      integration: {
        organizationId: auth.organizationId
      }
    },
    include: {
      integration: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(items);
  })
);

policiesRouter.post(
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

  const upserted = await prisma.rotationPolicy.upsert({
    where: { integrationId: parsed.data.integrationId },
    update: {
      intervalDays: parsed.data.intervalDays,
      enabled: parsed.data.enabled,
      nextRunAt: dayjs().add(parsed.data.intervalDays, "day").toDate()
    },
    create: {
      integrationId: parsed.data.integrationId,
      intervalDays: parsed.data.intervalDays,
      enabled: parsed.data.enabled,
      nextRunAt: dayjs().add(parsed.data.intervalDays, "day").toDate()
    }
  });

  return res.status(201).json(upserted);
  })
);
