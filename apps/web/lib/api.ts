const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const UI_DEMO_MODE = process.env.NEXT_PUBLIC_UI_DEMO_MODE === "true";

const mockIntegrations = [
  {
    id: "demo-gh",
    name: "GitHub Actions PAT",
    provider: "github",
    mode: "demo",
    status: "active",
    lastRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    policy: {
      nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString()
    }
  },
  {
    id: "demo-vercel",
    name: "Vercel Deployment Token",
    provider: "vercel",
    mode: "demo",
    status: "active",
    lastRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    policy: {
      nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString()
    }
  },
  {
    id: "demo-stripe",
    name: "Stripe Restricted Key",
    provider: "stripe",
    mode: "demo",
    status: "paused",
    lastRotatedAt: null,
    policy: {
      nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    }
  }
];

const mockPolicies = [
  {
    id: "pol-1",
    integration: { name: "GitHub Actions PAT" },
    intervalDays: 30,
    enabled: true,
    nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "pol-2",
    integration: { name: "Vercel Deployment Token" },
    intervalDays: 60,
    enabled: true,
    nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockJobs = [
  {
    id: "job-101",
    integration: { name: "GitHub Actions PAT" },
    status: "success",
    triggeredBy: "scheduler",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 5 + 1000 * 50).toISOString(),
    aiSummary: "Rotation completed with verified propagation before revocation.",
    failureReason: null
  },
  {
    id: "job-102",
    integration: { name: "Stripe Restricted Key" },
    status: "manual_intervention",
    triggeredBy: "manual",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 26 + 1000 * 35).toISOString(),
    aiSummary: null,
    failureReason: "Verification failed. Old credential preserved."
  }
];

const mockAuditEvents = [
  {
    id: "ev-1",
    jobId: "job-101",
    eventType: "rotation_started",
    message: "Rotation started for GitHub Actions PAT.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: "ev-2",
    jobId: "job-101",
    eventType: "verification_succeeded",
    message: "Smoke-check confirmed downstream systems accepted the new credential.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5 + 1000 * 30).toISOString()
  },
  {
    id: "ev-3",
    jobId: "job-102",
    eventType: "verification_failed",
    message: "Verification failed on one or more targets.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26 + 1000 * 20).toISOString()
  }
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (UI_DEMO_MODE) {
    return getMock(path) as T;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API error (${response.status})`);
  }

  return response.json() as Promise<T>;
}

function getMock(path: string) {
  if (path === "/integrations") return mockIntegrations;
  if (path === "/policies") return mockPolicies;
  if (path === "/jobs") return mockJobs;
  if (path === "/audit-events") return mockAuditEvents;
  return [];
}

async function requestWithFallback<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch {
    return fallback;
  }
}

export const api = {
  getIntegrations: () => requestWithFallback<any[]>("/integrations", mockIntegrations),
  getPolicies: () => requestWithFallback<any[]>("/policies", mockPolicies),
  getJobs: () => requestWithFallback<any[]>("/jobs", mockJobs),
  getAuditEvents: () => requestWithFallback<any[]>("/audit-events", mockAuditEvents)
};
