import { Provider } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { createAuditEvent } from "../services/auditService.js";

const grantSchema = z.object({
  scopes: z.array(z.string().min(1)).min(1),
  grantedBy: z.string().min(1),
  expiresAt: z.string().datetime().optional()
});

export const consentRouter = Router({ mergeParams: true });

// GET /integrations/:id/consent — list all grants for an integration
consentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    const grants = await prisma.consentGrant.findMany({
      where: { integrationId: req.params.id },
      orderBy: { createdAt: "desc" }
    });

    return res.json(grants);
  })
);

// POST /integrations/:id/consent — create a consent grant
consentRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    const parsed = grantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // Generate a CSRF state token for the OAuth callback flow
    const { randomBytes } = await import("crypto");
    const callbackState = randomBytes(16).toString("hex");

    const grant = await prisma.consentGrant.create({
      data: {
        integrationId: integration.id,
        provider: integration.provider as Provider,
        scopes: parsed.data.scopes,
        grantedBy: parsed.data.grantedBy,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        callbackState
      }
    });

    await createAuditEvent({
      integrationId: integration.id,
      eventType: "consent_granted",
      message: `Consent granted by ${grant.grantedBy} for scopes: ${grant.scopes.join(", ")}.`,
      actor: grant.grantedBy,
      consentGrantId: grant.id,
      initiatorId: grant.grantedBy,
      initiatorType: "user",
      authorizationType: "consent_grant",
      agentContext: {
        agentId: "consent-api",
        executionPath: "consent_route_create",
        triggerSource: "api",
        runMode: "interactive"
      },
      metadata: {
        scopes: grant.scopes,
        expiresAt: grant.expiresAt?.toISOString() ?? null
      }
    });

    return res.status(201).json(grant);
  })
);

// GET /integrations/:id/consent/callback — OAuth callback handler (demo: validates state, marks grant active)
consentRouter.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const { state, code } = req.query as { state?: string; code?: string };

    if (!state) {
      return res.status(400).json({ error: "Missing state parameter." });
    }

    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    // Find the pending grant matching this state token
    const grant = await prisma.consentGrant.findFirst({
      where: {
        integrationId: req.params.id,
        callbackState: state,
        revokedAt: null
      }
    });

    if (!grant) {
      return res.status(400).json({ error: "Invalid or expired state token." });
    }

    // In demo mode the "code" is cosmetic; in provider mode this would exchange it for tokens.
    // Clear the callbackState to signal that the OAuth round-trip is complete.
    const updated = await prisma.consentGrant.update({
      where: { id: grant.id },
      data: { callbackState: null }
    });

    await createAuditEvent({
      integrationId: integration.id,
      eventType: "consent_callback_completed",
      message: `OAuth callback completed for consent grant ${grant.id}.`,
      actor: grant.grantedBy,
      consentGrantId: grant.id,
      initiatorId: grant.grantedBy,
      initiatorType: "user",
      authorizationType: "consent_grant",
      agentContext: {
        agentId: "consent-api",
        executionPath: "consent_callback",
        triggerSource: "oauth_callback",
        runMode: "interactive"
      },
      metadata: {
        code: code ? `${code.slice(0, 4)}****` : "none",
        provider: integration.provider
      }
    });

    return res.json({ ok: true, grant: updated });
  })
);

// DELETE /integrations/:id/consent/:consentId — revoke a specific consent grant
consentRouter.delete(
  "/:consentId",
  asyncHandler(async (req, res) => {
    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: "Integration not found." });
    }

    const grant = await prisma.consentGrant.findFirst({
      where: {
        id: req.params.consentId,
        integrationId: req.params.id
      }
    });

    if (!grant) {
      return res.status(404).json({ error: "Consent grant not found." });
    }

    if (grant.revokedAt) {
      return res.status(409).json({ error: "Consent grant is already revoked." });
    }

    const revoked = await prisma.consentGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() }
    });

    const actor = (req.headers["x-actor"] as string) || grant.grantedBy;

    await createAuditEvent({
      integrationId: integration.id,
      eventType: "consent_revoked",
      message: `Consent grant ${grant.id} revoked by ${actor}.`,
      actor,
      consentGrantId: grant.id,
      initiatorId: actor,
      initiatorType: "user",
      authorizationType: "consent_grant",
      agentContext: {
        agentId: "consent-api",
        executionPath: "consent_revoke",
        triggerSource: "api",
        runMode: "interactive"
      },
      metadata: {
        scopes: grant.scopes,
        originalGrantedBy: grant.grantedBy
      }
    });

    return res.json(revoked);
  })
);
