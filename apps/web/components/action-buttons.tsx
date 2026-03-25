"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function RotateNowButton({ integrationId }: { integrationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            try {
              const response = await fetch(`${API_BASE}/integrations/${integrationId}/rotate-now`, { method: "POST" });
              if (!response.ok) {
                throw new Error(`API error (${response.status})`);
              }
              router.refresh();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Request failed";
              setError(message);
            }
          });
        }}
        className="rounded-lg bg-slateBlue px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Starting..." : "Rotate Now"}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </>
  );
}

export function SeedDemoButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            try {
              const response = await fetch(`${API_BASE}/seed-demo`, { method: "POST" });
              if (!response.ok) {
                throw new Error(`API error (${response.status})`);
              }
              router.refresh();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Request failed";
              setError(message);
            }
          });
        }}
        className="rounded-lg bg-sunrise px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Seeding..." : "Seed Demo Integrations"}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </>
  );
}
