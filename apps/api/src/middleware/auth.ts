import type { JWTPayload } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request, RequestHandler } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export interface AuthContext {
  organizationId: string;
  auth0OrgId: string;
  userId: string;
  auth0UserId: string;
  token: JWTPayload;
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const issuer = `https://${env.AUTH0_DOMAIN}/`;
const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

function getBearerToken(value?: string): string | null {
  if (!value) {
    return null;
  }
  const [scheme, token] = value.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

function getStringClaim(payload: JWTPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

async function syncUserAndOrganization(payload: JWTPayload): Promise<AuthContext | null> {
  const auth0UserId = typeof payload.sub === "string" ? payload.sub : null;
  const auth0OrgId = getStringClaim(payload, env.AUTH0_ORG_CLAIM) ?? getStringClaim(payload, "org_id");

  if (!auth0UserId || !auth0OrgId) {
    return null;
  }

  const email = getStringClaim(payload, "email");
  const name = getStringClaim(payload, "name");
  const orgName = getStringClaim(payload, "org_name");

  const user = await prisma.user.upsert({
    where: { auth0UserId },
    update: {
      email: email ?? undefined,
      name: name ?? undefined
    },
    create: {
      auth0UserId,
      email: email ?? undefined,
      name: name ?? undefined
    }
  });

  const organization = await prisma.organization.upsert({
    where: { auth0OrgId },
    update: {
      name: orgName ?? undefined
    },
    create: {
      auth0OrgId,
      name: orgName ?? undefined
    }
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id
    }
  });

  return {
    organizationId: organization.id,
    auth0OrgId,
    userId: user.id,
    auth0UserId,
    token: payload
  };
}

async function getLocalDemoAuthContext(): Promise<AuthContext> {
  const user = await prisma.user.upsert({
    where: { auth0UserId: "dev|local-user" },
    update: { name: "Local Demo User" },
    create: {
      auth0UserId: "dev|local-user",
      name: "Local Demo User",
      email: "local-demo@rotateops.dev"
    }
  });

  const organization = await prisma.organization.upsert({
    where: { auth0OrgId: "org_local_demo" },
    update: { name: "Local Demo Organization" },
    create: {
      auth0OrgId: "org_local_demo",
      name: "Local Demo Organization"
    }
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "owner"
    }
  });

  return {
    organizationId: organization.id,
    auth0OrgId: organization.auth0OrgId,
    userId: user.id,
    auth0UserId: user.auth0UserId,
    token: {
      sub: user.auth0UserId,
      org_id: organization.auth0OrgId
    }
  };
}

export const authMiddleware: RequestHandler = asyncHandler(async (req, res, next) => {
  if (env.AUTH_BYPASS_DEMO && env.NODE_ENV !== "production" && env.APP_MODE === "demo") {
    req.auth = await getLocalDemoAuthContext();
    return next();
  }

  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const verified = await jwtVerify(token, jwks, {
      issuer,
      audience: env.AUTH0_AUDIENCE
    });

    const context = await syncUserAndOrganization(verified.payload);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.auth = context;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export function requireAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}
