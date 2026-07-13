import { startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  attachReceiptToClaim,
  clearStoredSession,
  completeBankCallback,
  createClaim,
  createRequisition,
  deleteReceipt,
  fetchSession,
  getClaim,
  getReceipt,
  getReceiptAssetUrl,
  getSettings,
  listClaims,
  listReceipts,
  listReconciliation,
  listRules,
  loginWithEmail,
  loadStoredSession,
  registerWithEmail,
  matchReconciliation,
  removeRule,
  saveStoredSession,
  saveReceipt,
  saveRule,
  saveSettings,
  sendInvite,
  updateClaimStatus,
  uploadDocuments,
} from "./api";
import type {
  ClaimRecord,
  InboxStatus,
  InviteResult,
  OrganisationSettings,
  ReceiptRecord,
  ReconciliationLine,
  SessionState,
  SupplierRule,
  TaxRate,
} from "./types";

const taxRates: TaxRate[] = [
  "20% Standard",
  "5% Reduced",
  "0% Zero",
  "Exempt",
  "No VAT",
];
const costCategoryOptions = [
  "Staff Welfare",
  "1 - Taxi",
  "2 - Bus/ Tram",
  "3 - Car Wash",
  "4 - Fuel",
  "5 - Train",
  "6 - Toll Road",
  "7 - Motor Expenses",
  "8 - Other",
  "9 - Uniform",
  "10 - EV Charging",
];
const salesCategoryOptions = [
  "Accounts Receivable",
  "Consulting Income",
  "Product Sales",
  "Subscription Income",
  "Travel Recharge",
  "Other Income",
];

const navItems = [
  { to: "/overview", label: "Overview", icon: "overview" },
  { to: "/costs", label: "Costs Inbox", icon: "costs" },
  { to: "/sales", label: "Sales Inbox", icon: "sales" },
  { to: "/vault", label: "Vault", icon: "claims" },
  { to: "/claims", label: "Expense Claims", icon: "claims" },
  { to: "/rules", label: "Supplier Rules", icon: "rules" },
  { to: "/reconciliation", label: "Bank Reconciliation", icon: "bank" },
  { to: "/settings", label: "Company Settings", icon: "settings" },
  { to: "/requisitions", label: "Open Banking", icon: "open-banking" },
];

const brandLogoSrc = "/branding/exdox-logo.png";
const brandMarkSrc = "/branding/exdox-mark.png";

type AppStore = {
  costs: ReceiptRecord[];
  sales: ReceiptRecord[];
  vault: ReceiptRecord[];
  claims: ClaimRecord[];
  rules: SupplierRule[];
  reconciliation: ReconciliationLine[];
  settings: OrganisationSettings | null;
};

