import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const auditEventsRouter = Router();

auditEventsRouter.get("/", async (_req, res) => {
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 250
  });

  res.json(events);
});
