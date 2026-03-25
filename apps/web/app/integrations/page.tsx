import Link from "next/link";
import { RotateNowButton, SeedDemoButton } from "../../components/action-buttons";
import { StatusBadge } from "../../components/status-badge";
import { api } from "../../lib/api";

function modeTone(mode: string) {
  return mode === "demo" ? "warning" : "neutral";
}

export default async function IntegrationsPage() {
  const integrations = await api.getIntegrations();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="subtext">Connected providers and their credential health.</p>
        </div>
        <SeedDemoButton />
      </div>

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Last Rotation</th>
              <th className="px-4 py-3">Next Rotation</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/integrations/${item.id}`} className="hover:text-slateBlue hover:underline">
                    {item.name}
                  </Link>
                </td>
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
                <td className="px-4 py-3">
                  <Link
                    href={`/integrations/${item.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slateBlue hover:text-slateBlue"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
