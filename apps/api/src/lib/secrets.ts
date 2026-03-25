import crypto from "node:crypto";

export function maskReference(secret: string): string {
  if (secret.length < 6) {
    return "******";
  }

  return `${secret.slice(0, 2)}****${secret.slice(-2)}`;
}

export function fingerprint(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

export function generateDemoSecret(prefix: string): string {
  const rand = crypto.randomBytes(6).toString("hex");
  return `${prefix}_${rand}`;
}
