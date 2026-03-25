"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function RotateNowButton({ integrationId }: { integrationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch(`${API_BASE}/integrations/${integrationId}/rotate-now`, { method: "POST" });
          router.refresh();
        });
      }}
      className="rounded-lg bg-slateBlue px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {isPending ? "Starting..." : "Rotate Now"}
    </button>
  );
}

export function SeedDemoButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch(`${API_BASE}/seed-demo`, { method: "POST" });
          router.refresh();
        });
      }}
      className="rounded-lg bg-sunrise px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {isPending ? "Seeding..." : "Seed Demo Integrations"}
    </button>
  );
}
