"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function RevokeConsentButton({
  integrationId,
  consentGrantId,
  disabled
}: {
  integrationId: string;
  consentGrantId: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        disabled={isPending || disabled}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            try {
              const response = await fetch(
                `${API_BASE}/integrations/${integrationId}/consent/${consentGrantId}`,
                { method: "DELETE" }
              );
              if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error((body as { error?: string }).error ?? `API error (${response.status})`);
              }
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Request failed");
            }
          });
        }}
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Revoking..." : "Revoke"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </span>
  );
}

export function ReauthorizeButton({
  integrationId,
  provider
}: {
  integrationId: string;
  provider: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [callbackState, setCallbackState] = useState<string | null>(null);
  const router = useRouter();

  if (callbackState) {
    return (
      <span className="inline-flex flex-col gap-2">
        <span className="text-xs text-slate-500">
          OAuth initiated — in a real integration this would redirect to {provider}. Simulating callback…
        </span>
        <button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              try {
                const response = await fetch(
                  `${API_BASE}/integrations/${integrationId}/consent/callback?state=${callbackState}&code=demo_code`,
                  { method: "GET" }
                );
                if (!response.ok) {
                  const body = await response.json().catch(() => ({}));
                  throw new Error((body as { error?: string }).error ?? `API error (${response.status})`);
                }
                setCallbackState(null);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed");
              }
            });
          }}
          className="w-fit rounded-lg bg-slateBlue px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Completing..." : "Complete Demo Callback"}
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            try {
              const defaultScopes: Record<string, string[]> = {
                github: ["repo", "workflow"],
                vercel: ["deployments:read", "deployments:write"],
                stripe: ["read_write"]
              };
              const body = {
                scopes: defaultScopes[provider] ?? ["read"],
                grantedBy: "admin@rotateops",
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString()
              };
              const response = await fetch(`${API_BASE}/integrations/${integrationId}/consent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
              });
              if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error((errBody as { error?: string }).error ?? `API error (${response.status})`);
              }
              const grant = await response.json();
              // Surface the state so the user can complete the simulated OAuth round-trip
              setCallbackState(grant.callbackState as string);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Request failed");
            }
          });
        }}
        className="rounded-lg bg-slateBlue px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Initiating..." : "Re-authorize"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </span>
  );
}
