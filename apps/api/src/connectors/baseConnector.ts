import { Integration } from "@prisma/client";
import { fingerprint, generateDemoSecret, maskReference } from "../lib/secrets.js";
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
      return this.verifyProvider(ctx);
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
      await this.rollbackProvider(ctx);
      return;
    }

    await sleep(300);
  }

  protected async rotateProvider(_ctx: ConnectorContext): Promise<RotatedSecret> {
    throw new Error("Provider mode rotate() is not fully implemented for this connector yet.");
  }

  protected async propagateProvider(_ctx: ConnectorContext, _secret: RotatedSecret): Promise<PropagationResult> {
    throw new Error("Provider mode propagate() needs provider API credentials and target bindings.");
  }

  protected async verifyProvider(_ctx: ConnectorContext): Promise<VerificationResult> {
    return {
      ok: false,
      detail: "Provider verification stubbed. Configure provider credentials and run integration checks."
    };
  }

  protected async revokeOldProvider(_ctx: ConnectorContext, _oldFingerprint: string | null): Promise<void> {
    throw new Error("Provider mode revokeOld() is intentionally disabled in MVP for safety.");
  }

  protected async rollbackProvider(_ctx: ConnectorContext): Promise<void> {
    throw new Error("Provider mode rollback() is connector-specific and must be completed before production.");
  }
}
