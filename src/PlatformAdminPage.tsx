import { useEffect, useMemo, useState } from "react";

import { fetchPlatformWorkspaces } from "./api";
import type { PlatformWorkspaceOverview } from "./types";

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function subscriptionLabel(workspace: PlatformWorkspaceOverview) {
  const { status, hasSubscription, trialEndsAt } = workspace.billing;
  if (status === "trialing") return trialEndsAt && Date.parse(trialEndsAt) <= Date.now() ? "Trial ended" : "Trial";
  if (status === "active" && hasSubscription) return "Paid";
  if (status === "past_due") return "Past due";
  if (status === "paused") return "Paused";
  if (status === "canceled") return "Canceled";
  if (status === "legacy") return "Legacy";
  return status === "active" ? "Active" : "Inactive";
}

export default function PlatformAdminPage({ token }: { token: string }) {
  const [workspaces, setWorkspaces] = useState<PlatformWorkspaceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchPlatformWorkspaces(token);
        if (!active) return;
        setWorkspaces(result);
        setUpdatedAt(new Date());
        setError(null);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load accounts.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token, refreshKey]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? workspaces.filter((workspace) =>
      workspace.organisationName.toLowerCase().includes(term)
      || workspace.users.some((user) => `${user.fullName ?? ""} ${user.email}`.toLowerCase().includes(term)),
    ) : workspaces;
  }, [workspaces, search]);
  const trialCount = workspaces.filter((workspace) => subscriptionLabel(workspace) === "Trial").length;
  const paidCount = workspaces.filter((workspace) => subscriptionLabel(workspace) === "Paid").length;
  const documentCount = workspaces.reduce((sum, workspace) => sum + workspace.billing.monthlyDocumentUsage, 0);

  return <div className="platform-admin-page">
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Admin · accounts</h2><span>Current workspaces, people, subscriptions and document use</span></div>
        <button className="secondary-action" type="button" onClick={() => setRefreshKey((key) => key + 1)}>Refresh</button>
      </div>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {loading ? <p>Loading accounts…</p> : <>
        <div className="platform-admin-metrics" aria-label="Account totals">
          <div><span>Workspaces</span><strong>{workspaces.length}</strong></div>
          <div><span>Trials</span><strong>{trialCount}</strong></div>
          <div><span>Paid subscriptions</span><strong>{paidCount}</strong></div>
          <div><span>Documents this billing period</span><strong>{documentCount}</strong></div>
        </div>
        <div className="platform-admin-controls">
          <label>Search accounts or people<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
          <span>{filtered.length} of {workspaces.length} workspaces{updatedAt ? ` · Updated ${updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        </div>
        {filtered.length ? <div className="platform-admin-table-wrap"><table className="platform-admin-table">
          <thead><tr><th>Workspace</th><th>People</th><th>Subscription</th><th>Usage</th><th>Signed up</th></tr></thead>
          <tbody>{filtered.map((workspace) => <tr key={workspace.organisationId}>
            <td><strong>{workspace.organisationName}</strong><small>{workspace.country} · ID {workspace.organisationId}</small></td>
            <td><div className="platform-admin-users">{workspace.users.map((user) => <div key={user.id}>
              <strong>{user.fullName || "Name not provided"}</strong>
              <a href={`mailto:${user.email}`}>{user.email}</a>
              <small>{user.role === "Business_Admin" ? "Admin" : "Employee"}{user.status !== "active" ? ` · ${user.status.replaceAll("_", " ")}` : ""}</small>
            </div>)}</div></td>
            <td><strong>{subscriptionLabel(workspace)}</strong><small>{workspace.billing.planId} · {workspace.billing.billingCycle}</small>{workspace.billing.status === "trialing" ? <small>Ends {dateLabel(workspace.billing.trialEndsAt)}</small> : null}</td>
            <td><strong>{workspace.billing.monthlyDocumentUsage} / {workspace.billing.monthlyDocumentLimit ?? "Unlimited"} documents</strong><small>Since {dateLabel(workspace.billing.billingPeriodStartedAt)}</small><small>{workspace.billing.currentUserCount} / {workspace.billing.includedUsers ?? "Unlimited"} users</small></td>
            <td>{dateLabel(workspace.createdAt)}</td>
          </tr>)}</tbody>
        </table></div> : <p className="empty-state">{search ? "No accounts match that search." : "No accounts have signed up yet."}</p>}
      </>}
    </section>
  </div>;
}
