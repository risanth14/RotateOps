import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const auditEventsRouter = Router();

auditEventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
  const auth = requireAuth(req);
  const events = await prisma.auditEvent.findMany({
    where: {
      integration: {
        organizationId: auth.organizationId
      }
    },
    orderBy: { createdAt: "desc" },
    take: 250
  });

  res.json(events);
  })
);
