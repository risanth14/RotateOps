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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slateBlue via-slate-800 to-slate-700 p-6 text-white shadow-lg md:p-7">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-sky-200/10 blur-2xl" />
        <h1 className="text-2xl font-semibold md:text-3xl">RotateOps Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-100">
          Deterministic rotation orchestration with auditability and verification-gated revocation.
        </p>
        <div className="mt-5">
          <SeedDemoButton />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Integrations</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{integrations.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Successful Jobs</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{successfulJobs}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Attention Needed</p>
          <p className="mt-1 text-3xl font-bold text-rose-700">{failedJobs}</p>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Jobs</h2>
        <div className="space-y-2">
          {jobs.slice(0, 5).map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 p-3">
              <div>
                <p className="font-medium text-slate-900">{job.integration.name}</p>
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

      <section className="panel p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Latest Audit Events</h2>
        <ul className="space-y-2 text-sm">
          {events.slice(0, 8).map((event) => (
            <li key={event.id} className="rounded-xl border border-slate-200/70 bg-white/80 p-3">
              <p className="font-medium text-slate-900">{event.eventType}</p>
              <p className="text-slate-700">{event.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
