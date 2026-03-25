import dayjs from "dayjs";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const seedDemoRouter = Router();

const demoIntegrations = [
  {
    provider: "github" as const,
    name: "GitHub Actions PAT",
    metadata: { accountHint: "org:rotateops-demo" }
  },
  {
    provider: "vercel" as const,
    name: "Vercel Deployment Token",
    metadata: { accountHint: "team:rotateops" }
  },
  {
    provider: "stripe" as const,
    name: "Stripe Restricted Key",
    metadata: { accountHint: "acct_demo1234" }
  }
];

seedDemoRouter.post(
  "/",
  asyncHandler(async (_req, res) => {
  for (const item of demoIntegrations) {
    const existing = await prisma.integration.findFirst({
      where: {
        name: item.name
      }
    });

    if (existing) {
      continue;
    }

    const integration = await prisma.integration.create({
      data: {
        provider: item.provider,
        name: item.name,
        mode: "demo",
        status: "active",
        metadata: item.metadata
      }
    });

    await prisma.rotationPolicy.create({
      data: {
        integrationId: integration.id,
        intervalDays: 30,
        enabled: true,
        nextRunAt: dayjs().add(7, "minute").toDate()
      }
    });

    await prisma.secretTarget.createMany({
      data: [
        {
          integrationId: integration.id,
          name: "Kubernetes Secret",
          kind: "k8s",
          config: {
            namespace: "prod",
            secretName: `${integration.provider}-credentials`
          }
        },
        {
          integrationId: integration.id,
          name: "Runtime Env Var",
          kind: "runtime_env",
          config: {
            service: "api",
            variable: "THIRD_PARTY_TOKEN"
          }
        }
      ]
    });
  }

  const counts = await Promise.all([
    prisma.integration.count(),
    prisma.rotationPolicy.count(),
    prisma.secretTarget.count()
  ]);

  return res.json({
    ok: true,
    integrations: counts[0],
    policies: counts[1],
    targets: counts[2]
  });
  })
);
