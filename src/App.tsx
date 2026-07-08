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

    Promise.all([
      fetchSession(stored.token),
      listReceipts(stored.token, "cost"),
      listReceipts(stored.token, "sales"),
      listClaims(stored.token),
      listRules(stored.token),
      listReconciliation(stored.token),
      getSettings(stored.token),
    ])
      .then(([nextSession, costs, sales, claims, rules, reconciliation, settings]) => {
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

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/overview" replace />}
      />
      <Route
        path="/*"
        element={
          <DashboardShell
            session={session}
            store={store}
            error={error}
            onUpload={async (workspaceContext, files) => {
              await uploadDocuments(session.token, workspaceContext, files);
              const refreshed = await listReceipts(session.token, workspaceContext);
              setStore((current) => ({
                ...current,
                [workspaceContext === "cost" ? "costs" : "sales"]: refreshed,
              }));
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
            onSettingsSave={async (payload) => {
              const saved = await saveSettings(session.token, payload);
              setStore((current) => ({
                ...current,
                settings: saved,
              }));
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
  onSettingsSave: (payload: Pick<OrganisationSettings, "isVatRegistered" | "defaultTaxRate">) => Promise<void>;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null }>;
  loadClaim: (id: number) => Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }>;
}) {
  const location = useLocation();
  const [uploadBusy, setUploadBusy] = useState(false);

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
            {navItems.map((item) => (
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
            <h1>{routeTitle(location.pathname)}</h1>
          </div>
          <div className="topbar-actions">
            <select className="org-selector" defaultValue={props.session.activeOrganisationId}>
              {props.session.organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
            <button className="icon-button" type="button" aria-label="Notifications">
              3
            </button>
            <UploadButton
              busy={uploadBusy}
              onFiles={async (files) => {
                const workspaceContext = location.pathname.startsWith("/sales") ? "sales" : "cost";
                setUploadBusy(true);
                try {
                  await props.onUpload(workspaceContext, files);
                } finally {
                  setUploadBusy(false);
                }
              }}
            />
          </div>
        </header>

        {props.error ? <div className="error-banner">{props.error}</div> : null}

        <Routes>
          <Route path="/overview" element={<OverviewPage store={props.store} />} />
          <Route
            path="/costs"
            element={<InboxPage title="Costs Inbox" records={props.store.costs} basePath="/costs" />}
          />
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
          <Route
            path="/sales"
            element={<InboxPage title="Sales Inbox" records={props.store.sales} basePath="/sales" />}
          />
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
          <Route path="/claims" element={<ClaimsPage claims={props.store.claims} />} />
          <Route
            path="/claims/:id"
            element={<ClaimDetailPage onStatusChange={props.onClaimStatusChange} loadClaim={props.loadClaim} />}
          />
          <Route
            path="/rules"
            element={
              <RulesPage rules={props.store.rules} onSave={props.onRuleSave} onDelete={props.onRuleDelete} />
            }
          />
          <Route
            path="/reconciliation"
            element={
              <ReconciliationPage lines={props.store.reconciliation} onMatch={props.onMatch} />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage settings={props.store.settings} onSave={props.onSettingsSave} />
            }
          />
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
                  {rule.category} · {rule.taxRate} · {rule.paymentMethod}
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
}: {
  title: string;
  records: ReceiptRecord[];
  basePath: "/costs" | "/sales";
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
            <span>{currency(claim.totalAmount)} total</span>
            <span>{claim.documentCount} receipt lines</span>
            <span>{claim.createdAt.slice(0, 10)}</span>
            <StatusPill status={claim.status === "pending" ? "Review" : claim.status === "approved" ? "Ready" : "Published"} />
          </button>
        ))}
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
          <h2>Create new rule</h2>
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
        </div>
        <div className="toolbar">
          <button
            className="primary-action"
            type="button"
            onClick={async () => {
              await props.onSave(draft);
              setDraft({
                supplierMatchText: "",
                category: "",
                taxRate: "20% Standard",
                paymentMethod: "business_card",
                isActive: true,
              });
            }}
          >
            Create New Rule
          </button>
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
                  Category = {rule.category} · Tax Rate = {rule.taxRate} · Payment Method = {rule.paymentMethod}
                </p>
              </div>
              <button className="danger-action" type="button" onClick={() => props.onDelete(rule.id)}>
                Delete
              </button>
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
}) {
  return (
    <div className="reconciliation-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>Statement lines</h2>
          <span>Imported bank feed</span>
        </div>
        <div className="recon-grid">
          {props.lines.map((line) => (
            <article className="recon-line" key={line.id}>
              <div>
                <strong>{line.description}</strong>
                <p>
                  {line.statementDate} · {currency(line.amountSpent)}
                </p>
              </div>
              <StatusPill status={line.status === "Open" ? "Review" : "Published"} />
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Candidate matches</h2>
          <span>Closest date and amount proximity</span>
        </div>
        <div className="recon-grid">
          {props.lines.map((line) => (
            <article className="candidate-group" key={line.id}>
              <strong>{line.description}</strong>
              {line.candidates.map((candidate) => (
                <div className="candidate-row" key={candidate.id}>
                  <div>
                    <span>{candidate.vendorName ?? "Unknown supplier"}</span>
                    <p>
                      {candidate.invoiceDate ?? "Pending"} · {currency(candidate.totalAmount)} · score{" "}
                      {candidate.matchScore.toFixed(2)}
                    </p>
                  </div>
                  <button
                    className="primary-action"
                    type="button"
                    disabled={line.status === "Audited"}
                    onClick={() => props.onMatch(line.id, candidate.id)}
                  >
                    Match & Clear
                  </button>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </div>
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

function UploadButton(props: { busy: boolean; onFiles: (files: File[]) => Promise<void> }) {
  return (
    <label className="upload-button">
      {props.busy ? "Uploading..." : "Quick Upload"}
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

function sourceLabel(source: ReceiptRecord["receiptSource"]) {
  return source === "web_upload" ? "Web" : source === "bank_import" ? "Bank" : source === "email" ? "Email" : "Mobile";
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

  const matched = navItems.find((item) => pathname.startsWith(item.to));
  return matched?.label ?? "Overview";
}
