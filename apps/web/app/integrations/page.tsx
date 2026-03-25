import { RotateNowButton, SeedDemoButton } from "../../components/action-buttons";
import { StatusBadge } from "../../components/status-badge";
import { api } from "../../lib/api";

function modeTone(mode: string) {
  return mode === "demo" ? "warning" : "neutral";
}

export default async function IntegrationsPage() {
  const integrations = await api.getIntegrations();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-slate-600">Connected providers and their credential health.</p>
        </div>
        <SeedDemoButton />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Last Rotation</th>
              <th className="px-4 py-3">Next Rotation</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 capitalize">{item.provider}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={item.status}
                    tone={item.status === "active" ? "success" : item.status === "paused" ? "warning" : "error"}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge label={item.mode} tone={modeTone(item.mode)} />
                </td>
                <td className="px-4 py-3">{item.lastRotatedAt ? new Date(item.lastRotatedAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-3">{item.policy?.nextRunAt ? new Date(item.policy.nextRunAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-3">
                  <RotateNowButton integrationId={item.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
