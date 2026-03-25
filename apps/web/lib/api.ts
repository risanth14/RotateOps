const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export const api = {
  getIntegrations: () => request<any[]>("/integrations"),
  getPolicies: () => request<any[]>("/policies"),
  getJobs: () => request<any[]>("/jobs"),
  getAuditEvents: () => request<any[]>("/audit-events")
};
