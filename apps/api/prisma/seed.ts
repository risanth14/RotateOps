import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.integration.count();
  if (count > 0) {
    console.log("Seed skipped: integrations already exist.");
    return;
  }

  const providers = [
    { provider: "github" as const, name: "GitHub Actions PAT", accountHint: "org:rotateops-demo" },
    { provider: "vercel" as const, name: "Vercel Deployment Token", accountHint: "team:rotateops" },
    { provider: "stripe" as const, name: "Stripe Restricted Key", accountHint: "acct_demo1234" }
  ];

  for (const item of providers) {
    const integration = await prisma.integration.create({
      data: {
        provider: item.provider,
        name: item.name,
        mode: "demo",
        status: "active",
        metadata: {
          accountHint: item.accountHint
        }
      }
    });

    await prisma.rotationPolicy.create({
      data: {
        integrationId: integration.id,
        intervalDays: 30,
        enabled: true,
        nextRunAt: dayjs().add(1, "day").toDate()
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
            secretName: `${item.provider}-credentials`
          }
        },
        {
          integrationId: integration.id,
          name: "Runtime Env Var",
          kind: "runtime_env",
          config: {
            service: "worker",
            variable: "API_TOKEN"
          }
        }
      ]
    });
  }

  console.log("Demo data seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
