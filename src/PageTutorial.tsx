import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type TargetName = "title" | "content" | "actions" | "navigation";
type TutorialStep = { title: string; body: string; target: TargetName };
type TutorialCopy = { label: string; purpose: string; work: string; actions: string };

const copy: Record<string, TutorialCopy> = {
  overview: { label: "Overview", purpose: "This is your live workspace summary. Its totals combine the records held in Costs, Sales, Vault, and Claims.", work: "Start with cards or rows showing work that needs attention. Select one to open the matching filtered list and deal with the underlying records.", actions: "Use the header to switch organisation, open the combined Attention queue, create claims, or upload documents." },
  attention: { label: "Attention", purpose: "This page brings together work that needs a person to act, including document reviews, claims, billing, and bank matches.", work: "Open an item to go directly to the relevant record or filtered queue. Complete the requested check there and this list will update with the workspace.", actions: "The header action count is a shortcut back to this queue from any business page." },
  health: { label: "Workspace Health", purpose: "Workspace Health shows record-quality issues and how far documents and claims have progressed.", work: "Select a metric or workspace row to open affected records. Fix unreadable uploads or missing details, then save the review so the issue can clear.", actions: "Uploads and claim actions remain available in the header while you investigate a health item." },
  workflows: { label: "Workflows", purpose: "This page shows how documents enter Exdox and move through processing, review, approval, publishing, and completion.", work: "Use stage cards and recent activity to find a queue. Select a stage to open the relevant Costs, Sales, Vault, or Claims records.", actions: "Header uploads add new work to the correct lane; Attention collects anything requiring intervention." },
  analytics: { label: "Analytics", purpose: "Analytics reports on paid Costs and paid Sales for the selected reporting period.", work: "Choose a date range first. Totals, charts, forecast, cashflow, ledger, and CSV exports all follow the same inclusive range.", actions: "Use the page export controls for reporting; header uploads are for adding source documents." },
  automation: { label: "Automation", purpose: "Automation shows where saved rules help the workspace and where manual review remains.", work: "Follow supplier or customer rule links to add reliable defaults. Rules help repeat documents, but unusual records should still be checked.", actions: "Add documents with the header, then see whether they were automated or returned for attention." },
  integrations: { label: "Integrations", purpose: "Integrations connects Exdox to accounting services and controls mappings used when approved records are published.", work: "Connect or select the accounting organisation, refresh its lists, then map cost, sales, VAT, tracking, and bank-account defaults before saving.", actions: "Connection and save controls are inside this page. Billing may need to be active, or trial access unlocked, before publishing." },
  costs: { label: "Costs Inbox", purpose: "Costs Inbox contains purchase receipts, supplier bills, and mileage costs for review and payment handling.", work: "Filter by status, category, person, source, or date. Open a row, check its evidence and fields, then save and approve it.", actions: "Upload Costs adds documents. Approved personal-spend costs can enter a reimbursement summary and be marked paid after payment is confirmed." },
  cost_review: { label: "Cost Review", purpose: "This workspace shows the original evidence beside the extracted or submitted cost details.", work: "Compare every field with the evidence, correct inaccuracies, and save. Use zoom for small text or switch mileage proofs when available.", actions: "The bottom action bar handles approval, return, publishing, payment, or deletion according to the record state and plan." },
  sales: { label: "Sales Inbox", purpose: "Sales Inbox contains uploaded and created sales records, kept separate from purchase Costs.", work: "Filter by lifecycle state, category, customer, owner, source, or date. Open a row to verify seller, customer, value, VAT, and status.", actions: "Upload Sales adds evidence; Sales management creates documents, manages customers, and tracks submissions." },
  sales_manage: { label: "Sales Documents", purpose: "Create and manage native invoices, quotes, and credit notes here.", work: "Choose the document type and customer, add VAT-rated lines, save the draft, then issue it when correct. Payments update the balance.", actions: "Page controls issue, email, download, convert, or record payment. Uploaded Sales remain in Sales Inbox." },
  sales_customers: { label: "Sales Customers", purpose: "This customer directory is used by native sales documents and customer matching.", work: "Add or edit complete details, import CSV records when useful, and remove only customers no longer needed.", actions: "Customer transfer with a connected accounting platform is managed from Integrations." },
  sales_submissions: { label: "Sales Submissions", purpose: "This page records how Sales reached Exdox and shows the account's private submission address.", work: "Review mobile, web, email, and native submissions. Rotate the address if it has been exposed or should stop receiving forwarded mail.", actions: "Use Upload Sales for browser files; create native sales documents from Sales management." },
  sales_review: { label: "Sales Review", purpose: "This workspace shows sales evidence beside seller, customer, value, VAT, and workflow details.", work: "Compare the document with the fields, correct extraction errors, and save before approval or publishing.", actions: "The bottom bar provides the valid review, publish, payment, and deletion actions for the current state." },
  vault: { label: "Document Vault", purpose: "Vault stores supporting business documents that are searchable but are not Costs or Sales.", work: "Filter the list, open a document, and check its title, category, date, and evidence. Resolve Processing or Needs review items.", actions: "Upload Vault adds files without mixing them into accounting inboxes." },
  vault_review: { label: "Vault Document", purpose: "This page displays the protected Vault file and its searchable details.", work: "Check the preview, correct the description or categorisation when needed, and save the details.", actions: "Page actions let you save, download, or delete according to your access." },
  claims: { label: "Expense Claims", purpose: "Claims group personal-spend purchases for reimbursement and track approval and payment.", work: "Filter by status, type, or date, then open a claim to inspect receipts or mileage. Empty drafts remain under All statuses.", actions: "Create claim selects eligible purchases; Create mileage claim records a journey and its evidence." },
  create_claim: { label: "Create Claim", purpose: "Create a reimbursement claim from eligible personal-spend purchases belonging to the signed-in user.", work: "Name the claim, select purchases, check the total, and submit. A purchase can belong to only one active claim.", actions: "Submit when the selected receipts are correct, or return to Claims if you are not ready." },
  create_mileage: { label: "Create Mileage Claim", purpose: "Create a structured mileage claim with its journey, distance, requested rate, and proof.", work: "Enter postcodes, miles, rate, and description. Add clear evidence where required, then check the calculated total.", actions: "Submitting sends the journey into the normal approval workflow and business Costs queue." },
  claim_review: { label: "Claim Review", purpose: "This page brings together claim details, attached receipts or mileage evidence, and approval state.", work: "Check the claimant, purpose, total, and every supporting item. Pending mileage fields can be corrected before approval.", actions: "Available controls let an authorised user save, approve, reject, publish, pay, add evidence, or delete based on state." },
  supplier_rules: { label: "Supplier Rules", purpose: "Supplier Rules apply repeat defaults to matching purchase documents.", work: "Enter reliable supplier text, then choose its usual category, VAT, and payment method. Keep it active only while those defaults remain dependable.", actions: "Save creates or updates the rule; filters help maintain existing rules. Review exceptions before approval." },
  customer_rules: { label: "Customer Rules", purpose: "Customer Rules apply repeat defaults to matching sales documents.", work: "Enter reliable customer text and choose the usual sales category and VAT. Use a narrow match to avoid unrelated customers.", actions: "Save creates or updates the rule; search, status, and sorting controls maintain the list." },
  company_cards: { label: "Company Cards", purpose: "Safe card references distinguish company-card Costs from reimbursable personal spending.", work: "Add a label, optional issuer or network, and only the last four digits. Employee exceptions handle genuine personal-card collisions.", actions: "Activate, edit, or remove references here. Exdox never asks for a full card number or security code." },
  settings: { label: "Profile/Settings", purpose: "Settings controls organisation defaults, team access, departments, mileage, VAT, and browser preferences.", work: "Work through the relevant section and save before leaving. Invite people with the least access they need, then assign departments.", actions: "Account, password, support, and permanent deletion controls are linked here." },
  delete_account: { label: "Delete Workspace", purpose: "This is permanent workspace closure. It cancels billing and removes workspace data and access.", work: "Read the full impact. Use deletion only when the whole organisation and its retained records must be permanently removed.", actions: "Password and typed confirmation are required. Return to Settings if you do not intend to close the workspace." },
  billing: { label: "Billing", purpose: "Billing shows the current plan, status, document allowance, included users, and renewal details.", work: "Review plan usage and status before changing it. Use the hosted billing portal for payment methods and subscription administration.", actions: "Start billing, manage the subscription, unlock trial accounting access, or change allowance as applicable." },
  billing_upgrade: { label: "Change Allowance", purpose: "Compare the current subscription with a higher user and document allowance.", work: "Move the selector to the required capacity and review the price, billing cycle, and included access.", actions: "Confirm the price before submitting. Higher access activates only after the subscription change succeeds." },
  recycle_bin: { label: "Recycle Bin", purpose: "Recycle Bin holds recently deleted documents and claims for a short recovery period.", work: "Check the item type, deletion date, and recovery time. Restore only records that should return to the live workspace.", actions: "Restore returns an item to its original area; items are permanently removed after the shown retention period." },
  contact: { label: "Contact Exdox", purpose: "Use this page for access, billing, onboarding, policy, or product questions.", work: "Write a clear subject and describe what you were doing, including the exact message shown. Do not send passwords or payment details.", actions: "Submit sends the message to Exdox support; the help button remains available for common questions." },
  pricing: { label: "Plans", purpose: "This signed-in view explains Exdox packages and their user and document allowances.", work: "Compare access and capacity with the active workspace's needs. Current subscription controls remain on Billing.", actions: "Use a plan or billing action only after checking allowance and billing cycle." },
  employee_costs: { label: "My Costs", purpose: "My Costs contains only your purchase receipts and shows where each is in company review.", work: "Upload clear evidence, filter to find it, and open a row to view its file and details. Eligible personal spending can enter a claim.", actions: "Use upload here or in the header, then create a claim when eligible purchases are ready." },
  employee_sales: { label: "My Sales", purpose: "My Sales contains only documents you submitted; company-wide review stays with finance.", work: "Upload a clear invoice or sales record, then filter and open items to check saved details and status.", actions: "Use Upload Sales to add evidence. Ask finance if a record needs an administrative correction." },
  employee_vault: { label: "My Vault", purpose: "My Vault stores your supporting documents when the organisation plan includes access.", work: "Upload, filter, open, and download documents here. If locked, the workspace owner must change the plan.", actions: "Use Upload Vault only for supporting records that are not Costs or Sales." },
  employee_reports: { label: "My Reports", purpose: "My Reports summarises your records and claims without exposing other employees' data.", work: "Choose the date range and status, review totals, then export the personal history you need.", actions: "Exports follow the filters shown; new submissions are added from their own pages." },
  employee_document: { label: "Document Details", purpose: "This read-only page shows your stored evidence and the details Exdox holds.", work: "Review the preview and fields. Status shows where the item is in the business workflow.", actions: "Download the source when needed, or return to your personal list." },
};

