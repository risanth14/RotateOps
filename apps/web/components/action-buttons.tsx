"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type RotationJobStatus = "pending" | "running" | "success" | "failed" | "manual_intervention";

type RotationJobDetail = {
  id: string;
  status: RotationJobStatus;
  failureReason?: string | null;
  integration?: {
    name?: string;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollRotationResult(jobId: string): Promise<{ status: RotationJobStatus; failureReason?: string | null }> {
  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(2000);
    const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Unable to read rotation status (${response.status})`);
    }

    const job = (await response.json()) as RotationJobDetail;
    if (job.status === "success" || job.status === "failed" || job.status === "manual_intervention") {
      return {
        status: job.status,
        failureReason: job.failureReason
      };
    }
  }

  return {
    status: "running",
    failureReason: "Rotation is still in progress. Check the Jobs page for final status."
  };
}

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

export function RotateNowButton({ integrationId }: Readonly<{ integrationId: string }>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Rotation Update");
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
              const response = await fetch(`${API_BASE}/integrations/${integrationId}/rotate-now`, { method: "POST" });
              if (!response.ok) {
                throw new Error(`API error (${response.status})`);
              }

              const createdJob = (await response.json()) as { id?: string };
              const jobId = createdJob.id;
              setDialogTitle("Rotation Started");
              setDialogLines([
                "Rotation request accepted.",
                jobId ? `Job: ${jobId}` : "Job has been queued.",
                "Checking status..."
              ]);
              setDialogOpen(true);

              if (jobId) {
                const result = await pollRotationResult(jobId);
                if (result.status === "success") {
                  setDialogTitle("Rotation Successful");
                  setDialogLines(["Credential rotation completed successfully.", `Job: ${jobId}`]);
                } else if (result.status === "running") {
                  setDialogTitle("Rotation In Progress");
                  setDialogLines([result.failureReason ?? "Rotation is still running.", `Job: ${jobId}`]);
                } else {
                  setDialogTitle("Rotation Needs Attention");
                  setDialogLines([
                    result.failureReason ?? "Rotation did not complete successfully.",
                    `Job: ${jobId}`,
                    "Open Jobs for details."
                  ]);
                }
              }

              router.refresh();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Request failed";
              setError(message);
              setDialogTitle("Rotation Failed to Start");
              setDialogLines([message]);
              setDialogOpen(true);
            }
          });
        }}
        className="rounded-lg bg-slateBlue px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Starting..." : "Rotate Now"}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      <Popup open={dialogOpen} title={dialogTitle} lines={dialogLines} onClose={() => setDialogOpen(false)} />
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
