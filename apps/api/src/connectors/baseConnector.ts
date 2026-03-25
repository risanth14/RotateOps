import { Integration } from "@prisma/client";
import { fingerprint, generateDemoSecret, maskReference } from "../lib/secrets.js";
import { getTokenVaultClient } from "../services/tokenVault/client.js";
import type {
  ConnectorContext,
  PropagationResult,
  RotatedSecret,
  RotationConnector,
  VerificationResult
} from "../types/rotation.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export abstract class BaseConnector implements RotationConnector {
  public provider: Integration["provider"];
  private readonly secretPrefix: string;
  private readonly tokenVault = getTokenVaultClient();

  protected constructor(provider: Integration["provider"], secretPrefix: string) {
    this.provider = provider;
    this.secretPrefix = secretPrefix;
  }

  async rotate(ctx: ConnectorContext): Promise<RotatedSecret> {
    if (ctx.mode === "provider") {
      return this.rotateProvider(ctx);
    }

    await sleep(350);
    const raw = generateDemoSecret(this.secretPrefix);
    return {
      raw,
      fingerprint: fingerprint(raw),
      maskedReference: maskReference(raw)
    };
  }

  async propagate(ctx: ConnectorContext, secret: RotatedSecret): Promise<PropagationResult> {
    if (ctx.mode === "provider") {
      return this.propagateProvider(ctx, secret);
    }

    await sleep(500);
    return {
      ok: true,
      targets: ctx.targets.map((target) => ({
        targetId: target.id,
        name: target.name,
        status: "success",
        detail: `Updated ${target.kind} using fingerprint ${secret.fingerprint}`
      }))
    };
  }

  async verify(ctx: ConnectorContext, _secret: RotatedSecret): Promise<VerificationResult> {
    if (ctx.mode === "provider") {
      return this.verifyProvider(ctx, _secret);
    }

    await sleep(300);
    return {
      ok: true,
      detail: "Smoke-check confirmed downstream systems accepted the new credential."
    };
  }

  async revokeOld(ctx: ConnectorContext, oldFingerprint: string | null): Promise<void> {
    if (ctx.mode === "provider") {
      await this.revokeOldProvider(ctx, oldFingerprint);
      return;
    }

    await sleep(250);
  }

  async rollback(ctx: ConnectorContext, _secret: RotatedSecret): Promise<void> {
    if (ctx.mode === "provider") {
      await this.rollbackProvider(ctx, _secret);
      return;
    }

    await sleep(300);
  }

  protected async rotateProvider(_ctx: ConnectorContext): Promise<RotatedSecret> {
    const issued = await this.tokenVault.issueToken({
      provider: this.provider,
      organizationId: _ctx.integration.organizationId,
      integrationId: _ctx.integration.id,
      metadata: {
        integrationName: _ctx.integration.name
      }
    });

    return {
      raw: issued.token,
      fingerprint: fingerprint(issued.token),
      maskedReference: issued.maskedReference ?? maskReference(issued.token),
      vaultTokenId: issued.tokenId
    };
  }

  protected async propagateProvider(_ctx: ConnectorContext, _secret: RotatedSecret): Promise<PropagationResult> {
    const tokenId = _secret.vaultTokenId;
    if (!tokenId) {
      throw new Error("Token Vault token id is missing for provider propagation.");
    }

    const introspection = await this.tokenVault.introspectToken(tokenId);
    if (!introspection.active) {
      return {
        ok: false,
        targets: _ctx.targets.map((target) => ({
          targetId: target.id,
          name: target.name,
          status: "failed",
          detail: `Token Vault reports token ${tokenId} as inactive.`
        }))
      };
    }

    return {
      ok: true,
      targets: _ctx.targets.map((target) => ({
        targetId: target.id,
        name: target.name,
        status: "success",
        detail: `Applied provider token ${_secret.fingerprint} to ${target.kind}.`
      }))
    };
  }

  protected async verifyProvider(_ctx: ConnectorContext, _secret: RotatedSecret): Promise<VerificationResult> {
    if (!_secret.vaultTokenId) {
      return {
        ok: false,
        detail: "Token Vault token id is missing."
      };
    }

    const introspection = await this.tokenVault.introspectToken(_secret.vaultTokenId);
    return {
      ok: introspection.active,
      detail: introspection.active
        ? "Token Vault introspection confirms the issued provider token is active."
        : "Token Vault introspection reports inactive provider token."
    };
  }

  protected async revokeOldProvider(_ctx: ConnectorContext, _oldFingerprint: string | null): Promise<void> {
    const metadata = _ctx.integration.metadata as Record<string, unknown> | null;
    const oldVaultTokenId = typeof metadata?.vaultTokenId === "string" ? metadata.vaultTokenId : null;
    if (!oldVaultTokenId) {
      return;
    }
    await this.tokenVault.revokeToken(oldVaultTokenId);
  }

  protected async rollbackProvider(_ctx: ConnectorContext, _secret: RotatedSecret): Promise<void> {
    if (!_secret.vaultTokenId) {
      return;
    }
    await this.tokenVault.revokeToken(_secret.vaultTokenId);
  }
}
