import { startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  completeBankCallback,
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
  loadStoredSession,
  matchReconciliation,
  removeRule,
  saveStoredSession,
  saveReceipt,
  saveRule,
  saveSettings,
  updateClaimStatus,
  uploadDocuments,
} from "./api";
import type {
  ClaimRecord,
  InboxStatus,
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

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/costs", label: "Costs Inbox" },
  { to: "/sales", label: "Sales Inbox" },
  { to: "/claims", label: "Expense Claims" },
  { to: "/rules", label: "Supplier Rules" },
  { to: "/reconciliation", label: "Bank Reconciliation" },
  { to: "/settings", label: "Company Settings" },
  { to: "/requisitions", label: "Open Banking" },
];

type AppStore = {
  costs: ReceiptRecord[];
  sales: ReceiptRecord[];
  claims: ClaimRecord[];
  rules: SupplierRule[];
  reconciliation: ReconciliationLine[];
  settings: OrganisationSettings | null;
};

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [store, setStore] = useState<AppStore>({
    costs: [],
    sales: [],
    claims: [],
    rules: [],
    reconciliation: [],
    settings: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredSession();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetchSession(stored.token)
      .then(async (nextSession) => {
        const businessAdmin = isBusinessAdmin(nextSession);
        const [costs, sales, claims, rules, reconciliation, settings] = await Promise.all([
          listReceipts(stored.token, "cost"),
          businessAdmin ? listReceipts(stored.token, "sales") : Promise.resolve([]),
          businessAdmin ? listClaims(stored.token) : Promise.resolve([]),
          businessAdmin ? listRules(stored.token) : Promise.resolve([]),
          businessAdmin ? listReconciliation(stored.token) : Promise.resolve([]),
          businessAdmin ? getSettings(stored.token) : Promise.resolve(null),
        ]);

        setSession(nextSession);
        setStore({
          costs,
          sales,
          claims,
          rules,
          reconciliation,
          settings,
        });
      })
      .catch((nextError: Error) => {
        setError(nextError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="app-loading">Loading Exdox workspace...</div>;
  }

  if (!session) {
    return <LoginState />;
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
              const targetKey = workspaceContext === "cost" ? "costs" : "sales";
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
              }));
            }}
            onReceiptDelete={async (id) => {
              await deleteReceipt(session.token, id);
              setStore((current) => ({
                ...current,
                costs: current.costs.filter((item) => item.id !== id),
                sales: current.sales.filter((item) => item.id !== id),
              }));
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
            onActiveOrganisationChange={(organisationId) => {
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
  onUpload: (workspaceContext: "cost" | "sales", files: File[]) => Promise<void>;
  onReceiptSave: (id: number, payload: Partial<ReceiptRecord>) => Promise<void>;
  onReceiptDelete: (id: number) => Promise<void>;
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
  onActiveOrganisationChange: (organisationId: number) => void;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null }>;
  loadClaim: (id: number) => Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }>;
}) {
  const [uploadBusy, setUploadBusy] = useState(false);
  const businessAdmin = isBusinessAdmin(props.session);
  const visibleNavItems = businessAdmin
    ? navItems.filter((item) => isRouteAllowed(props.session, item.to))
    : [{ to: "/dropbox", label: "My Drop Box" }];
  const defaultRoute = getDefaultRoute(props.session);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-lockup">
            <div className="brand-mark">E</div>
            <div>
              <strong>exdox</strong>
              <span>Desktop workspace</span>
            </div>
          </div>
          <nav className="sidebar-nav" aria-label="Primary">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
                to={item.to}
              >
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
            <p className="topbar-kicker">Active workspace</p>
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
            <button className="icon-button" type="button" aria-label="Notifications">
              3
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
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
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
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      loadReceipt={props.loadReceipt}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/claims") ? (
                <Route path="/claims" element={<ClaimsPage claims={props.store.claims} />} />
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
                    <SettingsPage settings={props.store.settings} onSave={props.onSettingsSave} />
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
  const pendingClaims = store.claims.filter((claim) => claim.status === "pending").length;
  const openMatches = store.reconciliation.filter((line) => line.status === "Open").length;

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Costs in review" value={currency(totalCosts)} detail={`${store.costs.length} documents`} />
        <MetricCard label="Sales ledger" value={currency(totalSales)} detail={`${store.sales.length} invoices`} />
        <MetricCard label="Pending claims" value={String(pendingClaims)} detail="Approval workload" />
        <MetricCard label="Open bank matches" value={String(openMatches)} detail="Awaiting audit pairing" />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Inbox throughput</h2>
            <span>Last 7 days</span>
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
            {store.rules.slice(0, 4).map((rule) => (
              <li key={rule.id}>
                <strong>{rule.supplierMatchText}</strong>
                <span>
                  {rule.category} | {rule.taxRate} | {rule.paymentMethod}
                </span>
              </li>
            ))}
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
  basePath: "/costs" | "/sales";
  uploadBusy: boolean;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const deferredQuery = useDeferredValue(query);
  const navigate = useNavigate();

  const search = deferredQuery.trim().toLowerCase();
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
        title={basePath === "/costs" ? "Drop supplier bills, receipts, and invoices" : "Drop outward sales invoices and revenue evidence"}
        subtitle={
          basePath === "/costs"
            ? "Files upload straight into secure processing and land in the costs inbox with a Processing status."
            : "Bulk sales files route into the sales ledger workspace without mixing into expense review."
        }
        busy={uploadBusy}
        onFiles={onUpload}
      />

      <section className="panel table-panel">
        <table className="data-table">
          <thead>
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
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id} onClick={() => navigate(`${basePath}/${record.id}`)}>
                <td><StatusPill status={record.status} /></td>
                <td>{record.invoiceDate ?? "Pending"}</td>
                <td>{record.vendorName ?? "Unknown supplier"}</td>
                <td>{record.category ?? "Uncategorised"}</td>
                <td>{currency(record.netAmount)}</td>
                <td>{currency(record.vatAmount)}</td>
                <td>{currency(record.totalAmount)}</td>
                <td>{sourceLabel(record.receiptSource)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function DocumentWorkspacePage(props: {
  mode: "cost" | "sales";
  fallbackRecords: ReceiptRecord[];
  onSave: (id: number, payload: Partial<ReceiptRecord>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null }>;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(
    props.fallbackRecords.find((item) => item.id === Number(id)) ?? null,
  );
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    props.loadReceipt(Number(id)).then((payload) => {
      setReceipt(payload.receipt);
      setAssetUrl(payload.assetUrl);
    });
  }, [id, props]);

  if (!receipt) {
    return <div className="empty-state">Receipt workspace unavailable.</div>;
  }

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
            <strong>S3 document preview</strong>
            <p>The secure asset URL resolves here when the API is configured. Demo mode keeps the viewer stateful without exposing a bucket.</p>
          </div>
        )}
      </section>

      <section className="panel editor-panel">
        <div className="panel-heading">
          <h2>{props.mode === "cost" ? "Cost coding" : "Sales ledger coding"}</h2>
          <span>Organisation #{receipt.organisationId}</span>
        </div>

        <div className="form-grid">
          <label>
            Supplier Name
            <input value={receipt.vendorName ?? ""} onChange={(event) => setReceipt({ ...receipt, vendorName: event.target.value })} />
          </label>
          <label>
            Category
            <input value={receipt.category ?? ""} onChange={(event) => setReceipt({ ...receipt, category: event.target.value })} />
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
          <label>
            Source Channel
            <input value={sourceLabel(receipt.receiptSource)} readOnly />
          </label>
          <label className="form-span-2">
            Extraction Notes
            <textarea
              rows={4}
              value={receipt.rawTextSummary ?? ""}
              onChange={(event) => setReceipt({ ...receipt, rawTextSummary: event.target.value })}
            />
          </label>
        </div>

        <div className="toolbar">
          <button
            className="primary-action"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await props.onSave(receipt.id, receipt);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save Changes
          </button>
          <button
            className="danger-action"
            type="button"
            onClick={async () => {
              await props.onDelete(receipt.id);
              navigate(props.mode === "cost" ? "/costs" : "/sales");
            }}
          >
            Delete Document
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={async () => {
              setReceipt({ ...receipt, status: "Published" });
              await props.onSave(receipt.id, { ...receipt, status: "Published" });
            }}
          >
            Publish to Accounting Tool
          </button>
        </div>
      </section>
    </div>
  );
}

