import { api } from "../../lib/api";
import { PolicyIntervalForm } from "../../components/policy-interval-form";
import { StatusBadge } from "../../components/status-badge";

export default async function PoliciesPage() {
  const policies = await api.getPolicies();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Rotation Policies</h1>
        <p className="subtext">30/60/90-day schedules with enable/disable controls.</p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Integration</th>
              <th className="px-4 py-3">Interval</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Next Run</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Change Interval</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{policy.integration.name}</td>
                <td className="px-4 py-3">{policy.intervalDays} days</td>
                <td className="px-4 py-3">
                  <StatusBadge label={policy.enabled ? "enabled" : "disabled"} tone={policy.enabled ? "success" : "warning"} />
                </td>
                <td className="px-4 py-3">{new Date(policy.nextRunAt).toLocaleString()}</td>
                <td className="px-4 py-3">{new Date(policy.updatedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <PolicyIntervalForm
                    integrationId={policy.integrationId}
                    currentInterval={policy.intervalDays}
                    enabled={policy.enabled}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
