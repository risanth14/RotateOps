import type { Integration } from "@prisma/client";
import type { RotationConnector } from "../types/rotation.js";
import { GitHubConnector } from "./githubConnector.js";
import { StripeConnector } from "./stripeConnector.js";
import { VercelConnector } from "./vercelConnector.js";

const connectorMap: Record<Integration["provider"], RotationConnector> = {
  github: new GitHubConnector(),
  vercel: new VercelConnector(),
  stripe: new StripeConnector()
};

export function getConnector(provider: Integration["provider"]): RotationConnector {
  return connectorMap[provider];
}
