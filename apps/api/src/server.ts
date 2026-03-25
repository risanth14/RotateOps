import { env } from "./config/env.js";
import { startScheduler } from "./jobs/scheduler.js";
import { prisma } from "./lib/prisma.js";
import { buildApp } from "./app.js";

const app = buildApp();

async function main() {
  await prisma.$connect();
  startScheduler();
  app.listen(env.PORT, () => {
    console.log(`RotateOps API running on http://localhost:${env.PORT}`);
  });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
