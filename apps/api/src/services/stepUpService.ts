import type { JWTPayload } from "jose";

const MFA_AMR_VALUES = new Set(["mfa", "otp", "totp", "webauthn", "fido", "hwk", "sms"]);

function getAuthMethods(payload: JWTPayload): string[] {
  const amr = payload.amr;
  if (!Array.isArray(amr)) {
    return [];
  }

  return amr.filter((value): value is string => typeof value === "string").map((value) => value.toLowerCase());
}

function hasStepUpAcr(payload: JWTPayload): boolean {
  const acr = payload.acr;
  if (typeof acr !== "string") {
    return false;
  }
  const normalized = acr.toLowerCase();
  return normalized.includes("mfa") || normalized.includes("multi-factor");
}

export interface StepUpAssessment {
  satisfied: boolean;
  reason: string | null;
  method: string | null;
  authTime: number | null;
}

export function assessStepUpFromToken(payload: JWTPayload, maxAgeSeconds: number): StepUpAssessment {
  const authMethods = getAuthMethods(payload);
  const hasMfaMethod = authMethods.some((method) => MFA_AMR_VALUES.has(method));
  const hasMfaAcr = hasStepUpAcr(payload);
  const hasStepUpSignal = hasMfaMethod || hasMfaAcr;

  const authTime = typeof payload.auth_time === "number" ? payload.auth_time : null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isFresh = authTime !== null && nowSeconds - authTime <= maxAgeSeconds;

  if (!hasStepUpSignal) {
    return {
      satisfied: false,
      reason: "No step-up signal (amr/acr) found on token.",
      method: null,
      authTime
    };
  }

  if (!isFresh) {
    return {
      satisfied: false,
      reason: "Step-up signal is present but too old or missing auth_time.",
      method: hasMfaMethod ? "amr" : "acr",
      authTime
    };
  }

  return {
    satisfied: true,
    reason: null,
    method: hasMfaMethod ? "amr" : "acr",
    authTime
  };
}

