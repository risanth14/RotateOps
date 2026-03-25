import { api } from "../../lib/api";
import { StatusBadge } from "../../components/status-badge";

export default async function JobsPage() {
  const jobs = await api.getJobs();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Rotation Jobs</h1>
        <p className="text-sm text-slate-600">Execution history with verification and revocation outcomes.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-4 py-3">Job ID</th>
              <th className="px-4 py-3">Integration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Triggered By</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{job.id.slice(0, 12)}</td>
                <td className="px-4 py-3">{job.integration.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={job.status}
                    tone={job.status === "success" ? "success" : job.status === "running" ? "warning" : "error"}
                  />
                </td>
                <td className="px-4 py-3">{job.triggeredBy}</td>
                <td className="px-4 py-3">{job.startedAt ? new Date(job.startedAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-3">{job.completedAt ? new Date(job.completedAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-3">{job.aiSummary || job.failureReason || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
