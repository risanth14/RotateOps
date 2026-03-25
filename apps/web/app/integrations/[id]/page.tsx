import Link from "next/link";
import { notFound } from "next/navigation";
import { ReauthorizeButton, RevokeConsentButton } from "../../../components/consent-actions";
import { StatusBadge } from "../../../components/status-badge";
import { api } from "../../../lib/api";

function expiryStatus(expiresAt: string | null, revokedAt: string | null): "active" | "expiring_soon" | "expired" | "revoked" {
  if (revokedAt) return "revoked";
  if (!expiresAt) return "active";
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return "expired";
  if (msLeft < 1000 * 60 * 60 * 24 * 7) return "expiring_soon";
  return "active";
}

function ExpiryIndicator({ expiresAt, revokedAt }: { expiresAt: string | null; revokedAt: string | null }) {
  const status = expiryStatus(expiresAt, revokedAt);

  if (status === "revoked") {
    return <StatusBadge label="Revoked" tone="error" />;
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <StatusBadge label="Expired" tone="error" />
        <span className="text-xs text-rose-600">{new Date(expiresAt!).toLocaleDateString()}</span>
      </span>
    );
  }
  if (status === "expiring_soon") {
    const daysLeft = Math.ceil((new Date(expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return (
      <span className="inline-flex items-center gap-1.5">
        <StatusBadge label="Expiring soon" tone="warning" />
        <span className="text-xs text-amber-600">{daysLeft}d left</span>
      </span>
    );
  }
  if (!expiresAt) {
    return <StatusBadge label="No expiry" tone="neutral" />;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge label="Active" tone="success" />
      <span className="text-xs text-slate-500">{new Date(expiresAt).toLocaleDateString()}</span>
    </span>
  );
}

function ConsentWarningBanner({ grants }: { grants: any[] }) {
  const active = grants.filter((g) => !g.revokedAt);
  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <strong>No active authorization.</strong> This integration has no valid consent grants. Rotation
        jobs will fail until access is re-authorized.
      </div>
    );
  }

  const expiredCount = active.filter((g) => g.expiresAt && new Date(g.expiresAt) <= new Date()).length;
  const expiringSoonCount = active.filter((g) => {
    if (!g.expiresAt || g.revokedAt) return false;
    const msLeft = new Date(g.expiresAt).getTime() - Date.now();
    return msLeft > 0 && msLeft < 1000 * 60 * 60 * 24 * 7;
  }).length;

  if (expiredCount > 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <strong>{expiredCount} grant{expiredCount > 1 ? "s" : ""} expired.</strong> Re-authorize to restore
        access for automated rotation.
      </div>
    );
  }
  if (expiringSoonCount > 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <strong>{expiringSoonCount} grant{expiringSoonCount > 1 ? "s" : ""} expiring within 7 days.</strong> Re-authorize
        soon to avoid rotation disruptions.
      </div>
    );
  }

  return null;
}

export default async function IntegrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [integration, grants] = await Promise.all([
    api.getIntegration(id),
    api.getConsentGrants(id)
  ]);

  if (!integration) {
    notFound();
  }

  const activeGrants = (grants as any[]).filter((g) => !g.revokedAt);
  const revokedGrants = (grants as any[]).filter((g) => g.revokedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/integrations" className="hover:text-slateBlue">
              Integrations
            </Link>
            <span>/</span>
            <span>{integration.name}</span>
          </div>
          <h1 className="text-2xl font-semibold">{integration.name}</h1>
          <p className="subtext capitalize">{integration.provider} · {integration.mode} mode</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            label={integration.status}
            tone={integration.status === "active" ? "success" : integration.status === "paused" ? "warning" : "error"}
          />
        </div>
      </div>

      {/* Warning banner */}
      <ConsentWarningBanner grants={grants as any[]} />

      {/* Integration metadata */}
      <div className="panel grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Provider</p>
          <p className="mt-1 font-medium capitalize">{integration.provider}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-1">
            <StatusBadge
              label={integration.status}
              tone={integration.status === "active" ? "success" : integration.status === "paused" ? "warning" : "error"}
            />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last Rotation</p>
          <p className="mt-1 text-sm">
            {integration.lastRotatedAt ? new Date(integration.lastRotatedAt).toLocaleString() : "Never"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Next Rotation</p>
          <p className="mt-1 text-sm">
            {integration.policy?.nextRunAt ? new Date(integration.policy.nextRunAt).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Active consent grants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Authorization Grants</h2>
          <ReauthorizeButton integrationId={integration.id} provider={integration.provider} />
        </div>

        {activeGrants.length === 0 ? (
          <div className="panel p-6 text-center text-sm text-slate-500">
            No active grants. Use <strong>Re-authorize</strong> to connect this integration.
          </div>
        ) : (
          <div className="space-y-3">
            {activeGrants.map((grant: any) => {
              const status = expiryStatus(grant.expiresAt, grant.revokedAt);
              return (
                <div
                  key={grant.id}
                  className={`panel p-4 ${
                    status === "expired"
                      ? "border-rose-200 bg-rose-50/40"
                      : status === "expiring_soon"
                      ? "border-amber-200 bg-amber-50/40"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">Granted by</span>
                        <span className="font-mono text-sm">{grant.grantedBy}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(grant.scopes as string[]).map((scope: string) => (
                          <span
                            key={scope}
                            className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Expiry:</span>
                        <ExpiryIndicator expiresAt={grant.expiresAt} revokedAt={grant.revokedAt} />
                      </div>
                      <p className="text-xs text-slate-400">
                        Granted {new Date(grant.createdAt).toLocaleString()} · ID:{" "}
                        <span className="font-mono">{grant.id}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {status === "expired" || status === "expiring_soon" ? (
                        <ReauthorizeButton integrationId={integration.id} provider={integration.provider} />
                      ) : null}
                      <RevokeConsentButton
                        integrationId={integration.id}
                        consentGrantId={grant.id}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revoked grants (collapsed history) */}
      {revokedGrants.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Revoked Grants</h2>
          <div className="panel divide-y divide-slate-100 overflow-hidden">
            {revokedGrants.map((grant: any) => (
              <div key={grant.id} className="flex items-center justify-between px-4 py-3 opacity-60">
                <div>
                  <span className="text-sm text-slate-600">{grant.grantedBy}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="font-mono text-xs text-slate-500">{grant.scopes.join(", ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label="Revoked" tone="error" />
                  <span className="text-xs text-slate-400">{new Date(grant.revokedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
