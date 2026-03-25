export type Provider = "github" | "vercel" | "stripe";
export type IntegrationMode = "demo" | "provider";
export type IntegrationStatus = "active" | "paused" | "error";
export type JobStatus = "pending" | "running" | "success" | "failed" | "manual_intervention";
export type PolicyIntervalDays = 30 | 60 | 90;

export interface IntegrationMetadata {
  accountHint?: string;
  notes?: string;
  providerConfig?: Record<string, string>;
}

export interface SecretTargetShape {
  id: string;
  name: string;
  kind: string;
  config: Record<string, string>;
}

export interface IntegrationShape {
  id: string;
  organizationId: string;
  name: string;
  provider: Provider;
  mode: IntegrationMode;
  status: IntegrationStatus;
  metadata: IntegrationMetadata | null;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RotationPolicyShape {
  id: string;
  integrationId: string;
  intervalDays: PolicyIntervalDays;
  enabled: boolean;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RotationJobShape {
  id: string;
  integrationId: string;
  policyId: string | null;
  triggeredBy: string;
  status: JobStatus;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEventShape {
  id: string;
  jobId: string;
  integrationId: string;
  eventType: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
