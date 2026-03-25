"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function Popup({
  open,
  title,
  lines,
  onClose
}: {
  open: boolean;
  title: string;
  lines: string[];
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-slate-950/35 p-4 pt-20">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 rounded-lg bg-slateBlue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Seed Complete");
  const [dialogLines, setDialogLines] = useState<string[]>([]);
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

              const result = (await response.json()) as {
                ok?: boolean;
                integrations?: number;
                policies?: number;
                targets?: number;
              };
              setDialogTitle(result.ok ? "Demo Data Seeded" : "Seed Request Finished");
              setDialogLines([
                `Integrations: ${result.integrations ?? "n/a"}`,
                `Policies: ${result.policies ?? "n/a"}`,
                `Targets: ${result.targets ?? "n/a"}`
              ]);
              setDialogOpen(true);
              router.refresh();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Request failed";
              setError(message);
              setDialogTitle("Seed Failed");
              setDialogLines([message]);
              setDialogOpen(true);
            }
          });
        }}
        className="rounded-lg bg-sunrise px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Seeding..." : "Seed Demo Integrations"}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      <Popup open={dialogOpen} title={dialogTitle} lines={dialogLines} onClose={() => setDialogOpen(false)} />
    </>
  );
}