function routeKey(pathname: string, admin: boolean) {
  if (!admin) {
    if (/^\/(employee\/(sales|vault)|dropbox)\/.+/.test(pathname)) return "employee_document";
    if (pathname === "/employee/sales") return "employee_sales";
    if (pathname === "/employee/vault") return "employee_vault";
    if (pathname === "/employee/reports") return "employee_reports";
    if (pathname === "/claims/new/mileage") return "create_mileage";
    if (pathname === "/claims/new") return "create_claim";
    if (pathname.startsWith("/claims/")) return "claim_review";
    if (pathname === "/claims") return "claims";
    if (pathname === "/contact") return "contact";
    return "employee_costs";
  }
  if (pathname === "/overview/attention") return "attention";
  if (["/overview/data-health", "/overview/productivity"].includes(pathname)) return "health";
  if (["/overview/workflows", "/overview/integrations"].includes(pathname)) return "workflows";
  if (["/overview/analytics", "/overview/reports"].includes(pathname)) return "analytics";
  if (pathname === "/overview/automation") return "automation";
  if (pathname === "/settings/integrations") return "integrations";
  if (pathname === "/overview") return "overview";
  if (pathname.startsWith("/costs/")) return "cost_review";
  if (["/costs", "/dropbox"].includes(pathname)) return "costs";
  if (pathname === "/sales/manage") return "sales_manage";
  if (pathname === "/sales/customers") return "sales_customers";
  if (pathname === "/sales/submissions") return "sales_submissions";
  if (pathname.startsWith("/sales/")) return "sales_review";
  if (pathname === "/sales") return "sales";
  if (pathname.startsWith("/vault/")) return "vault_review";
  if (pathname === "/vault") return "vault";
  if (pathname === "/claims/new/mileage") return "create_mileage";
  if (pathname === "/claims/new") return "create_claim";
  if (pathname.startsWith("/claims/")) return "claim_review";
  if (pathname === "/claims") return "claims";
  if (pathname === "/rules") return "supplier_rules";
  if (pathname === "/customer-rules") return "customer_rules";
  if (pathname === "/company-cards") return "company_cards";
  if (pathname === "/settings/delete-account") return "delete_account";
  if (pathname === "/settings") return "settings";
  if (pathname === "/billing/upgrade") return "billing_upgrade";
  if (pathname === "/billing") return "billing";
  if (pathname === "/recycle-bin") return "recycle_bin";
  if (pathname === "/contact") return "contact";
  if (pathname === "/pricing") return "pricing";
  return "overview";
}