function ClaimsPage({ claims }: { claims: ClaimRecord[] }) {
  const navigate = useNavigate();

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>Expense claims</h2>
          <p>Claim folders stay separate from purchase invoices and keep reimbursement approval in its own workflow.</p>
        </div>
      </section>
      <section className="card-grid">
        {claims.map((claim) => (
          <button className="claim-card" key={claim.id} type="button" onClick={() => navigate(`/claims/${claim.id}`)}>
            <strong>{claim.name}</strong>
            <span>Total value: {currency(claim.totalAmount)}</span>
            <span>Claiming employee: {claimEmployeeLabel(claim)}</span>
            <span>Submission date: {claim.createdAt.slice(0, 10)}</span>
            <span>Approval status: {claimStatusLabel(claim.status)}</span>
            <span>{claim.documentCount} receipt lines</span>
            <StatusPill status={claimStatusToPill(claim.status)} />
          </button>
        ))}
      </section>
    </div>
  );
}

function EmployeeDropboxPage(props: {
  receipts: ReceiptRecord[];
  onUpload: (workspaceContext: "cost" | "sales", files: File[]) => Promise<void>;
  uploadBusy: boolean;
}) {
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
              <tr key={receipt.id}>
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
}) {
  const { id } = useParams();
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    props.loadClaim(Number(id)).then((payload) => {
      setClaim(payload.claim);
      setReceipts(payload.receipts);
    });
  }, [id, props]);

  if (!claim) {
    return <div className="empty-state">Claim detail unavailable.</div>;
  }

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{claim.name}</h2>
          <p>{claim.description ?? "Employee reimbursement folder"}</p>
        </div>
        <div className="filter-row">
          <button className="secondary-action" type="button" onClick={() => props.onStatusChange(claim.id, "approved")}>
            Approve claim
          </button>
          <button className="danger-action" type="button" onClick={() => props.onStatusChange(claim.id, "rejected")}>
            Reject claim
          </button>
        </div>
      </section>

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
                <td><StatusPill status={receipt.status} /></td>
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

  return (
    <div className="stack-page rules-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>{draft.id ? "Edit rule" : "Create new rule"}</h2>
          <span>Automation layer</span>
        </div>
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
            onClick={async () => {
              await props.onSave(draft);
              setDraft({
                id: undefined,
                supplierMatchText: "",
                category: "",
                taxRate: "20% Standard",
                paymentMethod: "business_card",
                isActive: true,
              });
            }}
          >
            {draft.id ? "Save Rule" : "Create New Rule"}
          </button>
          {draft.id ? (
            <button
              className="secondary-action"
              type="button"
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
          {props.rules.map((rule) => (
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
                <button className="danger-action" type="button" onClick={() => props.onDelete(rule.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
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
            onClick={async () => {
              const requisition = await props.onCreateRequisition({ provider: "truelayer" });
              window.location.href = requisition.redirectUrl;
            }}
          >
            Connect bank feed
          </button>
        </div>
      </section>

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
          {props.lines.map((line) => (
            <article className="candidate-group" key={line.id}>
              <div className="candidate-group-header">
                <strong>{line.remittanceInformation}</strong>
                <span>
                  {line.statementDate ?? line.bookingDate} | {currency(line.amountSpent ?? line.transactionAmount)}
                </span>
              </div>
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
                          <button
                            className="primary-action"
                            type="button"
                            disabled={line.status === "Audited"}
                            onClick={() => props.onMatch(line.id, candidate.id)}
                          >
                            Match & Clear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
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

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>Open Banking requisitions</h2>
        <span>Read-only ledger connection</span>
      </div>
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
          onClick={async () => {
            const requisition = await props.onCreateRequisition({ provider, institutionId });
            window.location.href = requisition.redirectUrl;
          }}
        >
          Start bank OAuth
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
}) {
  const [draft, setDraft] = useState<OrganisationSettings | null>(props.settings);

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
            onClick={() => setDraft({ ...draft, isVatRegistered: !draft.isVatRegistered })}
          >
            {draft.isVatRegistered ? "True" : "False"}
          </button>
        </label>
        <label>
          Global fallback tax rate
          <select value={draft.defaultTaxRate} onChange={(event) => setDraft({ ...draft, defaultTaxRate: event.target.value })}>
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
          onClick={() =>
            props.onSave({
              isVatRegistered: draft.isVatRegistered,
              defaultTaxRate: draft.defaultTaxRate,
            })
          }
        >
          Save settings
        </button>
      </div>
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

function LoginState() {
  return (
    <div className="login-state">
      <div className="login-panel">
        <strong>Authentication required</strong>
        <p>
          Store an `exdox-auth-session-v1` token in local storage or configure `VITE_EXDOX_API_BASE_URL`
          against the AWS-backed API. The dashboard falls back to seeded demo data until a live session is
          available.
        </p>
      </div>
    </div>
  );
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
  workspaceContext: "cost" | "sales",
  files: File[],
): ReceiptRecord[] {
  const now = new Date().toISOString();
  const baseId = Date.now();

  return files.map((file, index) => ({
    id: -(baseId + index),
    organisationId: session.activeOrganisationId,
    workspaceContext,
    paymentMethod: workspaceContext === "sales" ? "bank_transfer" : "business_card",
    claimId: null,
    status: "Processing",
    category: workspaceContext === "sales" ? "Accounts receivable" : "Uncategorised",
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
    return isBusinessAdmin(session) ? pathname !== "/dropbox" : pathname === "/dropbox";
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

