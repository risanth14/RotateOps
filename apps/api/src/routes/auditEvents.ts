import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const auditEventsRouter = Router();

auditEventsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 250
  });

  res.json(events);
  })
);
