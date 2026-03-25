import { api } from "../../lib/api";
import { StatusBadge } from "../../components/status-badge";

export default async function PoliciesPage() {
  const policies = await api.getPolicies();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Rotation Policies</h1>
        <p className="text-sm text-slate-600">30/60/90-day schedules with enable/disable controls.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-4 py-3">Integration</th>
              <th className="px-4 py-3">Interval</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Next Run</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{policy.integration.name}</td>
                <td className="px-4 py-3">{policy.intervalDays} days</td>
                <td className="px-4 py-3">
                  <StatusBadge label={policy.enabled ? "enabled" : "disabled"} tone={policy.enabled ? "success" : "warning"} />
                </td>
                <td className="px-4 py-3">{new Date(policy.nextRunAt).toLocaleString()}</td>
                <td className="px-4 py-3">{new Date(policy.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
