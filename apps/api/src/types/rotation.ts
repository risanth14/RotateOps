import type { Integration, SecretTarget } from "@prisma/client";

export interface RotatedSecret {
  raw: string;
  fingerprint: string;
  maskedReference: string;
}

export interface PropagationResult {
  ok: boolean;
  targets: Array<{
    targetId: string;
    name: string;
    status: "success" | "failed";
    detail: string;
  }>;
}

export interface VerificationResult {
  ok: boolean;
  detail: string;
}

export interface ConnectorContext {
  integration: Integration;
  targets: SecretTarget[];
  mode: "demo" | "provider";
}

export interface RotationConnector {
  provider: Integration["provider"];
  rotate: (ctx: ConnectorContext) => Promise<RotatedSecret>;
  propagate: (ctx: ConnectorContext, secret: RotatedSecret) => Promise<PropagationResult>;
  verify: (ctx: ConnectorContext, secret: RotatedSecret) => Promise<VerificationResult>;
  revokeOld: (ctx: ConnectorContext, oldFingerprint: string | null) => Promise<void>;
  rollback: (ctx: ConnectorContext, secret: RotatedSecret) => Promise<void>;
}
