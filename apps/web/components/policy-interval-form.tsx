"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const INTERVAL_OPTIONS = [30, 60, 90] as const;

export function PolicyIntervalForm({
  integrationId,
  currentInterval,
  enabled
}: {
  integrationId: string;
  currentInterval: number;
  enabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [intervalDays, setIntervalDays] = useState<number>(currentInterval);
  const hasChanged = intervalDays !== currentInterval;

  return (
    <div className="flex items-center gap-2">
      <select
        value={intervalDays}
        onChange={(event) => setIntervalDays(Number(event.target.value))}
        disabled={isPending}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-slateBlue focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option} days
          </option>
        ))}
      </select>

      <button
        disabled={isPending || !hasChanged}
        onClick={() => {
          startTransition(async () => {
            await fetch(`${API_BASE}/policies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ integrationId, intervalDays, enabled })
            });
            router.refresh();
          });
        }}
        className="rounded-lg bg-slateBlue px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
