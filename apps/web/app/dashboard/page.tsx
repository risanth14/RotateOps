import { api } from "../../lib/api";
import { SeedDemoButton } from "../../components/action-buttons";
import { StatusBadge } from "../../components/status-badge";

export default async function DashboardPage() {
  const [integrations, jobs, events] = await Promise.all([
    api.getIntegrations(),
    api.getJobs(),
    api.getAuditEvents()
  ]);

  const successfulJobs = jobs.filter((job) => job.status === "success").length;
  const failedJobs = jobs.filter((job) => job.status !== "success").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slateBlue to-slate-800 p-6 text-white">
        <h1 className="text-2xl font-semibold">RotateOps Dashboard</h1>
        <p className="mt-2 text-sm text-slate-100">
          Deterministic rotation orchestration with auditability and verification-gated revocation.
        </p>
        <div className="mt-5">
          <SeedDemoButton />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-skywash p-4">
          <p className="text-xs uppercase text-slate-500">Integrations</p>
          <p className="text-2xl font-bold">{integrations.length}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs uppercase text-slate-500">Successful Jobs</p>
          <p className="text-2xl font-bold">{successfulJobs}</p>
        </div>
        <div className="rounded-xl bg-rose-50 p-4">
          <p className="text-xs uppercase text-slate-500">Attention Needed</p>
          <p className="text-2xl font-bold">{failedJobs}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent Jobs</h2>
        <div className="space-y-2">
          {jobs.slice(0, 5).map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <p className="font-medium">{job.integration.name}</p>
                <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
              </div>
              <StatusBadge
                label={job.status}
                tone={job.status === "success" ? "success" : job.status === "running" ? "warning" : "error"}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">Latest Audit Events</h2>
        <ul className="space-y-2 text-sm">
          {events.slice(0, 8).map((event) => (
            <li key={event.id} className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium">{event.eventType}</p>
              <p>{event.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