export function App() {
  const location = useLocation();
  const [session, setSession] = useState<SessionState | null>(null);
  const [store, setStore] = useState<AppStore>({
    costs: [],
    sales: [],
    vault: [],
    claims: [],
    rules: [],
    reconciliation: [],
    settings: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadWorkspace = async (token: string, fallbackSession?: SessionState | null) => {
    const nextSession = await fetchSession(token).catch((error) => {
      if (fallbackSession) {
        return fallbackSession;
      }
      throw error;
    });
    const businessAdmin = isBusinessAdmin(nextSession);
    const [costs, sales, vault, claims, rules, reconciliation, settings] = await Promise.all([
      listReceipts(token, "cost"),
      businessAdmin ? listReceipts(token, "sales") : Promise.resolve([]),
      businessAdmin ? listReceipts(token, "vault").catch(() => []) : Promise.resolve([]),
      listClaims(token).catch(() => []),
      businessAdmin ? listRules(token).catch(() => []) : Promise.resolve([]),
      businessAdmin ? listReconciliation(token).catch(() => []) : Promise.resolve([]),
      businessAdmin ? getSettings(token).catch(() => null) : Promise.resolve(null),
    ]);

    setSession(nextSession);
    setStore({
      costs,
      sales,
      vault,
      claims,
      rules,
      reconciliation,
      settings,
    });
    setError(null);
    setAuthError(null);
  };

  useEffect(() => {
    const stored = loadStoredSession();
    if (!stored) {
      setLoading(false);
      return;
    }

    loadWorkspace(stored.token, stored)
      .catch((nextError: Error) => {
        clearStoredSession();
        setError(nextError.message);
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-panel">
          <div className="loading-mark-shell">
            <img className="loading-mark" src={brandMarkSrc} alt="exdox" />
          </div>
          <strong>Loading Exdox workspace</strong>
          <p>Preparing your dashboard and organisation context.</p>
        </div>
      </div>
    );
  }

  if (!session && location.pathname !== "/login") {
    if (location.pathname === "/register") {
      return (
        <RegisterState
          busy={authBusy}
          error={authError ?? error}
          initialEmail={new URLSearchParams(location.search).get("email") ?? ""}
          inviteToken={new URLSearchParams(location.search).get("inviteToken") ?? ""}
          onRegister={async (input) => {
            setAuthBusy(true);
            setAuthError(null);
            setError(null);
            try {
              const nextSession = await registerWithEmail(input);
              await loadWorkspace(nextSession.token, nextSession);
            } catch (registerError) {
              setSession(null);
              setAuthError(registerError instanceof Error ? registerError.message : "Registration failed.");
            } finally {
              setAuthBusy(false);
            }
          }}
        />
      );
    }
    return <PublicHome />;
  }

  if (!session) {
    return (
      <LoginState
        busy={authBusy}
        error={authError ?? error}
        onLogin={async (email, password) => {
          setAuthBusy(true);
          setAuthError(null);
          setError(null);
          try {
            const nextSession = await loginWithEmail({ email, password });
            await loadWorkspace(nextSession.token, nextSession);
          } catch (loginError) {
            setSession(null);
            setAuthError(loginError instanceof Error ? loginError.message : "Sign in failed.");
          } finally {
            setAuthBusy(false);
          }
        }}
      />
    );
  }

  const defaultRoute = getDefaultRoute(session);

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={defaultRoute} replace />}
      />
      <Route
        path="/*"
        element={
          <DashboardShell
            session={session}
            store={store}
            error={error}
            onUpload={async (workspaceContext, files) => {
              const pendingReceipts = buildPendingReceipts(session, workspaceContext, files);
              const targetKey =
                workspaceContext === "cost" ? "costs" : workspaceContext === "sales" ? "sales" : "vault";
              setError(null);
              setStore((current) => ({
                ...current,
                [targetKey]: [...pendingReceipts, ...current[targetKey]],
              }));

              try {
                await uploadDocuments(session.token, workspaceContext, files);
                const refreshed = await listReceipts(session.token, workspaceContext);
                setStore((current) => ({
                  ...current,
                  [targetKey]: refreshed,
                }));
              } catch (uploadError) {
                setStore((current) => ({
                  ...current,
                  [targetKey]: current[targetKey].filter(
                    (receipt) => !pendingReceipts.some((pending) => pending.id === receipt.id),
                  ),
                }));
                setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
                throw uploadError;
              }
            }}
            onReceiptSave={async (id, payload) => {
              const saved = await saveReceipt(session.token, id, payload);
              setStore((current) => ({
                ...current,
                costs: current.costs.map((item) => (item.id === id ? saved : item)),
                sales: current.sales.map((item) => (item.id === id ? saved : item)),
                vault: current.vault.map((item) => (item.id === id ? saved : item)),
              }));
            }}
            onReceiptDelete={async (id) => {
              await deleteReceipt(session.token, id);
              setStore((current) => ({
                ...current,
                costs: current.costs.filter((item) => item.id !== id),
                sales: current.sales.filter((item) => item.id !== id),
                vault: current.vault.filter((item) => item.id !== id),
              }));
            }}
            onAttachReceiptToClaim={async (receiptId, claimId) => {
              const savedReceipt = await attachReceiptToClaim(session.token, { receiptId, claimId });
              const [claims, costs] = await Promise.all([
                listClaims(session.token),
                listReceipts(session.token, "cost"),
              ]);
              setStore((current) => ({
                ...current,
                claims,
                costs: costs.map((item) => (item.id === savedReceipt.id ? savedReceipt : item)),
              }));
              return savedReceipt;
            }}
            onClaimCreate={async (payload) => {
              const claim = await createClaim(session.token, payload);
              const refreshedClaims = await listClaims(session.token);
              setStore((current) => ({
                ...current,
                claims: refreshedClaims.some((item) => item.id === claim.id)
                  ? refreshedClaims
                  : [claim, ...refreshedClaims],
              }));
              return claim;
            }}
            onClaimStatusChange={async (id, status) => {
              const saved = await updateClaimStatus(session.token, id, status);
              setStore((current) => ({
                ...current,
                claims: current.claims.map((item) => (item.id === id ? saved : item)),
              }));
            }}
            onRuleSave={async (payload) => {
              const saved = await saveRule(session.token, payload);
              setStore((current) => {
                const existing = current.rules.find((item) => item.id === saved.id);
                return {
                  ...current,
                  rules: existing
                    ? current.rules.map((item) => (item.id === saved.id ? saved : item))
                    : [saved, ...current.rules],
                };
              });
            }}
            onRuleDelete={async (id) => {
              await removeRule(session.token, id);
              setStore((current) => ({
                ...current,
                rules: current.rules.filter((item) => item.id !== id),
              }));
            }}
            onMatch={async (statementLineId, receiptId) => {
              await matchReconciliation(session.token, statementLineId, receiptId);
              const refreshed = await listReconciliation(session.token);
              setStore((current) => ({
                ...current,
                reconciliation: refreshed,
              }));
            }}
            onCreateRequisition={async (input) => createRequisition(session.token, input)}
            onCompleteBankCallback={async (input) => completeBankCallback(session.token, input)}
            onSettingsSave={async (payload) => {
              const saved = await saveSettings(session.token, payload);
              setStore((current) => ({
                ...current,
                settings: saved,
              }));
            }}
            onInviteEmployee={async (payload) => sendInvite(session.token, payload)}
            onActiveOrganisationChange={async (organisationId) => {
              setSession((current) => {
                if (!current || current.activeOrganisationId === organisationId) {
                  return current;
                }

                const nextSession = {
                  ...current,
                  activeOrganisationId: organisationId,
                };
                saveStoredSession(nextSession);
                return nextSession;
              });
              await loadWorkspace(session.token, session);
            }}
            onSignOut={() => {
              clearStoredSession();
              setSession(null);
              setStore({
                costs: [],
                sales: [],
                vault: [],
                claims: [],
                rules: [],
                reconciliation: [],
                settings: null,
              });
              setError(null);
              setAuthError(null);
            }}
            loadReceipt={async (id) => {
              const [receipt, assetUrl] = await Promise.all([
                getReceipt(session.token, id),
                getReceiptAssetUrl(session.token, id),
              ]);
              return { receipt, assetUrl };
            }}
            loadClaim={async (id) => getClaim(session.token, id)}
          />
        }
      />
    </Routes>
  );
}

function DashboardShell(props: {
  session: SessionState;
  store: AppStore;
  error: string | null;
  onUpload: (workspaceContext: "cost" | "sales" | "vault", files: File[]) => Promise<void>;
  onReceiptSave: (id: number, payload: Partial<ReceiptRecord>) => Promise<void>;
  onReceiptDelete: (id: number) => Promise<void>;
  onAttachReceiptToClaim: (receiptId: number, claimId: number) => Promise<ReceiptRecord>;
  onClaimCreate: (payload: { name?: string; description?: string; currency?: string }) => Promise<ClaimRecord>;
  onClaimStatusChange: (id: number, status: ClaimRecord["status"]) => Promise<void>;
  onRuleSave: (
    payload: Partial<SupplierRule> &
      Pick<SupplierRule, "supplierMatchText" | "category" | "taxRate" | "paymentMethod" | "isActive">,
  ) => Promise<void>;
  onRuleDelete: (id: number) => Promise<void>;
  onMatch: (statementLineId: number, receiptId: number) => Promise<void>;
  onCreateRequisition: (input: { provider?: string; institutionId?: string }) => Promise<{ redirectUrl: string }>;
  onCompleteBankCallback: (input: {
    state: string;
    requisitionId?: string | null;
    consentId?: string | null;
  }) => Promise<{ linked: boolean; state: string; externalRequisitionId: string | null }>;
  onSettingsSave: (payload: Pick<OrganisationSettings, "isVatRegistered" | "defaultTaxRate">) => Promise<void>;
  onInviteEmployee: (payload: { email: string; fullName?: string }) => Promise<InviteResult>;
  onActiveOrganisationChange: (organisationId: number) => Promise<void>;
  onSignOut: () => void;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null }>;
  loadClaim: (id: number) => Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }>;
}) {
  const [uploadBusy, setUploadBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const businessAdmin = isBusinessAdmin(props.session);
  const notificationCount =
    props.store.costs.filter((receipt) => receipt.needsReview).length +
    props.store.sales.filter((receipt) => receipt.needsReview).length +
    props.store.claims.filter((claim) => claim.status === "pending").length +
    props.store.reconciliation.filter((line) => line.status === "Open").length;
  const visibleNavItems = businessAdmin
    ? navItems.filter((item) => isRouteAllowed(props.session, item.to))
    : [
        { to: "/dropbox", label: "My Drop Box", icon: "costs" },
        { to: "/claims", label: "My Claims", icon: "claims" },
      ];
  const defaultRoute = getDefaultRoute(props.session);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-lockup">
            <img className="brand-mark" src={brandMarkSrc} alt="" />
            <strong>exdox</strong>
          </div>
          <nav className="sidebar-nav" aria-label="Primary">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
                to={item.to}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-card">
          <span>Workspace boundary</span>
          <strong>Organisation scoped</strong>
          <p>All requests are expected to resolve with `organisation_id` checks.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">{props.session.organisations[0]?.name ?? "Active workspace"}</p>
            <h1>{businessAdmin ? routeTitle(location.pathname) : "Employee Drop Box"}</h1>
          </div>
          <div className="topbar-actions">
            <select
              className="org-selector"
              value={props.session.activeOrganisationId}
              onChange={(event) => props.onActiveOrganisationChange(Number(event.target.value))}
            >
              {props.session.organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              type="button"
              aria-label={`Notifications: ${notificationCount}`}
              title={`${notificationCount} items need attention`}
              onClick={() => navigate(getAttentionRoute(props.session, props.store))}
            >
              {notificationCount}
            </button>
            <button className="secondary-action" type="button" onClick={props.onSignOut}>
              Sign out
            </button>
            {businessAdmin ? (
              <>
                <UploadButton
                  busy={uploadBusy}
                  label="Upload Costs"
                  onFiles={async (files) => {
                    setUploadBusy(true);
                    try {
                      await props.onUpload("cost", files);
                    } finally {
                      setUploadBusy(false);
                    }
                  }}
                />
                <UploadButton
                  busy={uploadBusy}
                  label="Upload Sales"
                  onFiles={async (files) => {
                    setUploadBusy(true);
                    try {
                      await props.onUpload("sales", files);
                    } finally {
                      setUploadBusy(false);
                    }
                  }}
                />
                <UploadButton
                  busy={uploadBusy}
                  label="Upload Vault"
                  onFiles={async (files) => {
                    setUploadBusy(true);
                    try {
                      await props.onUpload("vault", files);
                    } finally {
                      setUploadBusy(false);
                    }
                  }}
                />
              </>
            ) : (
              <UploadButton
                busy={uploadBusy}
                label="Upload Receipts"
                onFiles={async (files) => {
                  setUploadBusy(true);
                  try {
                    await props.onUpload("cost", files);
                  } finally {
                    setUploadBusy(false);
                  }
                }}
              />
            )}
          </div>
        </header>

        {props.error ? <div className="error-banner">{props.error}</div> : null}

        <Routes>
          {businessAdmin ? (
            <>
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview" element={<OverviewPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/costs") ? (
                <Route
                  path="/costs"
                  element={
                    <InboxPage
                      title="Costs Inbox"
                      records={props.store.costs}
                      basePath="/costs"
                      uploadBusy={uploadBusy}
                      onUpload={(files) => props.onUpload("cost", files)}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/costs") ? (
                <Route
                  path="/costs/:id"
                  element={
                    <DocumentWorkspacePage
                      mode="cost"
                      fallbackRecords={props.store.costs}
                      claims={props.store.claims}
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      onAttachToClaim={props.onAttachReceiptToClaim}
                      loadReceipt={props.loadReceipt}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/sales") ? (
                <Route
                  path="/sales"
                  element={
                    <InboxPage
                      title="Sales Inbox"
                      records={props.store.sales}
                      basePath="/sales"
                      uploadBusy={uploadBusy}
                      onUpload={(files) => props.onUpload("sales", files)}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/sales") ? (
                <Route
                  path="/sales/:id"
                  element={
                    <DocumentWorkspacePage
                      mode="sales"
                      fallbackRecords={props.store.sales}
                      claims={props.store.claims}
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      onAttachToClaim={props.onAttachReceiptToClaim}
                      loadReceipt={props.loadReceipt}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/vault") ? (
                <Route
                  path="/vault"
                  element={
                    <InboxPage
                      title="Document Vault"
                      records={props.store.vault}
                      basePath="/vault"
                      uploadBusy={uploadBusy}
                      onUpload={(files) => props.onUpload("vault", files)}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/vault") ? (
                <Route
                  path="/vault/:id"
                  element={
                    <DocumentWorkspacePage
                      mode="vault"
                      fallbackRecords={props.store.vault}
                      claims={props.store.claims}
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      onAttachToClaim={props.onAttachReceiptToClaim}
                      loadReceipt={props.loadReceipt}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/claims") ? (
                <Route path="/claims" element={<ClaimsPage claims={props.store.claims} onCreateClaim={props.onClaimCreate} />} />
              ) : null}
              {isRouteAllowed(props.session, "/claims") ? (
                <Route
                  path="/claims/:id"
                  element={<ClaimDetailPage onStatusChange={props.onClaimStatusChange} loadClaim={props.loadClaim} />}
                />
              ) : null}
              {isRouteAllowed(props.session, "/rules") ? (
                <Route
                  path="/rules"
                  element={
                    <RulesPage rules={props.store.rules} onSave={props.onRuleSave} onDelete={props.onRuleDelete} />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/reconciliation") ? (
                <Route
                  path="/reconciliation"
                  element={
                    <ReconciliationPage
                      lines={props.store.reconciliation}
                      onMatch={props.onMatch}
                      onCreateRequisition={props.onCreateRequisition}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/settings") ? (
                <Route
                  path="/settings"
                  element={
                    <SettingsPage
                      settings={props.store.settings}
                      onSave={props.onSettingsSave}
                      onInviteEmployee={props.onInviteEmployee}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/requisitions") ? (
                <Route path="/requisitions" element={<RequisitionPage onCreateRequisition={props.onCreateRequisition} />} />
              ) : null}
              {isRouteAllowed(props.session, "/bank-callback") ? (
                <Route
                  path="/bank-callback"
                  element={<BankCallbackPage onComplete={props.onCompleteBankCallback} />}
                />
              ) : null}
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </>
          ) : (
            <>
              <Route
                path="/dropbox"
                element={
                  <EmployeeDropboxPage
                    receipts={props.store.costs}
                    onUpload={props.onUpload}
                    uploadBusy={uploadBusy}
                  />
                }
              />
              <Route
                path="/claims"
                element={<ClaimsPage claims={props.store.claims} onCreateClaim={props.onClaimCreate} employeeMode />}
              />
              <Route
                path="/claims/:id"
                element={<ClaimDetailPage loadClaim={props.loadClaim} onStatusChange={props.onClaimStatusChange} employeeMode />}
              />
              <Route
                path="/dropbox/:id"
                element={
                  <DocumentWorkspacePage
                    mode="cost"
                    fallbackRecords={props.store.costs}
                    claims={props.store.claims}
                    onSave={props.onReceiptSave}
                    onDelete={props.onReceiptDelete}
                    onAttachToClaim={props.onAttachReceiptToClaim}
                    loadReceipt={props.loadReceipt}
                  />
                }
              />
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

function OverviewPage({ store }: { store: AppStore }) {
  const totalCosts = sumGross(store.costs);
  const totalSales = sumGross(store.sales);
  const vaultDocuments = store.vault.length;
  const pendingClaims = store.claims.filter((claim) => claim.status === "pending").length;
  const openMatches = store.reconciliation.filter((line) => line.status === "Open").length;

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Costs in review" value={currency(totalCosts)} detail={`${store.costs.length} documents`} />
        <MetricCard label="Sales ledger" value={currency(totalSales)} detail={`${store.sales.length} invoices`} />
        <MetricCard label="Vault archive" value={String(vaultDocuments)} detail="Stored reference files" />
        <MetricCard label="Pending claims" value={String(pendingClaims)} detail="Approval workload" />
        <MetricCard label="Open bank matches" value={String(openMatches)} detail="Awaiting audit pairing" />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Inbox throughput</h2>
            <span>Live totals</span>
          </div>
          <div className="status-strip">
            {(["Processing", "Review", "Ready", "Published"] as InboxStatus[]).map((status) => (
              <div className="status-box" key={status}>
                <strong>
                  {
                    [...store.costs, ...store.sales].filter((item) => item.status === status)
                      .length
                  }
                </strong>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Automation posture</h2>
            <span>Supplier rules</span>
          </div>
          <ul className="summary-list">
            {store.rules.length ? (
              store.rules.slice(0, 4).map((rule) => (
                <li key={rule.id}>
                  <strong>{rule.supplierMatchText}</strong>
                  <span>
                    {rule.category} | {rule.taxRate} | {rule.paymentMethod}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <strong>No supplier rules yet</strong>
                <span>Automation rules will appear here once they are created.</span>
              </li>
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}

function InboxPage({
  title,
  records,
  basePath,
  uploadBusy,
  onUpload,
}: {
  title: string;
  records: ReceiptRecord[];
  basePath: "/costs" | "/sales" | "/vault";
  uploadBusy: boolean;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const deferredQuery = useDeferredValue(query);
  const navigate = useNavigate();

  const search = deferredQuery.trim().toLowerCase();
  const isVaultInbox = basePath === "/vault";
  const filtered = records.filter((record) => {
    const matchesSearch =
      !search ||
      `${record.vendorName ?? ""} ${record.category ?? ""} ${record.sourceFilename}`.toLowerCase().includes(search);
    const matchesStatus = statusFilter === "All" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{title}</h2>
          <p>Bulk ingestion, organisation-scoped review, and ledger-safe editing in a dedicated workspace.</p>
        </div>
        <div className="filter-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search supplier, category, or filename"
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                setQuery(nextValue);
              });
            }}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InboxStatus | "All")}>
            <option value="All">All statuses</option>
            <option value="Processing">Processing</option>
            <option value="Review">Review</option>
            <option value="Ready">Ready</option>
            <option value="Published">Published</option>
          </select>
        </div>
      </section>

      <UploadDropZone
        title={
          basePath === "/costs"
            ? "Drop supplier bills, receipts, and invoices"
            : basePath === "/sales"
              ? "Drop outward sales invoices and revenue evidence"
              : "Drop documents into the vault"
        }
        subtitle={
          basePath === "/costs"
            ? "Files upload straight into secure processing and land in the costs inbox with a Processing status."
            : basePath === "/sales"
              ? "Bulk sales files route into the sales ledger workspace without mixing into expense review."
              : "Store reference files in a separate archive workspace without forcing them into costs or sales coding."
        }
        busy={uploadBusy}
        onFiles={onUpload}
      />

      <section className="panel table-panel">
        {filtered.length ? (
          <table className="data-table">
            <thead>
              {isVaultInbox ? (
                <tr>
                  <th>Status</th>
                  <th>Stored</th>
                  <th>Filename</th>
                  <th>Document Type</th>
                  <th>Source</th>
                  <th>Description</th>
                </tr>
              ) : (
                <tr>
                  <th>Status</th>
                  <th>Receipt Date</th>
                  <th>Supplier Name</th>
                  <th>Category</th>
                  <th>Net Amount</th>
                  <th>VAT Amount</th>
                  <th>Gross Total</th>
                  <th>Source</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} onClick={() => navigate(`${basePath}/${record.id}`)}>
                  {isVaultInbox ? (
                    <>
                      <td><StatusPill status={record.status} /></td>
                      <td>{record.createdAt.slice(0, 10)}</td>
                      <td>{record.sourceFilename}</td>
                      <td>{documentTypeLabel(record.documentType)}</td>
                      <td>{sourceLabel(record.receiptSource)}</td>
                      <td>{record.description ?? "Stored vault document"}</td>
                    </>
                  ) : (
                    <>
                      <td><StatusPill status={record.status} /></td>
                      <td>{record.invoiceDate ?? "Pending"}</td>
                      <td>{record.vendorName ?? "Unknown supplier"}</td>
                      <td>{record.category ?? "Uncategorised"}</td>
                      <td>{currency(record.netAmount)}</td>
                      <td>{currency(record.vatAmount)}</td>
                      <td>{currency(record.totalAmount)}</td>
                      <td>{sourceLabel(record.receiptSource)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-inline-state">
            <strong>{search || statusFilter !== "All" ? "No documents match the current filters." : isVaultInbox ? "No vault files stored yet." : "No documents uploaded yet."}</strong>
            <p>
              {isVaultInbox
                ? "Upload reference files into the vault to keep archive-only evidence separate from costs and sales workflows."
                : "Use the upload area above to add receipts or invoices into this workspace."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DocumentWorkspacePage(props: {
  mode: "cost" | "sales" | "vault";
  fallbackRecords: ReceiptRecord[];
  claims: ClaimRecord[];
  onSave: (id: number, payload: Partial<ReceiptRecord>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAttachToClaim: (receiptId: number, claimId: number) => Promise<ReceiptRecord>;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null }>;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(
    props.fallbackRecords.find((item) => item.id === Number(id)) ?? null,
  );
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    props.loadReceipt(Number(id))
      .then((payload) => {
        setReceipt(payload.receipt);
        setAssetUrl(payload.assetUrl);
        setSelectedClaimId(payload.receipt.claimId ? String(payload.receipt.claimId) : "");
        setError(null);
      })
      .catch((loadError: Error) => {
        setError(loadError.message || "Could not load this receipt.");
      });
  }, [id, props]);

  if (!receipt) {
    return <div className="empty-state">{error ?? "Receipt workspace unavailable."}</div>;
  }

  const categoryOptions =
    props.mode === "sales" ? salesCategoryOptions : props.mode === "vault" ? [] : costCategoryOptions;
  const eligibleClaims = props.claims.filter((claim) => claim.status === "pending" || claim.status === "approved");
  const lineItems = receipt.lineItems ?? [];
  const taxBreakdown = receipt.taxBreakdown ?? [];
  const notes = receipt.notes ?? [];
  const isVaultRecord = props.mode === "vault";

  return (
    <div className="workspace-split">
      <section className="panel viewer-panel">
        <div className="panel-heading">
          <h2>Source document</h2>
          <span>{receipt.sourceFilename}</span>
        </div>
        {assetUrl ? (
          <iframe className="document-frame" src={assetUrl} title={receipt.sourceFilename} />
        ) : (
          <div className="document-placeholder">
            <img className="placeholder-logo" src={brandMarkSrc} alt="exdox preview placeholder" />
            <strong>S3 document preview</strong>
            <p>The secure source file preview will appear here when the stored document asset is available.</p>
          </div>
        )}
      </section>

      <section className="panel editor-panel">
        <div className="panel-heading">
          <h2>{props.mode === "cost" ? "Cost coding" : props.mode === "sales" ? "Sales ledger coding" : "Vault record"}</h2>
          <span>Organisation #{receipt.organisationId}</span>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        {feedback ? <div className="success-banner">{feedback}</div> : null}

        <div className="form-grid">
          <label>
            Supplier Name
            <input value={receipt.vendorName ?? ""} onChange={(event) => setReceipt({ ...receipt, vendorName: event.target.value })} />
          </label>
          {!isVaultRecord ? (
            <label>
              Category
              <select value={receipt.category ?? ""} onChange={(event) => setReceipt({ ...receipt, category: event.target.value })}>
                <option value="">Select category</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Customer
            <input value={receipt.customer ?? ""} onChange={(event) => setReceipt({ ...receipt, customer: event.target.value })} />
          </label>
          <label>
            Receipt Date
            <input type="date" value={receipt.invoiceDate ?? ""} onChange={(event) => setReceipt({ ...receipt, invoiceDate: event.target.value })} />
          </label>
          <label>
            Invoice Number
            <input value={receipt.invoiceNumber ?? ""} onChange={(event) => setReceipt({ ...receipt, invoiceNumber: event.target.value })} />
          </label>
          <label>
            Due Date
            <input type="date" value={receipt.dueDate ?? ""} onChange={(event) => setReceipt({ ...receipt, dueDate: event.target.value })} />
          </label>
          <label>
            Workflow Status
            <select value={receipt.status} onChange={(event) => setReceipt({ ...receipt, status: event.target.value as ReceiptRecord["status"] })}>
              <option value="Processing">Processing</option>
              <option value="Review">Review</option>
              <option value="Ready">Ready</option>
              <option value="Published">Published</option>
            </select>
          </label>
          {!isVaultRecord ? (
            <>
              <label>
                Net Amount
                <input type="number" value={receipt.netAmount ?? 0} onChange={(event) => setReceipt({ ...receipt, netAmount: Number(event.target.value) })} />
              </label>
              <label>
                VAT Amount
                <input type="number" value={receipt.vatAmount ?? 0} onChange={(event) => setReceipt({ ...receipt, vatAmount: Number(event.target.value) })} />
              </label>
              <label>
                Gross Total
                <input type="number" value={receipt.totalAmount ?? 0} onChange={(event) => setReceipt({ ...receipt, totalAmount: Number(event.target.value) })} />
              </label>
              <label>
                HMRC Tax Tier
                <select value={receipt.taxRateApplied ?? "No VAT"} onChange={(event) => setReceipt({ ...receipt, taxRateApplied: event.target.value })}>
                  {taxRates.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payment Method
                <select value={receipt.paymentMethod} onChange={(event) => setReceipt({ ...receipt, paymentMethod: event.target.value as ReceiptRecord["paymentMethod"] })}>
                  <option value="business_card">Business card</option>
                  <option value="cash_personal">Personal spend</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </label>
            </>
          ) : (
            <label>
              Archive status
              <input value="Vault document stored without expense coding" readOnly />
            </label>
          )}
          <label>
            Source Channel
            <input value={sourceLabel(receipt.receiptSource)} readOnly />
          </label>
          <label className="form-span-2">
            Description
            <textarea
              rows={3}
              value={receipt.description ?? ""}
              onChange={(event) => setReceipt({ ...receipt, description: event.target.value })}
            />
          </label>
          <label className="form-span-2">
            Extraction Notes
            <textarea
              rows={4}
              value={receipt.rawTextSummary ?? ""}
              onChange={(event) => setReceipt({ ...receipt, rawTextSummary: event.target.value })}
            />
          </label>
          {props.mode === "cost" ? (
            <label className="form-span-2">
              Expense Claim
              <select value={selectedClaimId} onChange={(event) => setSelectedClaimId(event.target.value)}>
                <option value="">Select claim</option>
                {eligibleClaims.map((claim) => (
                  <option key={claim.id} value={claim.id}>
                    {claim.name} ({claimStatusLabel(claim.status)})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <section className="workspace-detail-section">
          <div className="panel-heading">
            <h2>Extraction detail</h2>
            <span>{documentTypeLabel(receipt.documentType)} document</span>
          </div>
          <div className="summary-list">
            <div>
              <strong>Confidence</strong>
              <span>{formatConfidence(receipt.confidenceScore, receipt.confidenceSource)}</span>
            </div>
            <div>
              <strong>Subtotal</strong>
              <span>{currency(receipt.subtotalAmount ?? receipt.netAmount ?? 0)}</span>
            </div>
            <div>
              <strong>Total tax</strong>
              <span>{currency(receipt.totalTaxAmount ?? receipt.vatAmount ?? 0)}</span>
            </div>
            <div>
              <strong>Extractor</strong>
              <span>{receipt.extractionProvider && receipt.extractionModel ? `${receipt.extractionProvider} / ${receipt.extractionModel}` : "Not available"}</span>
            </div>
          </div>
        </section>

        {lineItems.length ? (
          <section className="workspace-detail-section">
            <div className="panel-heading">
              <h2>Line items</h2>
              <span>{lineItems.length} extracted</span>
            </div>
            <div className="table-panel compact-table-panel">
              <table className="data-table compact-data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Tax</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={`${item.description}-${index}`}>
                      <td>{item.description || "Line item"}</td>
                      <td>{item.quantity ?? "-"}</td>
                      <td>{item.unitPrice === null ? "-" : currency(item.unitPrice)}</td>
                      <td>{item.taxAmount === null ? "-" : currency(item.taxAmount)}</td>
                      <td>{item.total === null ? "-" : currency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {taxBreakdown.length ? (
          <section className="workspace-detail-section">
            <div className="panel-heading">
              <h2>Tax breakdown</h2>
              <span>{taxBreakdown.length} lines</span>
            </div>
            <div className="table-panel compact-table-panel">
              <table className="data-table compact-data-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {taxBreakdown.map((item, index) => (
                    <tr key={`${item.label}-${index}`}>
                      <td>{item.label || "Tax line"}</td>
                      <td>{item.rate === null ? "-" : `${item.rate}%`}</td>
                      <td>{item.amount === null ? "-" : currency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {notes.length ? (
          <section className="workspace-detail-section">
            <div className="panel-heading">
              <h2>Model notes</h2>
              <span>{notes.length} checks</span>
            </div>
            <ul className="note-list">
              {notes.map((note, index) => (
                <li key={`${note}-${index}`}>{note}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="toolbar">
          <button
            className="primary-action"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setFeedback(null);
              setError(null);
              try {
                await props.onSave(receipt.id, receipt);
                setFeedback("Receipt changes saved.");
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Could not save this receipt.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="danger-action"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setFeedback(null);
              setError(null);
              try {
                await props.onDelete(receipt.id);
                navigate(props.mode === "cost" ? "/costs" : "/sales");
              } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : "Could not delete this receipt.");
              } finally {
                setSaving(false);
              }
            }}
          >
            Delete Document
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setFeedback(null);
              setError(null);
              try {
                const nextReceipt = { ...receipt, status: "Published" as ReceiptRecord["status"] };
                setReceipt(nextReceipt);
                await props.onSave(receipt.id, nextReceipt);
                setFeedback("Receipt published to the accounting workflow.");
              } catch (publishError) {
                setError(publishError instanceof Error ? publishError.message : "Could not publish this receipt.");
              } finally {
                setSaving(false);
              }
            }}
          >
            Publish to Accounting Tool
          </button>
          {props.mode === "cost" ? (
            <button
              className="secondary-action"
              type="button"
              disabled={saving || !selectedClaimId}
              onClick={async () => {
                setSaving(true);
                setFeedback(null);
                setError(null);
                try {
                  const updatedReceipt = await props.onAttachToClaim(receipt.id, Number(selectedClaimId));
                  setReceipt(updatedReceipt);
                  setSelectedClaimId(updatedReceipt.claimId ? String(updatedReceipt.claimId) : selectedClaimId);
                  setFeedback("Receipt attached to the selected claim.");
                } catch (attachError) {
                  setError(attachError instanceof Error ? attachError.message : "Could not attach this receipt to a claim.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Attach to Claim
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ClaimsPage({
  claims,
  onCreateClaim,
  employeeMode,
}: {
  claims: ClaimRecord[];
  onCreateClaim: (payload: { name?: string; description?: string; currency?: string }) => Promise<ClaimRecord>;
  employeeMode?: boolean;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    currency: "GBP",
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{employeeMode ? "My expense claims" : "Expense claims"}</h2>
          <p>
            {employeeMode
              ? "Create and track your own reimbursement claims while keeping company-wide finance controls hidden."
              : "Claim folders stay separate from purchase invoices and keep reimbursement approval in its own workflow."}
          </p>
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>Create claim</h2>
          <span>Reimbursement workflow</span>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        {feedback ? <div className="success-banner">{feedback}</div> : null}
        <div className="form-grid">
          <label>
            Claim name
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            Currency
            <input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} maxLength={3} />
          </label>
          <label className="form-span-2">
            Description
            <textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
        </div>
        <div className="toolbar">
          <button
            className="primary-action"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setFeedback(null);
              try {
                const claim = await onCreateClaim({
                  name: draft.name.trim() || undefined,
                  description: draft.description.trim() || undefined,
                  currency: draft.currency.trim() || "GBP",
                });
                setDraft({ name: "", description: "", currency: "GBP" });
                setFeedback("Expense claim created.");
                navigate(`/claims/${claim.id}`);
              } catch (createError) {
                setError(createError instanceof Error ? createError.message : "Could not create this claim.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Creating..." : "Create claim"}
          </button>
        </div>
      </section>
      <section className="card-grid">
        {claims.length ? (
          claims.map((claim) => (
            <button className="claim-card" key={claim.id} type="button" onClick={() => navigate(`/claims/${claim.id}`)}>
              <strong>{claim.name}</strong>
              <span>Total value: {currency(claim.totalAmount)}</span>
              <span>Claiming employee: {claimEmployeeLabel(claim)}</span>
              <span>Submission date: {claim.createdAt.slice(0, 10)}</span>
              <span>Approval status: {claimStatusLabel(claim.status)}</span>
              <span>{claim.documentCount} receipt lines</span>
              <StatusPill status={claimStatusToPill(claim.status)} />
            </button>
          ))
        ) : (
          <div className="empty-inline-state card-span-2">
            <strong>{employeeMode ? "No claims created yet." : "No expense claims in this organisation yet."}</strong>
            <p>{employeeMode ? "Create your first claim above and attach personal-spend receipts from the review workspace." : "Create a claim above to start the reimbursement approval workflow."}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EmployeeDropboxPage(props: {
  receipts: ReceiptRecord[];
  onUpload: (workspaceContext: "cost" | "sales" | "vault", files: File[]) => Promise<void>;
  uploadBusy: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>My drop box</h2>
          <p>
            Employees can upload receipts and view only their own history.
            Company-wide metrics, bank transactions, settings, and peer uploads remain admin-only.
          </p>
        </div>
      </section>
      <UploadDropZone
        title="Drop receipts into your employee queue"
        subtitle="Send multiple files into processing while keeping company-wide dashboards, settings, and peer uploads hidden from employee sessions."
        busy={props.uploadBusy}
        onFiles={(files) => props.onUpload("cost", files)}
      />
      <section className="panel table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Upload Date</th>
              <th>Supplier</th>
              <th>Net</th>
              <th>VAT</th>
              <th>Gross</th>
            </tr>
          </thead>
          <tbody>
            {props.receipts.map((receipt) => (
              <tr key={receipt.id} onClick={() => navigate(`/dropbox/${receipt.id}`)}>
                <td><StatusPill status={receipt.status} /></td>
                <td>{receipt.createdAt.slice(0, 10)}</td>
                <td>{receipt.vendorName ?? receipt.sourceFilename}</td>
                <td>{currency(receipt.netAmount)}</td>
                <td>{currency(receipt.vatAmount)}</td>
                <td>{currency(receipt.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ClaimDetailPage(props: {
  loadClaim: (id: number) => Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }>;
  onStatusChange: (id: number, status: ClaimRecord["status"]) => Promise<void>;
  employeeMode?: boolean;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [savingStatus, setSavingStatus] = useState<ClaimRecord["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    props.loadClaim(Number(id))
      .then((payload) => {
        setClaim(payload.claim);
        setReceipts(payload.receipts);
        setError(null);
      })
      .catch((loadError: Error) => {
        setError(loadError.message || "Could not load this claim.");
      });
  }, [id, props]);

  if (!claim) {
    return <div className="empty-state">{error ?? "Claim detail unavailable."}</div>;
  }

  const updateStatus = async (status: ClaimRecord["status"]) => {
    setSavingStatus(status);
    setFeedback(null);
    setError(null);
    try {
      await props.onStatusChange(claim.id, status);
      setClaim((current) => (current ? { ...current, status } : current));
      setFeedback(`Claim status updated to ${claimStatusLabel(status)}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this claim.");
    } finally {
      setSavingStatus(null);
    }
  };

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{claim.name}</h2>
          <p>{claim.description ?? "Employee reimbursement folder"}</p>
        </div>
        {!props.employeeMode ? (
          <div className="filter-row">
            <button
              className="secondary-action"
              type="button"
              disabled={savingStatus !== null}
              onClick={() => void updateStatus("approved")}
            >
              Approve claim
            </button>
            <button
              className="secondary-action"
              type="button"
              disabled={savingStatus !== null}
              onClick={() => void updateStatus("paid")}
            >
              Mark paid
            </button>
            <button
              className="danger-action"
              type="button"
              disabled={savingStatus !== null}
              onClick={() => void updateStatus("rejected")}
            >
              Reject claim
            </button>
          </div>
        ) : null}
      </section>
      {error ? <div className="error-banner">{error}</div> : null}
      {feedback ? <div className="success-banner">{feedback}</div> : null}

      <section className="metrics-grid">
        <MetricCard label="Claim total" value={currency(claim.totalAmount)} detail={`${receipts.length} linked receipts`} />
        <MetricCard label="Claiming employee" value={claimEmployeeLabel(claim)} detail="Claim owner" />
        <MetricCard label="Approval status" value={claimStatusLabel(claim.status)} detail="Current review state" />
        <MetricCard label="Submitted" value={claim.createdAt.slice(0, 10)} detail="Folder submission date" />
      </section>

      <section className="panel table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Category</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>{receipt.sourceFilename}</td>
                <td>{receipt.vendorName ?? "Unknown supplier"}</td>
                <td>{receipt.invoiceDate ?? "Pending"}</td>
                <td>{receipt.category ?? "Uncategorised"}</td>
                <td>{currency(receipt.totalAmount)}</td>
                <td>
                  <div className="table-action-cell">
                    <StatusPill status={receipt.status} />
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => navigate(props.employeeMode ? `/dropbox/${receipt.id}` : `/costs/${receipt.id}`)}
                    >
                      Open receipt
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function RulesPage(props: {
  rules: SupplierRule[];
  onSave: (
    payload: Partial<SupplierRule> &
      Pick<SupplierRule, "supplierMatchText" | "category" | "taxRate" | "paymentMethod" | "isActive">,
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    id: undefined as number | undefined,
    supplierMatchText: "",
    category: "",
    taxRate: "20% Standard",
    paymentMethod: "business_card" as SupplierRule["paymentMethod"],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="stack-page rules-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>{draft.id ? "Edit rule" : "Create new rule"}</h2>
          <span>Automation layer</span>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        {feedback ? <div className="success-banner">{feedback}</div> : null}
        <div className="form-grid">
          <label>
            IF Supplier Name CONTAINS
            <input value={draft.supplierMatchText} onChange={(event) => setDraft({ ...draft, supplierMatchText: event.target.value })} />
          </label>
          <label>
            THEN Category
            <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          </label>
          <label>
            Tax Rate
            <select value={draft.taxRate} onChange={(event) => setDraft({ ...draft, taxRate: event.target.value })}>
              {taxRates.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment Method
            <select
              value={draft.paymentMethod}
              onChange={(event) =>
                setDraft({ ...draft, paymentMethod: event.target.value as SupplierRule["paymentMethod"] })
              }
            >
              <option value="business_card">Business card</option>
              <option value="cash_personal">Personal spend</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </label>
          <label className="toggle-field">
            Rule Active
            <button
              className={`toggle-button${draft.isActive ? " on" : ""}`}
              type="button"
              onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
            >
              {draft.isActive ? "Active" : "Inactive"}
            </button>
          </label>
        </div>
        <div className="toolbar">
          <button
            className="primary-action"
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!draft.supplierMatchText.trim() || !draft.category.trim()) {
                setError("Supplier match text and category are required.");
                setFeedback(null);
                return;
              }
              setSaving(true);
              setError(null);
              setFeedback(null);
              try {
                await props.onSave(draft);
                setDraft({
                  id: undefined,
                  supplierMatchText: "",
                  category: "",
                  taxRate: "20% Standard",
                  paymentMethod: "business_card",
                  isActive: true,
                });
                setFeedback(draft.id ? "Rule updated." : "Rule created.");
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Could not save this rule.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : draft.id ? "Save Rule" : "Create New Rule"}
          </button>
          {draft.id ? (
            <button
              className="secondary-action"
              type="button"
              disabled={saving}
              onClick={() =>
                setDraft({
                  id: undefined,
                  supplierMatchText: "",
                  category: "",
                  taxRate: "20% Standard",
                  paymentMethod: "business_card",
                  isActive: true,
                })
              }
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Current rules</h2>
          <span>{props.rules.length} live automations</span>
        </div>
        <div className="rules-list">
          {props.rules.length ? (
            props.rules.map((rule) => (
              <article className="rule-row" key={rule.id}>
                <div>
                  <strong>IF supplier contains "{rule.supplierMatchText}"</strong>
                  <p>
                    Category = {rule.category} | Tax Rate = {rule.taxRate} | Payment Method = {rule.paymentMethod} | {rule.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="toolbar">
                  <button
                    className="secondary-action"
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setDraft({
                        id: rule.id,
                        supplierMatchText: rule.supplierMatchText,
                        category: rule.category,
                        taxRate: rule.taxRate,
                        paymentMethod: rule.paymentMethod,
                        isActive: rule.isActive,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="danger-action"
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      setError(null);
                      setFeedback(null);
                      try {
                        await props.onDelete(rule.id);
                        setFeedback("Rule deleted.");
                        if (draft.id === rule.id) {
                          setDraft({
                            id: undefined,
                            supplierMatchText: "",
                            category: "",
                            taxRate: "20% Standard",
                            paymentMethod: "business_card",
                            isActive: true,
                          });
                        }
                      } catch (deleteError) {
                        setError(deleteError instanceof Error ? deleteError.message : "Could not delete this rule.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-inline-state">
              <strong>No supplier rules created yet.</strong>
              <p>Build automation for recurring suppliers by setting category, tax rate, and payment defaults above.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReconciliationPage(props: {
  lines: ReconciliationLine[];
  onMatch: (statementLineId: number, receiptId: number) => Promise<void>;
  onCreateRequisition: (input: { provider?: string; institutionId?: string }) => Promise<{ redirectUrl: string }>;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>Bank reconciliation</h2>
          <p>Cross-reference imported statement lines against processed receipts and lock audited matches.</p>
        </div>
        <div className="toolbar">
          <button
            className="secondary-action"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setFeedback(null);
              try {
                const requisition = await props.onCreateRequisition({ provider: "truelayer" });
                window.location.href = requisition.redirectUrl;
              } catch (connectError) {
                setError(connectError instanceof Error ? connectError.message : "Could not start the bank connection.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Connecting..." : "Connect bank feed"}
          </button>
        </div>
      </section>
      {error ? <div className="error-banner">{error}</div> : null}
      {feedback ? <div className="success-banner">{feedback}</div> : null}

      <div className="reconciliation-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>Statement lines</h2>
          <span>Imported bank feed</span>
        </div>
        <div className="table-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount Spent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {props.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.statementDate ?? line.bookingDate}</td>
                  <td>{line.description ?? line.remittanceInformation}</td>
                  <td>{currency(line.amountSpent ?? line.transactionAmount)}</td>
                  <td>
                    <StatusPill status={line.status === "Open" ? "Review" : "Published"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Candidate matches</h2>
          <span>Closest date and amount proximity</span>
        </div>
        <div className="candidate-groups">
          {props.lines.length ? (
            props.lines.map((line) => (
              <article className="candidate-group" key={line.id}>
                <div className="candidate-group-header">
                  <strong>{line.remittanceInformation}</strong>
                  <span>
                    {line.statementDate ?? line.bookingDate} | {currency(line.amountSpent ?? line.transactionAmount)}
                  </span>
                </div>
                {line.candidates.length ? (
                  <div className="table-panel">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th>Receipt Date</th>
                          <th>Gross Total</th>
                          <th>Source</th>
                          <th>Match Score</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {line.candidates.map((candidate) => (
                          <tr key={candidate.id}>
                            <td>{candidate.vendorName ?? "Unknown supplier"}</td>
                            <td>{candidate.invoiceDate ?? "Pending"}</td>
                            <td>{currency(candidate.totalAmount)}</td>
                            <td>{sourceLabel(candidate.receiptSource)}</td>
                            <td>{candidate.matchScore.toFixed(2)}</td>
                            <td>
                              <div className="table-action-cell">
                                <button
                                  className="secondary-action"
                                  type="button"
                                  onClick={() => navigate(`/costs/${candidate.id}`)}
                                >
                                  Open receipt
                                </button>
                                <button
                                  className="primary-action"
                                  type="button"
                                  disabled={line.status === "Audited" || busy}
                                  onClick={async () => {
                                    setBusy(true);
                                    setError(null);
                                    setFeedback(null);
                                    try {
                                      await props.onMatch(line.id, candidate.id);
                                      setFeedback("Statement line matched and cleared.");
                                    } catch (matchError) {
                                      setError(matchError instanceof Error ? matchError.message : "Could not match this statement line.");
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                >
                                  Match & Clear
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-inline-state">
                    <strong>No candidate receipts found for this bank line.</strong>
                    <p>Upload or review more cost documents to improve matching options for this transaction.</p>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="empty-inline-state">
              <strong>No bank statement lines imported yet.</strong>
              <p>Connect a bank feed above to bring statement lines into reconciliation.</p>
            </div>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}

function RequisitionPage(props: {
  onCreateRequisition: (input: { provider?: string; institutionId?: string }) => Promise<{ redirectUrl: string }>;
}) {
  const [provider, setProvider] = useState("truelayer");
  const [institutionId, setInstitutionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>Open Banking requisitions</h2>
        <span>Read-only ledger connection</span>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="form-grid">
        <label>
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="truelayer">TrueLayer</option>
            <option value="yapily">Yapily</option>
            <option value="tink">Tink</option>
          </select>
        </label>
        <label>
          Institution Id
          <input value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="optional bank institution id" />
        </label>
      </div>
      <div className="toolbar">
        <button
          className="primary-action"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const requisition = await props.onCreateRequisition({ provider, institutionId });
              window.location.href = requisition.redirectUrl;
            } catch (createError) {
              setError(createError instanceof Error ? createError.message : "Could not start this requisition.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Starting..." : "Start bank OAuth"}
        </button>
      </div>
    </section>
  );
}

function BankCallbackPage(props: {
  onComplete: (input: {
    state: string;
    requisitionId?: string | null;
    consentId?: string | null;
  }) => Promise<{ linked: boolean; state: string; externalRequisitionId: string | null }>;
}) {
  const { onComplete } = props;
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [status, setStatus] = useState<"loading" | "linked" | "failed">("loading");
  const [message, setMessage] = useState("Completing the bank callback handshake...");
  const [externalRequisitionId, setExternalRequisitionId] = useState<string | null>(null);

  useEffect(() => {
    const nextParams = new URLSearchParams(location.search);
    const state = nextParams.get("state");
    if (!state) {
      setStatus("failed");
      setMessage("Missing callback state. The bank requisition could not be verified.");
      return;
    }

    onComplete({
      state,
      requisitionId: nextParams.get("requisition_id"),
      consentId: nextParams.get("consent_id"),
    })
      .then((result) => {
        setStatus(result.linked ? "linked" : "failed");
        setExternalRequisitionId(result.externalRequisitionId);
        setMessage(
          result.linked
            ? "The read-only bank connection has been linked and is ready for reconciliation imports."
            : "The bank callback returned, but the requisition could not be linked.",
        );
      })
      .catch((error: Error) => {
        setStatus("failed");
        setMessage(error.message || "Could not complete the bank callback.");
      });
  }, [location.search, onComplete]);

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>Bank callback received</h2>
        <span>Provider return route</span>
      </div>
      <div className="summary-list">
        <div>
          <strong>Status</strong>
          <span>{status === "loading" ? "Linking..." : status === "linked" ? "Linked" : "Failed"}</span>
        </div>
        <div>
          <strong>State</strong>
          <span>{params.get("state") ?? "Missing"}</span>
        </div>
        <div>
          <strong>Requisition</strong>
          <span>{externalRequisitionId ?? params.get("requisition_id") ?? params.get("consent_id") ?? "Pending"}</span>
        </div>
      </div>
      <p>{message}</p>
    </section>
  );
}

function SettingsPage(props: {
  settings: OrganisationSettings | null;
  onSave: (payload: Pick<OrganisationSettings, "isVatRegistered" | "defaultTaxRate">) => Promise<void>;
  onInviteEmployee: (payload: { email: string; fullName?: string }) => Promise<InviteResult>;
}) {
  const [draft, setDraft] = useState<OrganisationSettings | null>(props.settings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);

  useEffect(() => {
    setDraft(props.settings);
  }, [props.settings]);

  if (!draft) {
    return <div className="empty-state">Settings unavailable.</div>;
  }

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>{draft.organisationName}</h2>
        <span>Central company settings</span>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {feedback ? <div className="success-banner">{feedback}</div> : null}
      <div className="summary-list">
        <div>
          <strong>Organisation Profile</strong>
          <span>Organisation #{draft.organisationId}</span>
        </div>
        <div>
          <strong>VAT posture</strong>
          <span>{draft.isVatRegistered ? "VAT registered" : "No VAT registration"}</span>
        </div>
        <div>
          <strong>Default fallback tax</strong>
          <span>{draft.defaultTaxRate}</span>
        </div>
        <div>
          <strong>Parity impact</strong>
          <span>Saved changes feed both the desktop dashboard and the mobile extraction workflow.</span>
        </div>
      </div>
      <div className="form-grid">
        <label className="toggle-field">
          Company is VAT Registered
          <button
            className={`toggle-button${draft.isVatRegistered ? " on" : ""}`}
            type="button"
            disabled={saving}
            onClick={() => setDraft({ ...draft, isVatRegistered: !draft.isVatRegistered })}
          >
            {draft.isVatRegistered ? "True" : "False"}
          </button>
        </label>
        <label>
          Global fallback tax rate
          <select value={draft.defaultTaxRate} disabled={saving} onChange={(event) => setDraft({ ...draft, defaultTaxRate: event.target.value })}>
            {taxRates.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        Turn VAT off to force downstream extraction toward gross-only treatment and a `No VAT` tax tier across
        incoming receipt processing.
      </p>
      <div className="toolbar">
        <button
          className="primary-action"
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            setFeedback(null);
            try {
              await props.onSave({
                isVatRegistered: draft.isVatRegistered,
                defaultTaxRate: draft.defaultTaxRate,
              });
              setFeedback("Organisation settings saved.");
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : "Could not save these settings.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
      <div className="panel-divider" />
      <div className="panel-heading">
        <h2>Invite an employee</h2>
        <span>Standard employee access</span>
      </div>
      {inviteError ? <div className="error-banner">{inviteError}</div> : null}
      {inviteFeedback ? <div className="success-banner">{inviteFeedback}</div> : null}
      <div className="form-grid">
        <label>
          Employee name
          <input
            value={inviteName}
            disabled={inviteBusy}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Optional full name"
          />
        </label>
        <label>
          Employee email
          <input
            type="email"
            value={inviteEmail}
            disabled={inviteBusy}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="employee@company.co.uk"
          />
        </label>
      </div>
      <p>
        Send a standard employee invite so staff can submit receipts into the synced Exdox workspace from
        mobile and web.
      </p>
      <div className="toolbar">
        <button
          className="primary-action"
          type="button"
          disabled={inviteBusy || !inviteEmail.trim()}
          onClick={async () => {
            setInviteBusy(true);
            setInviteError(null);
            setInviteFeedback(null);
            try {
              const invite = await props.onInviteEmployee({
                email: inviteEmail.trim(),
                fullName: inviteName.trim() || undefined,
              });
              setLastInvite(invite);
              setInviteFeedback(`Invite created for ${invite.email}.`);
              setInviteName("");
              setInviteEmail("");
            } catch (saveError) {
              setInviteError(saveError instanceof Error ? saveError.message : "Could not create the invite.");
            } finally {
              setInviteBusy(false);
            }
          }}
        >
          {inviteBusy ? "Sending..." : "Send invite"}
        </button>
      </div>
      {lastInvite ? (
        <div className="summary-list">
          <div>
            <strong>Latest invite</strong>
            <span>{lastInvite.email}</span>
          </div>
          <div>
            <strong>Delivery</strong>
            <span>{lastInvite.delivery?.delivered ? `Sent by ${lastInvite.delivery.method}` : "Invite created"}</span>
          </div>
          <div>
            <strong>Status</strong>
            <span>{lastInvite.status}</span>
          </div>
          <div>
            <strong>Invite link</strong>
            <span>
              <a href={toWebsiteInviteLink(lastInvite.inviteLink)} target="_blank" rel="noreferrer">
                Open invite link
              </a>
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UploadButton(props: { busy: boolean; label: string; onFiles: (files: File[]) => Promise<void> }) {
  return (
    <label className="upload-button">
      {props.busy ? "Uploading..." : props.label}
      <input
        type="file"
        multiple
        hidden
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) {
            await props.onFiles(files);
          }
          event.target.value = "";
        }}
      />
    </label>
  );
}

function UploadDropZone(props: {
  title: string;
  subtitle: string;
  busy: boolean;
  onFiles: (files: File[]) => Promise<void>;
}) {
  const [dragActive, setDragActive] = useState(false);

  const pushFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (!files.length || props.busy) {
      return;
    }
    await props.onFiles(files);
  };

  return (
    <section
      className={`panel dropzone-panel${dragActive ? " active" : ""}${props.busy ? " busy" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!dragActive) {
          setDragActive(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        const relatedTarget = event.relatedTarget as Node | null;
        if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
          setDragActive(false);
        }
      }}
      onDrop={async (event) => {
        event.preventDefault();
        setDragActive(false);
        await pushFiles(event.dataTransfer.files);
      }}
    >
      <div>
        <p className="dropzone-kicker">Bulk ingestion API</p>
        <h3>{props.title}</h3>
        <p>{props.subtitle}</p>
      </div>
      <label className="dropzone-picker">
        {props.busy ? "Uploading files..." : "Choose files"}
        <input
          type="file"
          multiple
          hidden
          onChange={async (event) => {
            await pushFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <span className="dropzone-hint">
        Drag multiple PDFs or images here, or use the picker to send them to the processing queue.
      </span>
    </section>
  );
}

function MetricCard(props: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </article>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "paid" | "rejected" | InboxStatus }) {
  const normalized =
    status === "pending"
      ? "Review"
      : status === "approved"
        ? "Ready"
        : status === "paid"
          ? "Published"
          : status === "rejected"
            ? "Processing"
            : status;
  return <span className={`status-pill status-${normalized.toLowerCase()}`}>{status}</span>;
}

function LoginState(props: {
  busy: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-state">
      <div className="login-shell">
        <header className="login-header">
          <div className="login-brand">
            <img src={brandMarkSrc} alt="" />
            <strong>exdox</strong>
          </div>
        </header>
        <main className="login-main">
          <section className="login-visual" aria-label="Secure receipt capture">
            <img src="/branding/exdox-login-hero.png" alt="Cafe owner capturing a receipt with exdox" />
            <span className="login-callout callout-snap">Snap &amp; Sync</span>
            <span className="login-callout callout-hmrc">HMRC-Compliant Capture</span>
            <span className="login-callout callout-total">Total Expense View</span>
          </section>
          <div className="login-panel">
            <h1>Log in to your exdox Workspace</h1>
            <p>Use the same details as your mobile app.</p>
            <form
              className="login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await props.onLogin(email, password);
              }}
            >
              <label>
                Registered Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your.name@company.co.uk"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>
              {props.error ? <div className="error-banner">{props.error}</div> : null}
              <button className="primary-action login-submit" type="submit" disabled={props.busy}>
                {props.busy ? "Signing in..." : "Get Access"}
              </button>
            </form>
            <div className="login-links">
              <a href="mailto:hello@exdox.co.uk?subject=Password%20reset%20request">Forgot Password?</a>
              <a href="mailto:hello@exdox.co.uk?subject=Demo%20access%20request">Request Demo Access</a>
            </div>
          </div>
        </main>
        <footer className="login-footer">
          <span>
            <Link to="/#company">Company</Link>
            {" | "}
            <a href="mailto:hello@exdox.co.uk?subject=Privacy%20request">Privacy</a>
          </span>
          <span>Compatible with Xero, QuickBooks and Sage</span>
          <span>Copyright {new Date().getFullYear()} exdox.co.uk</span>
        </footer>
      </div>
    </div>
  );
}

function RegisterState(props: {
  busy: boolean;
  error: string | null;
  initialEmail: string;
  inviteToken: string;
  onRegister: (input: {
    email: string;
    password: string;
    fullName?: string;
    organisationName?: string;
    inviteToken?: string;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState(props.initialEmail);
  const [password, setPassword] = useState("");
  const invitedFlow = Boolean(props.inviteToken);

  useEffect(() => {
    setEmail(props.initialEmail);
  }, [props.initialEmail]);

  return (
    <div className="login-state">
      <div className="login-shell">
        <header className="login-header">
          <div className="login-brand">
            <img src={brandMarkSrc} alt="" />
            <strong>exdox</strong>
          </div>
        </header>
        <main className="login-main">
          <section className="login-visual" aria-label="Receipt capture and finance review">
            <img src="/branding/exdox-platform-hero.png" alt="Exdox finance workspace with synced receipt controls" />
            <span className="login-callout callout-snap">Invite &amp; Onboard</span>
            <span className="login-callout callout-hmrc">Web + Mobile Sync</span>
            <span className="login-callout callout-total">Receipt Review Ready</span>
          </section>
          <div className="login-panel">
            <h1>{invitedFlow ? "Activate your exdox account" : "Create your exdox workspace"}</h1>
            <p>
              {invitedFlow
                ? "Finish setting your password so your invited workspace is ready on web and mobile."
                : "Start a business-admin workspace that uses the same live API and data model as the mobile app."}
            </p>
            <form
              className="login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await props.onRegister({
                  email,
                  password,
                  fullName: fullName || undefined,
                  organisationName: invitedFlow ? undefined : organisationName || undefined,
                  inviteToken: props.inviteToken || undefined,
                });
              }}
            >
              <label>
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                />
              </label>
              {!invitedFlow ? (
                <label>
                  Organisation name
                  <input
                    type="text"
                    autoComplete="organization"
                    value={organisationName}
                    onChange={(event) => setOrganisationName(event.target.value)}
                    placeholder="Your business or organisation"
                  />
                </label>
              ) : null}
              <label>
                Registered Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your.name@company.co.uk"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </label>
              {props.error ? <div className="error-banner">{props.error}</div> : null}
              <button className="primary-action login-submit" type="submit" disabled={props.busy}>
                {props.busy ? "Creating access..." : invitedFlow ? "Activate account" : "Create workspace"}
              </button>
            </form>
            <div className="login-links">
              <Link to="/login">Already have an account? Log in</Link>
              <a href="mailto:hello@exdox.co.uk?subject=Exdox%20support%20request">Need help activating?</a>
            </div>
          </div>
        </main>
        <footer className="login-footer">
          <span>
            <Link to="/#pricing">Pricing</Link>
            {" | "}
            <a href="mailto:hello@exdox.co.uk?subject=Security%20request">Security</a>
          </span>
          <span>Compatible with Xero, QuickBooks and Sage</span>
          <span>Copyright {new Date().getFullYear()} exdox.co.uk</span>
        </footer>
      </div>
    </div>
  );
}

function PublicHome() {
  return (
    <div className="public-home">
      <header className="public-header">
        <Link className="public-brand" to="/" aria-label="exdox home">
          <img src={brandMarkSrc} alt="" />
          <strong>exdox</strong>
        </Link>
        <nav className="public-nav" aria-label="Website">
          <a className="active" href="#home">Home</a>
          <a href="#platform">Platform</a>
          <a href="#integration">Integration</a>
          <a href="#pricing">Pricing</a>
          <a href="#company">Company</a>
        </nav>
        <div className="public-actions">
          <Link to="/login">Log In</Link>
          <a className="public-button" href="mailto:hello@exdox.co.uk">Request Demo</a>
        </div>
      </header>

      <main>
        <section className="public-hero" id="home">
          <div className="public-hero-copy">
            <h1>Capture, review and publish business spend without chasing paper.</h1>
            <p>
              exdox gives your team the same synced workspace across mobile and web for receipt capture,
              invoice review, document vault storage, expense claims, supplier rules and bank-led reconciliation.
            </p>
            <Link className="public-primary" to="/register">Start Your Free Trial</Link>
            <span>No credit card required.</span>
          </div>
          <img src="/branding/exdox-platform-hero.png" alt="Connected exdox accounting workspace" />
        </section>

        <section className="capabilities-band" id="platform">
          <h2>Key Platform Capabilities</h2>
          <div className="capabilities-grid">
            <article><NavIcon name="costs" /><strong>Receipt & Invoice Capture</strong><span>Mobile and web submission</span></article>
            <article><NavIcon name="rules" /><strong>Supplier Rules</strong><span>Consistent coding and tax defaults</span></article>
            <article><NavIcon name="claims" /><strong>Expense Claims</strong><span>Review, approve and publish faster</span></article>
            <article><NavIcon name="claims" /><strong>Document Vault</strong><span>Archive reference files separately</span></article>
            <article><NavIcon name="bank" /><strong>Bank Reconciliation</strong><span>Match evidence back to spend</span></article>
          </div>
        </section>

        <section className="workflow-band">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Feature Coverage</p>
              <h2>Built around the same workflow finance teams expect from Dext</h2>
            </div>
            <p>
              Capture, review, rules, approvals, open banking and reconciliation are all available inside the
              same Exdox web workspace that syncs with the mobile app.
            </p>
          </div>
          <div className="workflow-grid">
            <article className="workflow-card">
              <strong>Capture any way your team works</strong>
              <ul>
                <li>Mobile receipt capture in the app</li>
                <li>Drag-and-drop uploads in costs and sales inboxes</li>
                <li>Dedicated employee drop box for non-admin users</li>
                <li>Separate workspaces for purchase and sales documents</li>
              </ul>
            </article>
            <article className="workflow-card">
              <strong>Automate the review layer</strong>
              <ul>
                <li>Supplier rules for category, tax rate and payment method</li>
                <li>VAT-aware editable totals, net and tax fields</li>
                <li>Needs-review queues across costs, sales and claims</li>
                <li>Audit-friendly document detail editing before publish</li>
              </ul>
            </article>
            <article className="workflow-card">
              <strong>Close the loop with finance controls</strong>
              <ul>
                <li>Dedicated vault workspace for archived evidence</li>
                <li>Open banking requisitions and callback handling</li>
                <li>Reconciliation matching against imported bank lines</li>
                <li>Organisation-level VAT settings and tax defaults</li>
                <li>Live sync with the same receipt records used in mobile</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="integration-band" id="integration">
          <div>
            <h2>Simple Integration</h2>
            <p>
              Keep capture, review and accounting data moving together across your finance stack with
              synced web and mobile workflows, organisation switching, and bank-linked reconciliation.
            </p>
          </div>
          <div className="integration-names" aria-label="Compatible accounting platforms">
            <strong>Sage</strong>
            <strong>Xero</strong>
            <strong>QuickBooks</strong>
          </div>
        </section>

        <section className="pricing-band" id="pricing">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Pricing</p>
              <h2>Roll out Exdox by workflow, not by disconnected tools</h2>
            </div>
            <p>
              Start with employee capture, then layer in supplier rules, claims, tax controls and
              reconciliation as your finance process matures.
            </p>
          </div>
          <div className="pricing-grid">
            <article className="pricing-card">
              <span>Employee Capture</span>
              <strong>Drop box uploads</strong>
              <p>For teams who need staff to submit receipts without opening the full finance control surface.</p>
            </article>
            <article className="pricing-card featured">
              <span>Business Control</span>
              <strong>Costs, sales and claims</strong>
              <p>For businesses running receipt review, invoice handling, tax editing and approval workflows.</p>
            </article>
            <article className="pricing-card">
              <span>Finance Ops</span>
              <strong>Rules and bank matching</strong>
              <p>For organisations that want supplier automation, vault storage, open banking connections and reconciliation support.</p>
            </article>
          </div>
          <div className="section-actions">
            <a className="public-button" href="mailto:hello@exdox.co.uk?subject=Pricing%20request">Request Pricing</a>
            <Link className="secondary-inline-link" to="/register">Start Free Trial</Link>
          </div>
        </section>

        <section className="company-band" id="company">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Company</p>
              <h2>One evidence trail across mobile capture and the web workspace</h2>
            </div>
            <p>
              Exdox is designed so the same organisation-scoped records stay visible across app and web,
              with review state, tax edits and document actions remaining in sync.
            </p>
          </div>
          <div className="company-grid">
            <article className="company-card">
              <strong>Secure operational model</strong>
              <p>Organisation-scoped routes, authenticated sessions and protected receipt asset retrieval.</p>
            </article>
            <article className="company-card">
              <strong>Review-ready audit trail</strong>
              <p>Receipts, vault files, sales evidence, claims, supplier rules and reconciliation status live in one workspace.</p>
            </article>
            <article className="company-card">
              <strong>Built for finance teams</strong>
              <p>Business admins get the full control surface while employees can still submit directly through drop box flows.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    costs: <><path d="M6 3h12l2 5-2 5H6L4 8l2-5Z" /><path d="M8 17h8M9 21h6" /></>,
    sales: <><path d="M4 6h16v12H4z" /><path d="m4 9 8 5 8-5" /></>,
    claims: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 13h6M10 17h6" /></>,
    rules: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><path d="M10.5 10.5 13.5 13.5M16 3v4M3 16h4" /></>,
    bank: <><path d="m3 9 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 21h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    "open-banking": <><path d="M4 7h16v13H4zM8 4h8l2 3H6l2-3Z" /><path d="M8 11h8M8 15h5" /></>,
  };

  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name] ?? paths.overview}</svg>;
}

function currency(value: number | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value ?? 0);
}

function sumGross(records: ReceiptRecord[]) {
  return records.reduce((sum, record) => sum + (record.totalAmount ?? 0), 0);
}

function buildPendingReceipts(
  session: SessionState,
  workspaceContext: "cost" | "sales" | "vault",
  files: File[],
): ReceiptRecord[] {
  const now = new Date().toISOString();
  const baseId = Date.now();

  return files.map((file, index) => ({
    id: -(baseId + index),
    organisationId: session.activeOrganisationId,
    workspaceContext,
    paymentMethod:
      workspaceContext === "sales" ? "bank_transfer" : workspaceContext === "vault" ? "not_applicable" : "business_card",
    claimId: null,
    status: "Processing",
    category:
      workspaceContext === "sales" ? "Accounts receivable" : workspaceContext === "vault" ? "Vault" : "Uncategorised",
    description: null,
    customer: null,
    receiptSource: "web_upload",
    sourceFilename: file.name,
    sourceMimeType: file.type || "application/octet-stream",
    s3Bucket: "",
    s3Key: "",
    vendorName: null,
    invoiceDate: null,
    dueDate: null,
    invoiceNumber: null,
    currency: "GBP",
    totalAmount: null,
    netAmount: null,
    vatAmount: null,
    taxRateApplied: null,
    needsReview: true,
    rawTextSummary: "Uploading into processing queue...",
    createdAt: now,
    updatedAt: now,
  }));
}

function claimEmployeeLabel(claim: ClaimRecord) {
  return claim.createdByUserId ? `User ${claim.createdByUserId}` : "Employee pending";
}

function claimStatusLabel(status: ClaimRecord["status"]) {
  return status === "pending"
    ? "Pending"
    : status === "approved"
      ? "Approved"
      : status === "paid"
        ? "Paid"
        : "Rejected";
}

function claimStatusToPill(status: ClaimRecord["status"]): "Review" | "Ready" | "Published" | "Processing" {
  return status === "pending"
    ? "Review"
    : status === "approved"
      ? "Ready"
      : status === "rejected"
        ? "Processing"
        : "Published";
}

function sourceLabel(source: ReceiptRecord["receiptSource"]) {
  return source === "web_upload" ? "Web" : source === "bank_import" ? "Bank" : source === "email" ? "Email" : "Mobile";
}

function isBusinessAdmin(session: SessionState) {
  return session.user.role === "Business_Admin";
}

function isRouteAllowed(session: SessionState, pathname: string) {
  const allowedRoutes = session.allowedWebRoutes;
  if (!allowedRoutes?.length) {
    return isBusinessAdmin(session) ? pathname !== "/dropbox" : pathname === "/dropbox" || pathname.startsWith("/claims");
  }

  if (isBusinessAdmin(session) && pathname.startsWith("/vault")) {
    return true;
  }

  return allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getDefaultRoute(session: SessionState) {
  const allowedRoutes = session.allowedWebRoutes;
  if (allowedRoutes?.length) {
    return allowedRoutes[0]!;
  }

  return isBusinessAdmin(session) ? "/overview" : "/dropbox";
}

function getAttentionRoute(session: SessionState, store: AppStore) {
  if (!isBusinessAdmin(session)) {
    if (store.claims.some((claim) => claim.status === "pending")) {
      return "/claims";
    }
    return "/dropbox";
  }
  if (store.costs.some((receipt) => receipt.needsReview)) {
    return "/costs";
  }
  if (store.sales.some((receipt) => receipt.needsReview)) {
    return "/sales";
  }
  if (store.claims.some((claim) => claim.status === "pending")) {
    return "/claims";
  }
  if (store.reconciliation.some((line) => line.status === "Open")) {
    return "/reconciliation";
  }
  return getDefaultRoute(session);
}

function routeTitle(pathname: string) {
  if (pathname.startsWith("/costs/")) {
    return "Cost Workspace";
  }
  if (pathname.startsWith("/sales/")) {
    return "Sales Workspace";
  }
  if (pathname.startsWith("/claims/")) {
    return "Claim Review";
  }
  if (pathname.startsWith("/bank-callback")) {
    return "Bank Callback";
  }
  if (pathname.startsWith("/dropbox")) {
    return "My Drop Box";
  }

  const matched = navItems.find((item) => pathname.startsWith(item.to));
  return matched?.label ?? "Overview";
}

function documentTypeLabel(documentType: ReceiptRecord["documentType"]) {
  if (documentType === "invoice") {
    return "Invoice";
  }
  if (documentType === "receipt") {
    return "Receipt";
  }
  return "Unknown";
}

function formatConfidence(
  confidenceScore: ReceiptRecord["confidenceScore"],
  confidenceSource: ReceiptRecord["confidenceSource"],
) {
  if (confidenceScore === null || confidenceScore === undefined) {
    return "Not available";
  }

  const percentage = `${Math.round(confidenceScore * 100)}%`;
  return confidenceSource && confidenceSource !== "unavailable" ? `${percentage} (${confidenceSource})` : percentage;
}

function toWebsiteInviteLink(inviteLink: string) {
  if (typeof window === "undefined") {
    return inviteLink;
  }

  try {
    const queryStart = inviteLink.indexOf("?");
    const query = queryStart >= 0 ? inviteLink.slice(queryStart + 1) : "";
    const params = new URLSearchParams(query);
    if (!params.get("inviteToken")) {
      return inviteLink;
    }
    return `${window.location.origin}/register?${params.toString()}`;
  } catch {
    return inviteLink;
  }
}