function findVisibleTarget(name: TargetName) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tutorial="${name}"]`)).find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }) ?? null;
}

export function PageTutorial(props: { pathname: string; businessAdmin: boolean; userId: number; organisationId: number }) {
  const guide = useMemo(() => {
    const key = routeKey(props.pathname, props.businessAdmin);
    const page = copy[key] ?? copy.overview!;
    const steps: TutorialStep[] = [
      { title: `Welcome to ${page.label}`, body: page.purpose, target: "title" },
      { title: "What to do here", body: page.work, target: "content" },
      { title: "Actions for this page", body: page.actions, target: "actions" },
      { title: "Move around Exdox", body: "Use the workspace navigation to switch pages. Restart any page's guide at any time with its Tutorial button.", target: "navigation" },
    ];
    return { key, label: page.label, steps };
  }, [props.pathname, props.businessAdmin]);
  const storageKey = `exdox-page-tutorial-v1-${props.userId}-${props.organisationId}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = guide.steps[stepIndex] ?? guide.steps[0]!;

  const markSeen = () => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      const seen = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
      if (!seen.includes(guide.key)) window.localStorage.setItem(storageKey, JSON.stringify([...seen, guide.key]));
    } catch { /* Browser storage may be unavailable. */ }
  };
  const close = () => { markSeen(); setActive(false); setStepIndex(0); };
  const start = () => { setStepIndex(0); setActive(true); };

  useEffect(() => {
    setActive(false);
    setStepIndex(0);
    let seen = false;
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      seen = Array.isArray(stored) && stored.includes(guide.key);
    } catch { seen = false; }
    if (seen) return;
    const timer = window.setTimeout(() => setActive(true), 500);
    return () => window.clearTimeout(timer);
  }, [guide.key, storageKey]);

  useEffect(() => {
    if (!active) return;
    const update = () => setTargetRect(findVisibleTarget(step.target)?.getBoundingClientRect() ?? null);
    if (step.target !== "content") {
      findVisibleTarget(step.target)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
    update();
    const timer = window.setTimeout(update, 350);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearTimeout(timer); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [active, step.target, stepIndex]);

  useEffect(() => {
    if (!active) return;
    nextRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") stepIndex < guide.steps.length - 1 ? setStepIndex((value) => value + 1) : close();
      if (event.key === "ArrowLeft" && stepIndex > 0) setStepIndex((value) => value - 1);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [active, stepIndex, guide.steps.length]);

  const spotlightLeft = targetRect ? Math.max(8, targetRect.left - 8) : 8;
  const spotlightTop = targetRect ? Math.max(8, targetRect.top - 8) : 8;
  const spotlight: CSSProperties | undefined = targetRect ? {
    left: spotlightLeft,
    top: spotlightTop,
    width: Math.min(window.innerWidth - spotlightLeft - 8, targetRect.width + 16),
    height: Math.min(window.innerHeight - spotlightTop - 8, targetRect.height + 16),
  } : undefined;
  const roomBelow = targetRect ? window.innerHeight - targetRect.bottom >= 300 : false;
  const roomAbove = targetRect ? targetRect.top >= 300 : false;
  const card: CSSProperties = targetRect && roomBelow ? {
    left: Math.min(Math.max(12, targetRect.left), Math.max(12, window.innerWidth - 432)),
    top: targetRect.bottom + 18,
  } : targetRect && roomAbove ? {
    left: Math.min(Math.max(12, targetRect.left), Math.max(12, window.innerWidth - 432)),
    top: targetRect.top - 18,
    transform: "translateY(-100%)",
  } : {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };

  return <>
    <button className="page-tutorial-launch" type="button" onClick={start} aria-label={`Start the ${guide.label} tutorial`}><span aria-hidden="true">?</span>Tutorial</button>
    {active ? createPortal(
      <div className="page-tutorial-layer" role="dialog" aria-modal="true" aria-labelledby="page-tutorial-title">
        <div className="page-tutorial-backdrop" />
        {spotlight ? <div className="page-tutorial-spotlight" style={spotlight} /> : null}
        <section className="page-tutorial-card" style={card}>
          <div className="page-tutorial-progress" aria-label={`Step ${stepIndex + 1} of ${guide.steps.length}`}>{guide.steps.map((_, index) => <span key={index} className={index === stepIndex ? "active" : ""} />)}</div>
          <p className="page-tutorial-kicker">{guide.label} · Step {stepIndex + 1} of {guide.steps.length}</p>
          <h2 id="page-tutorial-title">{step.title}</h2><p>{step.body}</p>
          <div className="page-tutorial-actions"><button className="page-tutorial-dismiss" type="button" onClick={close}>Dismiss tutorial</button><div>
            {stepIndex > 0 ? <button type="button" onClick={() => setStepIndex((value) => value - 1)}>Back</button> : null}
            <button ref={nextRef} className="page-tutorial-next" type="button" onClick={() => stepIndex < guide.steps.length - 1 ? setStepIndex((value) => value + 1) : close()}>{stepIndex < guide.steps.length - 1 ? "Next" : "Finish"}</button>
          </div></div>
        </section>
      </div>, document.body,
    ) : null}
  </>;
}
