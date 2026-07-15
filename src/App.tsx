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
  createBillingCheckoutSession,
  createBillingPortalSession,
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
  BillingCycle,
  BillingPlanId,
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
  { to: "/overview/data-health", label: "Data Health", icon: "health" },
  { to: "/overview/integrations", label: "Integrations", icon: "integrations" },
  { to: "/overview/workflows", label: "Workflows", icon: "workflow" },
  { to: "/overview/productivity", label: "Productivity", icon: "productivity" },
  { to: "/overview/automation", label: "Automation", icon: "automation" },
  { to: "/costs", label: "Costs Inbox", icon: "costs" },
  { to: "/sales", label: "Sales Inbox", icon: "sales" },
  { to: "/vault", label: "Vault", icon: "claims" },
  { to: "/claims", label: "Expense Claims", icon: "claims" },
  { to: "/rules", label: "Supplier Rules", icon: "rules" },
  { to: "/reconciliation", label: "Bank Reconciliation", icon: "bank" },
  { to: "/settings", label: "Company Settings", icon: "settings" },
  { to: "/requisitions", label: "Open Banking", icon: "open-banking" },
  { to: "/billing", label: "Billing", icon: "billing" },
];

const publicNavItems = [
  { to: "/", label: "Home" },
  { to: "/platform", label: "Platform" },
  { to: "/integrations", label: "Integrations" },
  { to: "/pricing", label: "Pricing" },
  { to: "/company", label: "Company" },
] as const;

const pricingPlans: Array<{
  id: BillingPlanId;
  name: string;
  tagline: string;
  monthlyDocuments: string;
  users: string;
  cta: string;
  featured?: boolean;
  trialLabel: string;
  monthlyPrice?: number;
  annualMonthlyPrice?: number;
  bankStatementCredits?: number | null;
  lineItemCredits?: number | null;
  supplierStatementCredits?: number | null;
  unlockedWorkspaces?: string[];
  features: string[];
}> = [
  {
    id: "capture",
    name: "Capture",
    tagline: "Receipt capture and review for lean teams",
    monthlyDocuments: "250 documents / month",
    users: "5 users included",
    cta: "Start Capture Trial",
    trialLabel: "14-day trial",
    monthlyPrice: 15,
    annualMonthlyPrice: 12,
    bankStatementCredits: 10,
    lineItemCredits: 5,
    supplierStatementCredits: 5,
    unlockedWorkspaces: ["Costs", "Claims"],
    features: [
      "Mobile receipt and invoice capture",
      "Web upload for finance review",
      "Employee drop box",
      "Expense claims",
      "VAT fields and manual edits",
      "Data health follow-up",
    ],
  },
  {
    id: "control",
    name: "Control",
    tagline: "Costs, sales, claims, and approval-ready workflows",
    monthlyDocuments: "2,500 documents / month",
    users: "25 users included",
    cta: "Start Control Trial",
    trialLabel: "14-day trial",
    featured: true,
    monthlyPrice: 75,
    annualMonthlyPrice: 60,
    bankStatementCredits: 120,
    lineItemCredits: 60,
    supplierStatementCredits: 25,
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    features: [
      "Everything in Capture",
      "Sales inbox",
      "Approval-oriented review queues",
      "Queue CSV exports",
      "Shared web and mobile workspace",
      "Business-admin finance controls",
    ],
  },
  {
    id: "operations",
    name: "Operations",
    tagline: "Rules, vault storage, open banking, and reconciliation",
    monthlyDocuments: "10,000 documents / month",
    users: "100 users included",
    cta: "Start Operations Trial",
    trialLabel: "14-day trial",
    monthlyPrice: 180,
    annualMonthlyPrice: 144,
    bankStatementCredits: 500,
    lineItemCredits: 250,
    supplierStatementCredits: 100,
    unlockedWorkspaces: ["Costs", "Sales", "Vault", "Claims"],
    features: [
      "Everything in Control",
      "Supplier rules",
      "Vault archive workspace",
      "Bank reconciliation",
      "Open banking requisitions",
      "Archive-safe evidence retrieval",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom rollout for multi-entity finance teams",
    monthlyDocuments: "50,000 documents / month",
    users: "500 users included",
    cta: "Talk to Sales",
    trialLabel: "30-day rollout window",
    monthlyPrice: 455.13,
    annualMonthlyPrice: 364.1,
    bankStatementCredits: 2485,
    lineItemCredits: 2480,
    supplierStatementCredits: 500,
    unlockedWorkspaces: ["Costs", "Sales", "Vault", "Claims", "Multi-entity"],
    features: [
      "Everything in Operations",
      "Multi-entity support planning",
      "Custom rollout and onboarding",
      "Priority support",
      "Custom document/user limits",
      "Stripe-ready billing setup",
    ],
  },
];

const pricingSliderSteps: Array<{
  label: string;
  markerLabel: string;
  users: number;
  documents: number;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  bankStatementCredits: number;
  lineItemCredits: number;
  supplierStatementCredits: number;
  planId: BillingPlanId;
  accessBand: string;
  tagline: string;
  unlockedWorkspaces: string[];
  lockedWorkspaces: string[];
}> = [
  {
    label: "5 users",
    markerLabel: "5",
    users: 5,
    documents: 250,
    monthlyPrice: 15,
    annualMonthlyPrice: 12,
    bankStatementCredits: 10,
    lineItemCredits: 5,
    supplierStatementCredits: 5,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Receipt capture and review for lean teams",
    unlockedWorkspaces: ["Costs", "Claims"],
    lockedWorkspaces: ["Sales", "Vault", "Multi-entity"],
  },
  {
    label: "10 users",
    markerLabel: "10",
    users: 10,
    documents: 500,
    monthlyPrice: 30,
    annualMonthlyPrice: 24,
    bankStatementCredits: 20,
    lineItemCredits: 10,
    supplierStatementCredits: 10,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Expanded capture allowance for growing receipt volume",
    unlockedWorkspaces: ["Costs", "Claims"],
    lockedWorkspaces: ["Sales", "Vault", "Multi-entity"],
  },
  {
    label: "15 users",
    markerLabel: "15",
    users: 15,
    documents: 750,
    monthlyPrice: 45,
    annualMonthlyPrice: 36,
    bankStatementCredits: 30,
    lineItemCredits: 15,
    supplierStatementCredits: 15,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Scaled capture capacity for broader team usage",
    unlockedWorkspaces: ["Costs", "Claims"],
    lockedWorkspaces: ["Sales", "Vault", "Multi-entity"],
  },
  {
    label: "20 users",
    markerLabel: "20",
    users: 20,
    documents: 1000,
    monthlyPrice: 60,
    annualMonthlyPrice: 48,
    bankStatementCredits: 40,
    lineItemCredits: 20,
    supplierStatementCredits: 20,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Higher user allowance inside the capture package band",
    unlockedWorkspaces: ["Costs", "Claims"],
    lockedWorkspaces: ["Sales", "Vault", "Multi-entity"],
  },
  {
    label: "25 users",
    markerLabel: "25",
    users: 25,
    documents: 1250,
    monthlyPrice: 75,
    annualMonthlyPrice: 60,
    bankStatementCredits: 50,
    lineItemCredits: 25,
    supplierStatementCredits: 25,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Top end of the capture package range",
    unlockedWorkspaces: ["Costs", "Claims"],
    lockedWorkspaces: ["Sales", "Vault", "Multi-entity"],
  },
  ...Array.from({ length: 14 }, (_, index) => {
    const users = 30 + index * 5;
    const progress = (users - 25) / 75;
    const monthlyPrice = users === 80 ? 230.62 : Number((75 + progress * 105).toFixed(2));
    const annualMonthlyPrice = Number((monthlyPrice * 0.8).toFixed(2));
    const bankStatementCredits = Math.round(120 + progress * 380);
    const lineItemCredits = Math.round(60 + progress * 190);
    const supplierStatementCredits = Math.round(25 + progress * 75);
    const highlightedUsers = new Set([30, 45, 60, 75, 95]);

    return {
      label: `${users} users`,
      markerLabel: highlightedUsers.has(users) ? String(users) : "",
      users,
      documents: users * 50,
      monthlyPrice,
      annualMonthlyPrice,
      bankStatementCredits,
      lineItemCredits,
      supplierStatementCredits,
      planId: "control" as BillingPlanId,
      accessBand: "Control",
      tagline: "Costs, sales, claims, and approval-ready workflows",
      unlockedWorkspaces: ["Costs", "Sales", "Claims"],
      lockedWorkspaces: ["Vault", "Multi-entity"],
    };
  }),
  {
    label: "100 users",
    markerLabel: "Operations",
    users: 100,
    documents: 10000,
    monthlyPrice: 180,
    annualMonthlyPrice: 144,
    bankStatementCredits: 500,
    lineItemCredits: 250,
    supplierStatementCredits: 100,
    planId: "operations",
    accessBand: "Operations",
    tagline: "Rules, vault storage, open banking, and reconciliation",
    unlockedWorkspaces: ["Costs", "Sales", "Vault", "Claims"],
    lockedWorkspaces: ["Multi-entity"],
  },
  {
    label: "500 users",
    markerLabel: "Enterprise",
    users: 500,
    documents: 50000,
    monthlyPrice: 455.13,
    annualMonthlyPrice: 364.1,
    bankStatementCredits: 2485,
    lineItemCredits: 2480,
    supplierStatementCredits: 500,
    planId: "enterprise",
    accessBand: "Enterprise",
    tagline: "Custom rollout for multi-entity finance teams",
    unlockedWorkspaces: ["Costs", "Sales", "Vault", "Claims", "Multi-entity"],
    lockedWorkspaces: [],
  },
];

const brandLogoSrc = "/branding/exdox-logo.png";
const brandMarkSrc = "/branding/exdox-mark.png";
const websiteOrigin = "https://www.exdox.co.uk";

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: string;
  ogType?: "website" | "article";
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

type AppStore = {
  costs: ReceiptRecord[];
  sales: ReceiptRecord[];
  vault: ReceiptRecord[];
  claims: ClaimRecord[];
  rules: SupplierRule[];
  reconciliation: ReconciliationLine[];
  settings: OrganisationSettings | null;
};

function SeoManager({ pathname, session }: { pathname: string; session: SessionState | null }) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const seo = buildSeoConfig(pathname, session);
    document.title = seo.title;
    updateMetaTag("name", "description", seo.description);
    updateMetaTag("name", "robots", seo.robots);
    updateMetaTag("property", "og:title", seo.title);
    updateMetaTag("property", "og:description", seo.description);
    updateMetaTag("property", "og:type", seo.ogType ?? "website");
    updateMetaTag("property", "og:url", `${websiteOrigin}${seo.canonicalPath}`);
    updateMetaTag("property", "og:site_name", "Exdox");
    updateMetaTag("property", "og:image", `${websiteOrigin}/branding/exdox-platform-hero.png`);
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", seo.title);
    updateMetaTag("name", "twitter:description", seo.description);
    updateMetaTag("name", "twitter:image", `${websiteOrigin}/branding/exdox-platform-hero.png`);
    updateCanonicalLink(`${websiteOrigin}${seo.canonicalPath}`);
    updateStructuredData(seo.structuredData);
  }, [pathname, session]);

  return null;
}

function buildSeoConfig(pathname: string, session: SessionState | null): SeoConfig {
  const normalizedPath = normalizeCanonicalPath(pathname);
  if (!session) {
    if (normalizedPath === "/platform") {
      return {
        title: "Expense Management Platform | Receipt Capture, Claims and Reconciliation | Exdox",
        description:
          "Explore the Exdox expense management platform for receipt capture, invoice review, VAT handling, document storage, claims, and reconciliation.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Platform",
          pageDescription:
            "Explore the Exdox expense management platform for receipt capture, invoice review, VAT handling, document storage, claims, and reconciliation.",
        }),
      };
    }
    if (normalizedPath === "/integrations") {
      return {
        title: "Accounting Integrations and Finance Workflows | Exdox",
        description:
          "See how Exdox supports accounting workflows with review queues, protected source evidence, bank reconciliation, and publish-ready handoff.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Integrations",
          pageDescription:
            "See how Exdox supports accounting workflows with review queues, protected source evidence, bank reconciliation, and publish-ready handoff.",
        }),
      };
    }
    if (normalizedPath === "/pricing") {
      return {
        title: "Pricing for Receipt Capture and Expense Workflows | Exdox",
        description:
          "Compare Exdox pricing for receipt capture, expense claims, supplier rules, document vault storage, and reconciliation workflows.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Pricing",
          pageDescription:
            "Compare Exdox pricing for receipt capture, expense claims, supplier rules, document vault storage, and reconciliation workflows.",
        }),
      };
    }
    if (normalizedPath === "/company") {
      return {
        title: "About Exdox | Business Expense Capture and Review Software",
        description:
          "Learn how Exdox keeps mobile capture, web review, archived evidence, VAT edits, and finance controls aligned in one workspace.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Company",
          pageDescription:
            "Learn how Exdox keeps mobile capture, web review, archived evidence, VAT edits, and finance controls aligned in one workspace.",
        }),
      };
    }
    if (normalizedPath === "/login") {
      return {
        title: "Log In | Exdox",
        description: "Log in to your Exdox workspace.",
        canonicalPath: normalizedPath,
        robots: "noindex,nofollow",
      };
    }
    if (normalizedPath === "/register") {
      return {
        title: "Start Your Free Trial | Exdox",
        description: "Create an Exdox workspace and start your free trial.",
        canonicalPath: normalizedPath,
        robots: "noindex,nofollow",
      };
    }
    return {
      title: "Exdox | Expense Management Software for Receipt Capture, VAT Review and Claims",
      description:
        "Exdox helps businesses capture receipts and invoices, review VAT and totals, manage expense claims, store source documents, and keep finance workflows moving.",
      canonicalPath: normalizedPath,
      robots: "index,follow",
      structuredData: buildPublicStructuredData({
        path: normalizedPath,
        pageName: "Home",
        pageDescription:
          "Exdox helps businesses capture receipts and invoices, review VAT and totals, manage expense claims, store source documents, and keep finance workflows moving.",
      }),
    };
  }

  return {
    title: `Exdox Workspace | ${routeTitle(normalizedPath)}`,
    description: "Secure Exdox workspace area for uploaded documents, claims, and finance operations.",
    canonicalPath: normalizedPath,
    robots: "noindex,nofollow",
  };
}

function normalizeCanonicalPath(pathname: string) {
  if (!pathname || pathname === "") {
    return "/";
  }
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "") || "/";
}

function buildPublicStructuredData(input: {
  path: string;
  pageName: string;
  pageDescription: string;
}) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Exdox",
      url: websiteOrigin,
      logo: `${websiteOrigin}/branding/exdox-logo.png`,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "hello@exdox.co.uk",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Exdox",
      url: websiteOrigin,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Exdox",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      url: `${websiteOrigin}${input.path}`,
      description: input.pageDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "GBP",
        description: "Free trial available",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: input.pageName,
      url: `${websiteOrigin}${input.path}`,
      description: input.pageDescription,
    },
  ];
}

function updateMetaTag(attributeName: "name" | "property", attributeValue: string, content: string) {
  if (!document.head) {
    return;
  }

  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function updateCanonicalLink(href: string) {
  if (!document.head) {
    return;
  }

  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function updateStructuredData(structuredData?: Record<string, unknown> | Array<Record<string, unknown>>) {
  if (!document.head) {
    return;
  }

  const existing = document.getElementById("exdox-structured-data");
  if (!structuredData) {
    existing?.remove();
    return;
  }

  const script = existing instanceof HTMLScriptElement ? existing : document.createElement("script");
  script.id = "exdox-structured-data";
  script.type = "application/ld+json";
  script.text = JSON.stringify(structuredData);
  if (!existing) {
    document.head.appendChild(script);
  }
}

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
      <>
        <SeoManager pathname={location.pathname} session={session} />
        <div className="app-loading">
          <div className="loading-panel">
            <div className="loading-mark-shell">
              <img className="loading-mark" src={brandMarkSrc} alt="exdox" />
            </div>
            <strong>Loading Exdox workspace</strong>
            <p>Preparing your dashboard and organisation context.</p>
          </div>
        </div>
      </>
    );
  }

  if (!session && location.pathname !== "/login") {
    if (location.pathname === "/register") {
      return (
        <>
          <SeoManager pathname={location.pathname} session={session} />
          <RegisterState
            busy={authBusy}
            error={authError ?? error}
            initialEmail={new URLSearchParams(location.search).get("email") ?? ""}
            inviteToken={new URLSearchParams(location.search).get("inviteToken") ?? ""}
            initialPlan={normalizePublicPlan(new URLSearchParams(location.search).get("plan"))}
            initialBillingCycle={normalizePublicBillingCycle(new URLSearchParams(location.search).get("billingCycle"))}
            initialMonthlyDocumentLimit={Number(new URLSearchParams(location.search).get("monthlyDocumentLimit")) || undefined}
            initialIncludedUsers={Number(new URLSearchParams(location.search).get("includedUsers")) || undefined}
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
        </>
      );
    }
    return (
      <>
        <SeoManager pathname={location.pathname} session={session} />
        <PublicSite />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <SeoManager pathname={location.pathname} session={session} />
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
      </>
    );
  }

  const defaultRoute = getDefaultRoute(session);

  return (
    <>
      <SeoManager pathname={location.pathname} session={session} />
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
                const nextSession =
                  session.activeOrganisationId === organisationId
                    ? session
                    : {
                        ...session,
                        activeOrganisationId: organisationId,
                      };

                setSession((current) => {
                  if (!current || current.activeOrganisationId === organisationId) {
                    return current;
                  }

                  const updatedSession = {
                    ...current,
                    activeOrganisationId: organisationId,
                  };
                  saveStoredSession(updatedSession);
                  return updatedSession;
                });
                await loadWorkspace(session.token, nextSession);
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
    </>
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
  const activeOrganisation =
    props.session.organisations.find((organisation) => organisation.id === props.session.activeOrganisationId) ??
    props.session.organisations[0] ??
    null;
  const notificationCount =
    props.store.costs.filter((receipt) => receipt.needsReview).length +
    props.store.sales.filter((receipt) => receipt.needsReview).length +
    props.store.vault.filter((receipt) => receipt.needsReview || receipt.status === "Processing").length +
    props.store.claims.filter((claim) => claim.status === "pending").length +
    props.store.reconciliation.filter((line) => line.status === "Open").length;
  const visibleNavItems = businessAdmin
    ? navItems.map((item) => ({
        ...item,
        locked: !isRouteAllowed(props.session, item.to),
      }))
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
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " active" : ""}${"locked" in item && item.locked ? " locked" : ""}`
                }
                to={"locked" in item && item.locked ? `/billing?locked=${encodeURIComponent(item.to)}` : item.to}
              >
                <NavIcon name={item.icon} />
                {item.label}
                {"locked" in item && item.locked ? <span className="sidebar-lock-tag">Locked</span> : null}
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
            <p className="topbar-kicker">{activeOrganisation?.name ?? "Active workspace"}</p>
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
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/data-health" element={<DataHealthPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/integrations" element={<IntegrationsPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/workflows" element={<WorkflowPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/productivity" element={<ProductivityPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/automation" element={<AutomationPage store={props.store} />} />
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
              <Route path="/billing" element={<BillingPage session={props.session} />} />
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
  const navigate = useNavigate();
  const totalCosts = sumGross(store.costs);
  const totalSales = sumGross(store.sales);
  const vaultDocuments = store.vault.length;
  const pendingClaims = store.claims.filter((claim) => claim.status === "pending").length;
  const openMatches = store.reconciliation.filter((line) => line.status === "Open").length;
  const recentVaultDocuments = store.vault.slice(0, 4);
  const duplicateInsights = buildDuplicateInsights([...store.costs, ...store.sales]);
  const healthIssues = buildWorkspaceHealthIssues(store);

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Costs ledger" value={currency(totalCosts)} detail={`${store.costs.length} documents`} onClick={() => navigate("/costs")} />
        <MetricCard label="Sales ledger" value={currency(totalSales)} detail={`${store.sales.length} invoices`} onClick={() => navigate("/sales")} />
        <MetricCard label="Vault archive" value={String(vaultDocuments)} detail="Stored reference files" onClick={() => navigate("/vault")} />
        <MetricCard label="Pending claims" value={String(pendingClaims)} detail="Approval workload" onClick={() => navigate(firstPendingClaimsRoute(store))} />
        <MetricCard label="Open bank matches" value={String(openMatches)} detail="Awaiting audit pairing" onClick={() => navigate(firstOpenReconciliationRoute(store))} />
        <MetricCard
          label="Duplicate review"
          value={String(duplicateInsights.groups.length)}
          detail={
            duplicateInsights.groups.length
              ? `${duplicateInsights.receiptIds.size} receipts need a duplicate check`
              : "No likely duplicate uploads detected"
          }
          onClick={() => navigate(firstInboxRouteForDuplicateReview(store))}
        />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Inbox throughput</h2>
            <span>Live totals</span>
          </div>
          <div className="status-strip">
            {(["Processing", "Review", "Ready", "Published"] as InboxStatus[]).map((status) => (
              <button className="status-box" type="button" key={status} onClick={() => navigate(firstInboxRouteForStatus(store, status))}>
                <strong>{[...store.costs, ...store.sales, ...store.vault].filter((item) => item.status === status).length}</strong>
                <span>{status}</span>
              </button>
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
                  <button className="summary-action-row" type="button" onClick={() => navigate("/rules")}>
                    <strong>{rule.supplierMatchText}</strong>
                    <span>
                      {rule.category} | {rule.taxRate} | {rule.paymentMethod}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <button className="summary-action-row" type="button" onClick={() => navigate("/rules")}>
                  <strong>No supplier rules yet</strong>
                  <span>Open the rules workspace to create the first automation rule.</span>
                </button>
              </li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Vault snapshot</h2>
            <span>Recent archive files</span>
          </div>
          <ul className="summary-list">
            {recentVaultDocuments.length ? (
              recentVaultDocuments.map((document) => (
                <li key={document.id}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(`/vault/${document.id}`)}>
                    <strong>{document.sourceFilename}</strong>
                    <span>
                      {documentTypeLabel(document.documentType)} | {sourceLabel(document.receiptSource)} | {document.createdAt.slice(0, 10)}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No vault files yet</strong>
                <span>Archived reference documents will appear here after the first vault upload.</span>
              </li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Duplicate review</h2>
            <span>Likely repeat uploads</span>
          </div>
          <ul className="summary-list">
            {duplicateInsights.groups.length ? (
              duplicateInsights.groups.slice(0, 4).map((group) => (
                <li key={group.key}>
                  <button
                    className="summary-action-row"
                    type="button"
                    onClick={() => navigate(group.workspaceLabel === "Sales" ? `/sales/${group.records[0]!.id}` : `/costs/${group.records[0]!.id}`)}
                  >
                    <strong>
                      {group.vendorLabel} | {currency(group.grossAmount)}
                    </strong>
                    <span>
                      {group.documentDate} | {group.workspaceLabel} | {group.records.length} matching uploads
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No duplicate candidates right now</strong>
                <span>Potential repeat uploads will appear here before they reach final review.</span>
              </li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Workspace health</h2>
            <span>Review pressure points</span>
          </div>
          <ul className="summary-list">
            {healthIssues.length ? (
              healthIssues.map((issue) => (
                <li key={issue.label}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(issue.route)}>
                    <strong>{issue.label}</strong>
                    <span>{issue.detail}</span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No review blockers detected</strong>
                <span>There are no unreadable documents, stalled uploads, or duplicate candidates right now.</span>
              </li>
            )}
          </ul>
          <div className="toolbar">
            <button className="secondary-action" type="button" onClick={() => navigate("/overview/data-health")}>
              Open data health view
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function DataHealthPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allRecords = [...store.costs, ...store.sales, ...store.vault];
  const duplicateInsights = buildDuplicateInsights([...store.costs, ...store.sales]);
  const healthIssues = buildWorkspaceHealthIssues(store, 6);
  const codingGapRecords = buildCodingGapRecords(store);
  const attentionRecords = buildAttentionRecords(store, duplicateInsights.byReceiptId);
  const workspaceBreakdown = [
    { label: "Costs", route: "/costs", records: attentionRecords.filter(({ record }) => record.workspaceContext === "cost") },
    { label: "Sales", route: "/sales", records: attentionRecords.filter(({ record }) => record.workspaceContext === "sales") },
    { label: "Vault", route: "/vault", records: attentionRecords.filter(({ record }) => record.workspaceContext === "vault") },
  ];
  const unreadableCount = allRecords.filter((record) => looksUnreadable(record)).length;
  const processingCount = allRecords.filter((record) => record.status === "Processing").length;
  const lowConfidenceCount = allRecords.filter((record) => isLowConfidence(record)).length;
  const reviewCount = allRecords.filter((record) => record.needsReview).length;

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard
          label="Unreadable"
          value={String(unreadableCount)}
          detail="Manual fallback or re-upload needed"
          onClick={() => navigate(firstInboxRouteForIssue(store, (record) => looksUnreadable(record), "Unreadable"))}
        />
        <MetricCard
          label="Still processing"
          value={String(processingCount)}
          detail="Uploads not yet settled into review"
          onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.status === "Processing", "Processing"))}
        />
        <MetricCard
          label="Low confidence"
          value={String(lowConfidenceCount)}
          detail="Extraction needs a closer check"
          onClick={() => navigate(firstInboxRouteForIssue(store, (record) => isLowConfidence(record), "Low confidence"))}
        />
        <MetricCard
          label="Needs review"
          value={String(reviewCount)}
          detail="Coding or publish decisions outstanding"
          onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"))}
        />
        <MetricCard
          label="Duplicate groups"
          value={String(duplicateInsights.groups.length)}
          detail="Likely repeat uploads awaiting review"
          onClick={() => navigate(firstInboxRouteForDuplicateReview(store))}
        />
        <MetricCard
          label="Coding gaps"
          value={String(codingGapRecords.length)}
          detail="Documents missing category or supplier"
          onClick={() => navigate(codingGapRecords[0] ? recordRoute(codingGapRecords[0]) : "/costs")}
        />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Priority queues</h2>
            <span>Fast route into problem areas</span>
          </div>
          <ul className="summary-list">
            {healthIssues.map((issue) => (
              <li key={issue.label}>
                <button className="summary-action-row" type="button" onClick={() => navigate(issue.route)}>
                  <strong>{issue.label}</strong>
                  <span>{issue.detail}</span>
                </button>
              </li>
            ))}
            {codingGapRecords.length ? (
              <li>
                <button className="summary-action-row" type="button" onClick={() => navigate(recordRoute(codingGapRecords[0]!))}>
                  <strong>{codingGapRecords.length} document{codingGapRecords.length === 1 ? "" : "s"} missing coding detail</strong>
                  <span>Open the next document missing a supplier or category and complete the review fields.</span>
                </button>
              </li>
            ) : null}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Attention records</h2>
            <span>Highest-friction uploads first</span>
          </div>
          <ul className="summary-list">
            {attentionRecords.length ? (
              attentionRecords.slice(0, 8).map(({ record, reasons }) => (
                <li key={record.id}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(recordRoute(record))}>
                    <strong>{record.vendorName?.trim() || record.sourceFilename}</strong>
                    <span>
                      {workspaceLabel(record.workspaceContext)} | {currency(record.totalAmount ?? 0)} | {record.createdAt.slice(0, 10)} | {reasons.join(", ")}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No data-health blockers right now</strong>
                <span>Unreadable, low-confidence, duplicate, and incomplete records will show up here automatically.</span>
              </li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Workspace breakdown</h2>
            <span>Where the cleanup work is sitting</span>
          </div>
          <ul className="summary-list">
            {workspaceBreakdown.map((workspace) => (
              <li key={workspace.label}>
                <button className="summary-action-row" type="button" onClick={() => navigate(workspace.route)}>
                  <strong>{workspace.label}</strong>
                  <span>
                    {workspace.records.length} attention item{workspace.records.length === 1 ? "" : "s"} in this queue
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Duplicate review</h2>
            <span>Candidate groups pulled from live records</span>
          </div>
          <ul className="summary-list">
            {duplicateInsights.groups.length ? (
              duplicateInsights.groups.slice(0, 6).map((group) => (
                <li key={group.key}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(recordRoute(group.records[0]!))}>
                    <strong>{group.vendorLabel} | {currency(group.grossAmount)}</strong>
                    <span>{group.documentDate} | {group.workspaceLabel} | {group.records.length} linked uploads</span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No duplicate groups open</strong>
                <span>Repeat-upload candidates will appear here as soon as the same evidence shows up more than once.</span>
              </li>
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}

function IntegrationsPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allRecords = [...store.costs, ...store.sales, ...store.vault];
  const sourceCounts = {
    mobile: allRecords.filter((record) => record.receiptSource === "mobile").length,
    web_upload: allRecords.filter((record) => record.receiptSource === "web_upload").length,
    email: allRecords.filter((record) => record.receiptSource === "email").length,
    bank_import: allRecords.filter((record) => record.receiptSource === "bank_import").length,
  };
  const readyCosts = store.costs.filter((record) => record.status === "Ready").length;
  const readySales = store.sales.filter((record) => record.status === "Ready").length;
  const publishedRecords = allRecords.filter((record) => record.status === "Published").length;
  const reviewedClaims = store.claims.filter((claim) => claim.status === "pending").length;
  const openBankMatches = store.reconciliation.filter((line) => line.status === "Open").length;
  const auditedBankMatches = store.reconciliation.filter((line) => line.status === "Audited").length;
  const recentUploads = allRecords
    .slice()
    .sort((left, right) => compareIsoDate(right.createdAt, left.createdAt))
    .slice(0, 8);

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Mobile capture" value={String(sourceCounts.mobile)} detail="Receipts from the app" onClick={() => navigate(firstInboxRouteForSource(store, "mobile"))} />
        <MetricCard label="Web uploads" value={String(sourceCounts.web_upload)} detail="Drag-and-drop from the browser" onClick={() => navigate(firstInboxRouteForSource(store, "web_upload"))} />
        <MetricCard label="Email intake" value={String(sourceCounts.email)} detail="Documents submitted by email" onClick={() => navigate(firstInboxRouteForSource(store, "email"))} />
        <MetricCard label="Bank imports" value={String(sourceCounts.bank_import)} detail="Receipts linked from bank-led flows" onClick={() => navigate(firstInboxRouteForSource(store, "bank_import"))} />
        <MetricCard label="Ready to publish" value={String(readyCosts + readySales)} detail="Documents ready for accounting handoff" onClick={() => navigate(firstInboxRouteForStatus(store, "Ready"))} />
        <MetricCard label="Open bank matches" value={String(openBankMatches)} detail="Statement lines still awaiting audit pairing" onClick={() => navigate("/reconciliation?status=Open")} />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Submission channels</h2>
            <span>How records are reaching Exdox</span>
          </div>
          <ul className="summary-list">
            {([
              { source: "mobile", label: "Mobile receipt capture", detail: "Sent from the synced app workflow." },
              { source: "web_upload", label: "Web drag-and-drop", detail: "Uploaded directly into the website inboxes." },
              { source: "email", label: "Email submission", detail: "Documents arriving through the email intake route." },
              { source: "bank_import", label: "Bank-led import", detail: "Receipts brought into review alongside bank activity." },
            ] as const).map((item) => (
              <li key={item.source}>
                <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForSource(store, item.source))}>
                  <strong>{item.label}</strong>
                  <span>{sourceCounts[item.source]} record{sourceCounts[item.source] === 1 ? "" : "s"} | {item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Accounting handoff</h2>
            <span>Current downstream publishing posture</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/costs?status=Ready")}>
                <strong>Costs ready for export or publish</strong>
                <span>{readyCosts} cost document{readyCosts === 1 ? "" : "s"} are sitting in Ready.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/sales?status=Ready")}>
                <strong>Sales invoices ready for handoff</strong>
                <span>{readySales} sales document{readySales === 1 ? "" : "s"} are ready for the accounting workflow.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=pending")}>
                <strong>Expense approvals waiting</strong>
                <span>{reviewedClaims} pending claim{reviewedClaims === 1 ? "" : "s"} still need approval decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstPublishedOrArchiveRoute(store))}>
                <strong>Published and archived evidence</strong>
                <span>{publishedRecords} published record{publishedRecords === 1 ? "" : "s"} plus {store.vault.length} vault file{store.vault.length === 1 ? "" : "s"} retained for retrieval.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Open banking</h2>
            <span>Live reconciliation coverage</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/reconciliation?status=Open")}>
                <strong>Open reconciliation lines</strong>
                <span>{openBankMatches} imported bank line{openBankMatches === 1 ? "" : "s"} still need a matched document or audit action.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/reconciliation?status=Audited")}>
                <strong>Audited bank matches</strong>
                <span>{auditedBankMatches} line{auditedBankMatches === 1 ? "" : "s"} have already been cleared through reconciliation.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/requisitions")}>
                <strong>Bank connection setup</strong>
                <span>Open the requisitions flow to start or retry the read-only bank connection handshake.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Supported accounting stack</h2>
            <span>Current downstream compatibility surface</span>
          </div>
          <ul className="summary-list">
            {["Sage", "Xero", "QuickBooks", "FreeAgent"].map((platform) => (
              <li key={platform}>
                <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForStatus(store, "Ready"))}>
                  <strong>{platform}</strong>
                  <span>Use the existing Ready and Published receipt workflow as the accounting handoff path for this platform.</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Recent connected activity</h2>
            <span>Latest synced records across channels</span>
          </div>
          <ul className="summary-list">
            {recentUploads.length ? (
              recentUploads.map((record) => (
                <li key={`${record.workspaceContext}-${record.id}`}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(recordRoute(record))}>
                    <strong>{record.vendorName?.trim() || record.sourceFilename}</strong>
                    <span>{sourceLabel(record.receiptSource)} | {workspaceLabel(record.workspaceContext)} | {record.createdAt.slice(0, 10)}</span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No connected activity yet</strong>
                <span>Uploads, imports, and archived files will appear here once the first records sync into the workspace.</span>
              </li>
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}

function WorkflowPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allDocuments = [...store.costs, ...store.sales, ...store.vault];
  const documentsNeedingReview = allDocuments.filter((record) => record.needsReview);
  const costReady = store.costs.filter((record) => record.status === "Ready");
  const salesReady = store.sales.filter((record) => record.status === "Ready");
  const pendingClaims = store.claims.filter((claim) => claim.status === "pending");
  const publishedDocuments = allDocuments.filter((record) => record.status === "Published");
  const processingDocuments = allDocuments.filter((record) => record.status === "Processing");
  const reviewByWorkspace = [
    { label: "Costs review", route: "/costs?issue=Needs+review", records: store.costs.filter((record) => record.needsReview) },
    { label: "Sales review", route: "/sales?issue=Needs+review", records: store.sales.filter((record) => record.needsReview) },
    { label: "Vault review", route: "/vault?issue=Needs+review", records: store.vault.filter((record) => record.needsReview) },
  ];
  const nextActions = [
    ...documentsNeedingReview.map((record) => ({
      key: `receipt-${record.workspaceContext}-${record.id}`,
      title: record.vendorName?.trim() || record.sourceFilename,
      subtitle: `${workspaceLabel(record.workspaceContext)} | ${record.status} | ${record.createdAt.slice(0, 10)}`,
      route: recordRoute(record),
    })),
    ...pendingClaims.map((claim) => ({
      key: `claim-${claim.id}`,
      title: claim.name,
      subtitle: `Claim approval | ${claim.documentCount} document${claim.documentCount === 1 ? "" : "s"} | ${currency(claim.totalAmount)}`,
      route: `/claims/${claim.id}`,
    })),
  ]
    .sort((left, right) => right.subtitle.localeCompare(left.subtitle))
    .slice(0, 10);

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Review queue" value={String(documentsNeedingReview.length)} detail="Documents waiting on coding or final checks" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"))} />
        <MetricCard label="Cost approvals" value={String(costReady.length)} detail="Cost documents ready for handoff" onClick={() => navigate("/costs?status=Ready")} />
        <MetricCard label="Sales approvals" value={String(salesReady.length)} detail="Sales documents ready for handoff" onClick={() => navigate("/sales?status=Ready")} />
        <MetricCard label="Pending claims" value={String(pendingClaims.length)} detail="Expense claims awaiting approval" onClick={() => navigate("/claims?status=pending")} />
        <MetricCard label="Still processing" value={String(processingDocuments.length)} detail="Uploads not yet settled into review" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.status === "Processing", "Processing"))} />
        <MetricCard label="Published" value={String(publishedDocuments.length)} detail="Documents already pushed onward" onClick={() => navigate(firstInboxRouteForStatus(store, "Published"))} />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Workflow lanes</h2>
            <span>Direct routes into the main approval queues</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=pending")}>
                <strong>Claims approval lane</strong>
                <span>{pendingClaims.length} pending claim{pendingClaims.length === 1 ? "" : "s"} waiting on approve, reject, or paid decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/costs?status=Ready")}>
                <strong>Costs publish lane</strong>
                <span>{costReady.length} cost document{costReady.length === 1 ? "" : "s"} are ready for accounting handoff.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/sales?status=Ready")}>
                <strong>Sales publish lane</strong>
                <span>{salesReady.length} sales document{salesReady.length === 1 ? "" : "s"} are ready for the next step.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/reconciliation?status=Open")}>
                <strong>Reconciliation audit lane</strong>
                <span>{store.reconciliation.filter((line) => line.status === "Open").length} imported bank line{store.reconciliation.filter((line) => line.status === "Open").length === 1 ? "" : "s"} still need clearing.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Review by workspace</h2>
            <span>Where review pressure is building</span>
          </div>
          <ul className="summary-list">
            {reviewByWorkspace.map((workspace) => (
              <li key={workspace.label}>
                <button className="summary-action-row" type="button" onClick={() => navigate(workspace.route)}>
                  <strong>{workspace.label}</strong>
                  <span>{workspace.records.length} document{workspace.records.length === 1 ? "" : "s"} currently need attention in this queue.</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Next actions</h2>
            <span>Fastest way to keep work moving</span>
          </div>
          <ul className="summary-list">
            {nextActions.length ? (
              nextActions.map((item) => (
                <li key={item.key}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(item.route)}>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No stalled workflow items right now</strong>
                <span>Review items, pending claims, and publish-ready documents will surface here as the queues change.</span>
              </li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Workflow completion</h2>
            <span>Records that already moved through the process</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForStatus(store, "Published"))}>
                <strong>Published document trail</strong>
                <span>{publishedDocuments.length} published document{publishedDocuments.length === 1 ? "" : "s"} are already in the downstream handoff state.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=approved")}>
                <strong>Approved claims</strong>
                <span>{store.claims.filter((claim) => claim.status === "approved").length} approved claim{store.claims.filter((claim) => claim.status === "approved").length === 1 ? "" : "s"} are waiting on payment or close-out.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=paid")}>
                <strong>Paid claims</strong>
                <span>{store.claims.filter((claim) => claim.status === "paid").length} claim{store.claims.filter((claim) => claim.status === "paid").length === 1 ? "" : "s"} have fully completed the reimbursement workflow.</span>
              </button>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function ProductivityPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allDocuments = [...store.costs, ...store.sales, ...store.vault];
  const reviewDocuments = allDocuments.filter((record) => record.needsReview);
  const readyDocuments = allDocuments.filter((record) => record.status === "Ready");
  const publishedDocuments = allDocuments.filter((record) => record.status === "Published");
  const processingDocuments = allDocuments.filter((record) => record.status === "Processing");
  const lowConfidenceDocuments = allDocuments.filter((record) => isLowConfidence(record));
  const duplicateGroups = buildDuplicateInsights([...store.costs, ...store.sales]).groups.length;
  const automatedCoverage = allDocuments.length
    ? Math.round(((publishedDocuments.length + readyDocuments.length) / allDocuments.length) * 100)
    : 0;
  const reviewCompletion = allDocuments.length
    ? Math.round(((allDocuments.length - reviewDocuments.length) / allDocuments.length) * 100)
    : 0;
  const bankAudited = store.reconciliation.filter((line) => line.status === "Audited").length;
  const bankCoverage = store.reconciliation.length
    ? Math.round((bankAudited / store.reconciliation.length) * 100)
    : 0;
  const claimsCompleted = store.claims.filter((claim) => claim.status === "approved" || claim.status === "paid").length;
  const claimCompletion = store.claims.length ? Math.round((claimsCompleted / store.claims.length) * 100) : 0;
  const sourceMix = [
    { label: "Mobile", count: allDocuments.filter((record) => record.receiptSource === "mobile").length, route: firstInboxRouteForSource(store, "mobile") },
    { label: "Web", count: allDocuments.filter((record) => record.receiptSource === "web_upload").length, route: firstInboxRouteForSource(store, "web_upload") },
    { label: "Email", count: allDocuments.filter((record) => record.receiptSource === "email").length, route: firstInboxRouteForSource(store, "email") },
    { label: "Bank", count: allDocuments.filter((record) => record.receiptSource === "bank_import").length, route: firstInboxRouteForSource(store, "bank_import") },
  ];

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Automation coverage" value={`${automatedCoverage}%`} detail="Ready or published records across all queues" onClick={() => navigate(readyDocuments.length ? firstInboxRouteForStatus(store, "Ready") : firstPublishedOrArchiveRoute(store))} />
        <MetricCard label="Review completion" value={`${reviewCompletion}%`} detail="Records that no longer need manual review" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"))} />
        <MetricCard label="Bank audit coverage" value={`${bankCoverage}%`} detail="Imported bank lines already audited" onClick={() => navigate("/reconciliation?status=Audited")} />
        <MetricCard label="Claim completion" value={`${claimCompletion}%`} detail="Claims approved or fully paid" onClick={() => navigate(firstClaimCompletionRoute(store))} />
        <MetricCard label="Low-confidence drag" value={String(lowConfidenceDocuments.length)} detail="Records still slowing down review quality" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => isLowConfidence(record), "Low confidence"))} />
        <MetricCard label="Duplicate drag" value={String(duplicateGroups)} detail="Repeat-upload groups still consuming time" onClick={() => navigate(firstInboxRouteForDuplicateReview(store))} />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Operational throughput</h2>
            <span>Where team time is currently going</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.status === "Processing", "Processing"))}>
                <strong>Processing backlog</strong>
                <span>{processingDocuments.length} document{processingDocuments.length === 1 ? "" : "s"} are still settling into the review flow.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"))}>
                <strong>Manual review load</strong>
                <span>{reviewDocuments.length} document{reviewDocuments.length === 1 ? "" : "s"} still need coding, tax, or publish decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=pending")}>
                <strong>Approval queue</strong>
                <span>{store.claims.filter((claim) => claim.status === "pending").length} claim{store.claims.filter((claim) => claim.status === "pending").length === 1 ? "" : "s"} are waiting on approval.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/reconciliation?status=Open")}>
                <strong>Open bank audit queue</strong>
                <span>{store.reconciliation.filter((line) => line.status === "Open").length} bank line{store.reconciliation.filter((line) => line.status === "Open").length === 1 ? "" : "s"} still need matching or audit closure.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Automation levers</h2>
            <span>Controls that improve output quality</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/rules")}>
                <strong>Supplier rules in place</strong>
                <span>{store.rules.length} rule{store.rules.length === 1 ? "" : "s"} are available to standardise category, tax, and payment defaults.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/overview/data-health")}>
                <strong>Data-health blockers</strong>
                <span>{lowConfidenceDocuments.length + duplicateGroups} active quality blockers are still reducing hands-off throughput.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/settings")}>
                <strong>Organisation tax defaults</strong>
                <span>Company VAT posture and fallback tax settings are available to reduce avoidable review corrections.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Channel mix</h2>
            <span>Where submissions are entering the system</span>
          </div>
          <ul className="summary-list">
            {sourceMix.map((source) => (
              <li key={source.label}>
                <button className="summary-action-row" type="button" onClick={() => navigate(source.route)}>
                  <strong>{source.label}</strong>
                  <span>{source.count} document{source.count === 1 ? "" : "s"} currently originate from this channel.</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Export and handoff</h2>
            <span>Output paths already available on the website</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstExportRoute(store))}>
                <strong>Queue CSV exports</strong>
                <span>Costs, sales, vault, claims, and reconciliation all support filtered CSV export from their live queues.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/overview/integrations")}>
                <strong>Accounting handoff posture</strong>
                <span>{readyDocuments.length} record{readyDocuments.length === 1 ? "" : "s"} are sitting in Ready and {publishedDocuments.length} have already been published onward.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/vault")}>
                <strong>Archive retrieval</strong>
                <span>{store.vault.length} vault file{store.vault.length === 1 ? "" : "s"} are available as stored reference evidence for audit and retrieval.</span>
              </button>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function AutomationPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allDocuments = [...store.costs, ...store.sales, ...store.vault];
  const activeRules = store.rules.filter((rule) => rule.isActive);
  const readyDocuments = allDocuments.filter((record) => record.status === "Ready");
  const lowConfidenceDocuments = allDocuments.filter((record) => isLowConfidence(record));
  const reviewDocuments = allDocuments.filter((record) => record.needsReview);
  const duplicateInsights = buildDuplicateInsights([...store.costs, ...store.sales]);
  const ruleCoverage = allDocuments.length
    ? Math.round((allDocuments.filter((record) => (record.category ?? "").trim()).length / allDocuments.length) * 100)
    : 0;
  const reviewEscapeRate = allDocuments.length
    ? Math.round((readyDocuments.length / allDocuments.length) * 100)
    : 0;

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Active rules" value={String(activeRules.length)} detail="Supplier automation rules currently enabled" onClick={() => navigate("/rules?status=active")} />
        <MetricCard label="Rule coverage" value={`${ruleCoverage}%`} detail="Records already carrying category output" onClick={() => navigate(firstInboxRouteForCategorizedRecords(store))} />
        <MetricCard label="Ready output" value={`${reviewEscapeRate}%`} detail="Documents already reaching the ready state" onClick={() => navigate(firstInboxRouteForStatus(store, "Ready"))} />
        <MetricCard label="Needs review" value={String(reviewDocuments.length)} detail="Records still breaking out of the automated path" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"))} />
        <MetricCard label="Low confidence" value={String(lowConfidenceDocuments.length)} detail="Extractions still needing a manual check" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => isLowConfidence(record), "Low confidence"))} />
        <MetricCard label="Duplicate groups" value={String(duplicateInsights.groups.length)} detail="Likely repeat uploads slowing clean automation" onClick={() => navigate(firstInboxRouteForDuplicateReview(store))} />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Automation controls</h2>
            <span>The parts of Exdox already shaping bookkeeping output</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/rules")}>
                <strong>Supplier rules</strong>
                <span>{activeRules.length} active rule{activeRules.length === 1 ? "" : "s"} currently standardise category, tax, and payment choices.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/settings")}>
                <strong>Tax defaults</strong>
                <span>Organisation VAT posture and fallback tax rate settings shape how review fields start out.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/overview/data-health")}>
                <strong>Data-health safeguards</strong>
                <span>{lowConfidenceDocuments.length + duplicateInsights.groups.length} active blocker{lowConfidenceDocuments.length + duplicateInsights.groups.length === 1 ? "" : "s"} are still interrupting hands-off processing.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Automation drag</h2>
            <span>What is still forcing manual intervention</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"))}>
                <strong>Manual review fallback</strong>
                <span>{reviewDocuments.length} document{reviewDocuments.length === 1 ? "" : "s"} still need human coding, tax, or publish decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => isLowConfidence(record), "Low confidence"))}>
                <strong>Extraction uncertainty</strong>
                <span>{lowConfidenceDocuments.length} low-confidence document{lowConfidenceDocuments.length === 1 ? "" : "s"} are slowing automation confidence.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForDuplicateReview(store))}>
                <strong>Duplicate interference</strong>
                <span>{duplicateInsights.groups.length} candidate group{duplicateInsights.groups.length === 1 ? "" : "s"} still need a human duplicate check.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Publish-ready output</h2>
            <span>Where automation is already succeeding</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/costs?status=Ready")}>
                <strong>Costs ready for handoff</strong>
                <span>{store.costs.filter((record) => record.status === "Ready").length} cost document{store.costs.filter((record) => record.status === "Ready").length === 1 ? "" : "s"} already reached the ready queue.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/sales?status=Ready")}>
                <strong>Sales ready for handoff</strong>
                <span>{store.sales.filter((record) => record.status === "Ready").length} sales document{store.sales.filter((record) => record.status === "Ready").length === 1 ? "" : "s"} are ready for the next step.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForStatus(store, "Published"))}>
                <strong>Published output</strong>
                <span>{allDocuments.filter((record) => record.status === "Published").length} document{allDocuments.filter((record) => record.status === "Published").length === 1 ? "" : "s"} have already cleared the downstream workflow.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Recent rule-shaped activity</h2>
            <span>Newest records with coding already in place</span>
          </div>
          <ul className="summary-list">
            {allDocuments
              .filter((record) => (record.category ?? "").trim())
              .sort((left, right) => compareIsoDate(right.updatedAt, left.updatedAt))
              .slice(0, 8)
              .map((record) => (
                <li key={`${record.workspaceContext}-${record.id}`}>
                  <button className="summary-action-row" type="button" onClick={() => navigate(recordRoute(record))}>
                    <strong>{record.vendorName?.trim() || record.sourceFilename}</strong>
                    <span>{workspaceLabel(record.workspaceContext)} | {record.category} | {record.updatedAt.slice(0, 10)}</span>
                  </button>
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
  basePath: "/costs" | "/sales" | "/vault";
  uploadBusy: boolean;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const [issueFilter, setIssueFilter] = useState<"All" | "Needs review" | "Unreadable" | "Possible duplicates" | "Low confidence" | "Processing">("All");
  const [sourceFilter, setSourceFilter] = useState<ReceiptRecord["receiptSource"] | "All">("All");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<ReceiptRecord["documentType"] | "All">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_total" | "lowest_total" | "lowest_confidence">("newest");
  const deferredQuery = useDeferredValue(query);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? "";
    const nextStatus = params.get("status");
    const nextIssue = params.get("issue");
    const nextSource = params.get("source");
    const nextDocumentType = params.get("documentType");
    const nextSort = params.get("sort");

    setQuery(nextSearch);
    setStatusFilter(nextStatus === "Processing" || nextStatus === "Review" || nextStatus === "Ready" || nextStatus === "Published" ? nextStatus : "All");
    setIssueFilter(
      nextIssue === "Needs review" ||
      nextIssue === "Unreadable" ||
      nextIssue === "Possible duplicates" ||
      nextIssue === "Low confidence" ||
      nextIssue === "Processing"
        ? nextIssue
        : "All",
    );
    setSourceFilter(nextSource === "mobile" || nextSource === "web_upload" || nextSource === "email" || nextSource === "bank_import" ? nextSource : "All");
    setDocumentTypeFilter(nextDocumentType === "receipt" || nextDocumentType === "invoice" || nextDocumentType === "unknown" ? nextDocumentType : "All");
    setSortOrder(
      nextSort === "oldest" ||
      nextSort === "highest_total" ||
      nextSort === "lowest_total" ||
      nextSort === "lowest_confidence"
        ? nextSort
        : "newest",
    );
  }, [location.search]);

  const search = deferredQuery.trim().toLowerCase();
  const isVaultInbox = basePath === "/vault";
  const duplicateInsights = buildDuplicateInsights(records);
  const filtered = records.filter((record) => {
    const matchesSearch =
      !search ||
      `${record.vendorName ?? ""} ${record.category ?? ""} ${record.sourceFilename} ${record.description ?? ""} ${record.customer ?? ""} ${record.rawTextSummary ?? ""}`
        .toLowerCase()
        .includes(search);
    const matchesStatus = statusFilter === "All" || record.status === statusFilter;
    const matchesSource = sourceFilter === "All" || record.receiptSource === sourceFilter;
    const matchesDocumentType = documentTypeFilter === "All" || (record.documentType ?? "unknown") === documentTypeFilter;
    const matchesIssue =
      issueFilter === "All"
        ? true
        : issueFilter === "Needs review"
          ? record.needsReview
          : issueFilter === "Unreadable"
            ? looksUnreadable(record)
            : issueFilter === "Possible duplicates"
              ? duplicateInsights.byReceiptId.has(record.id)
              : issueFilter === "Low confidence"
                ? isLowConfidence(record)
              : record.status === "Processing";
    return matchesSearch && matchesStatus && matchesSource && matchesDocumentType && matchesIssue;
  }).sort((left, right) => compareInboxRecords(left, right, sortOrder));

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{title}</h2>
          <p>
            {isVaultInbox
              ? "Store archive-only evidence in a separate workspace so reference documents do not clutter expense or sales review."
              : "Bulk ingestion, organisation-scoped review, and ledger-safe editing in a dedicated workspace."}
          </p>
        </div>
        <div className="filter-row">
          <input
            className="search-input"
            type="search"
            placeholder={isVaultInbox ? "Search filename, description, or source" : "Search supplier, category, or filename"}
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
          <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value as typeof issueFilter)}>
            <option value="All">All issues</option>
            <option value="Needs review">Needs review</option>
            <option value="Unreadable">Unreadable</option>
            <option value="Possible duplicates">Possible duplicates</option>
            <option value="Low confidence">Low confidence</option>
            <option value="Processing">Still processing</option>
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}>
            <option value="All">All sources</option>
            <option value="mobile">Mobile</option>
            <option value="web_upload">Web</option>
            <option value="email">Email</option>
            <option value="bank_import">Bank</option>
          </select>
          <select value={documentTypeFilter} onChange={(event) => setDocumentTypeFilter(event.target.value as typeof documentTypeFilter)}>
            <option value="All">All document types</option>
            <option value="receipt">Receipt</option>
            <option value="invoice">Invoice</option>
            <option value="unknown">Unknown</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest_total">Highest total</option>
            <option value="lowest_total">Lowest total</option>
            <option value="lowest_confidence">Lowest confidence</option>
          </select>
          <button
            className="secondary-action"
            type="button"
            disabled={!filtered.length}
            onClick={() => {
              downloadCsv(
                `${basePath.replace("/", "") || "inbox"}-${new Date().toISOString().slice(0, 10)}.csv`,
                buildInboxExportRows(filtered),
              );
            }}
          >
            Export CSV
          </button>
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
                      <td>
                        <div className="stacked-cell">
                          <StatusPill status={record.status} />
                          {duplicateInsights.byReceiptId.has(record.id) ? <SignalPill tone="warning">Possible duplicate</SignalPill> : null}
                          {isLowConfidence(record) ? <SignalPill tone="info">Low confidence</SignalPill> : null}
                        </div>
                      </td>
                      <td>{record.createdAt.slice(0, 10)}</td>
                      <td>{record.sourceFilename}</td>
                      <td>{documentTypeLabel(record.documentType)}</td>
                      <td>{sourceLabel(record.receiptSource)}</td>
                      <td>{record.description ?? "Stored vault document"}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div className="stacked-cell">
                          <StatusPill status={record.status} />
                          {duplicateInsights.byReceiptId.has(record.id) ? <SignalPill tone="warning">Possible duplicate</SignalPill> : null}
                          {isLowConfidence(record) ? <SignalPill tone="info">Low confidence</SignalPill> : null}
                        </div>
                      </td>
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
            <strong>{search || statusFilter !== "All" || issueFilter !== "All" || sourceFilter !== "All" || documentTypeFilter !== "All" ? "No documents match the current filters." : isVaultInbox ? "No vault files stored yet." : "No documents uploaded yet."}</strong>
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

  const duplicateInsights = buildDuplicateInsights(
    props.mode === "vault"
      ? [...props.fallbackRecords.filter((item) => item.id !== receipt.id), receipt]
      : [...props.fallbackRecords.filter((item) => item.workspaceContext === props.mode && item.id !== receipt.id), receipt],
  );
  const duplicateGroup = duplicateInsights.byReceiptId.get(receipt.id) ?? null;
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
          <div className="toolbar">
            <span>{receipt.sourceFilename}</span>
            {assetUrl ? (
              <>
                <a className="secondary-action link-action" href={assetUrl} target="_blank" rel="noreferrer">
                  Open source file
                </a>
                <a className="secondary-action link-action" href={assetUrl} download={receipt.sourceFilename}>
                  Download file
                </a>
              </>
            ) : null}
          </div>
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
        {duplicateGroup ? (
          <section className="signal-banner warning">
            <strong>Possible duplicate upload detected.</strong>
            <span>
              This document matches {duplicateGroup.records.length - 1} other {duplicateGroup.workspaceLabel.toLowerCase()} upload
              {duplicateGroup.records.length - 1 === 1 ? "" : "s"} with the same supplier, gross amount, and date.
            </span>
          </section>
        ) : null}
        {isLowConfidence(receipt) ? (
          <section className="signal-banner info">
            <strong>Low extraction confidence.</strong>
            <span>
              This document scored below the normal confidence threshold, so totals, tax, and coding fields should be checked before publish.
            </span>
          </section>
        ) : null}

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
            <div className="toolbar">
              <span>{documentTypeLabel(receipt.documentType)} document</span>
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  downloadCsv(
                    `document-${receipt.id}-summary-${new Date().toISOString().slice(0, 10)}.csv`,
                    buildReceiptSummaryExportRows(receipt),
                  )
                }
              >
                Export summary CSV
              </button>
            </div>
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
              <div className="toolbar">
                <span>{lineItems.length} extracted</span>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `document-${receipt.id}-line-items-${new Date().toISOString().slice(0, 10)}.csv`,
                      buildLineItemExportRows(receipt),
                    )
                  }
                >
                  Export line items CSV
                </button>
              </div>
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
              <div className="toolbar">
                <span>{taxBreakdown.length} lines</span>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `document-${receipt.id}-tax-breakdown-${new Date().toISOString().slice(0, 10)}.csv`,
                      buildTaxBreakdownExportRows(receipt),
                    )
                  }
                >
                  Export tax CSV
                </button>
              </div>
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
                navigate(props.mode === "cost" ? "/costs" : props.mode === "sales" ? "/sales" : "/vault");
              } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : "Could not delete this receipt.");
              } finally {
                setSaving(false);
              }
            }}
          >
            Delete Document
          </button>
          {!isVaultRecord ? (
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
          ) : null}
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
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    currency: "GBP",
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClaimRecord["status"] | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_total" | "lowest_total">("newest");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextStatus = params.get("status");
    const nextSort = params.get("sort");

    setStatusFilter(
      nextStatus === "pending" || nextStatus === "approved" || nextStatus === "paid" || nextStatus === "rejected"
        ? nextStatus
        : "all",
    );
    setSortOrder(
      nextSort === "oldest" || nextSort === "highest_total" || nextSort === "lowest_total"
        ? nextSort
        : "newest",
    );
  }, [location.search]);

  const filteredClaims = claims
    .filter((claim) => statusFilter === "all" || claim.status === statusFilter)
    .sort((left, right) => compareClaimRecords(left, right, sortOrder));

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
        <div className="filter-row">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ClaimRecord["status"] | "all")}>
            <option value="all">All claim statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest_total">Highest total</option>
            <option value="lowest_total">Lowest total</option>
          </select>
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredClaims.length}
            onClick={() =>
              downloadCsv(
                `claims-${new Date().toISOString().slice(0, 10)}.csv`,
                buildClaimsListExportRows(filteredClaims),
              )
            }
          >
            Export claims CSV
          </button>
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
        {filteredClaims.length ? (
          filteredClaims.map((claim) => (
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
            <strong>{statusFilter === "all" ? employeeMode ? "No claims created yet." : "No expense claims in this organisation yet." : "No claims match the current status filter."}</strong>
            <p>{statusFilter === "all" ? employeeMode ? "Create your first claim above and attach personal-spend receipts from the review workspace." : "Create a claim above to start the reimbursement approval workflow." : "Change the claim-status filter or create a new claim."}</p>
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
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_total" | "lowest_total">("newest");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? "";
    const nextStatus = params.get("status");
    const nextSort = params.get("sort");

    setQuery(nextSearch);
    setStatusFilter(nextStatus === "Processing" || nextStatus === "Review" || nextStatus === "Ready" || nextStatus === "Published" ? nextStatus : "All");
    setSortOrder(
      nextSort === "oldest" || nextSort === "highest_total" || nextSort === "lowest_total"
        ? nextSort
        : "newest",
    );
  }, [location.search]);

  const search = deferredQuery.trim().toLowerCase();
  const filteredReceipts = props.receipts.filter((receipt) => {
    const matchesSearch =
      !search ||
      `${receipt.vendorName ?? ""} ${receipt.sourceFilename} ${receipt.category ?? ""} ${receipt.rawTextSummary ?? ""}`
        .toLowerCase()
        .includes(search);
    const matchesStatus = statusFilter === "All" || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((left, right) => compareInboxRecords(left, right, sortOrder === "highest_total" ? "highest_total" : sortOrder === "lowest_total" ? "lowest_total" : sortOrder));

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
        <div className="filter-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search supplier, filename, or notes"
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
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest_total">Highest total</option>
            <option value="lowest_total">Lowest total</option>
          </select>
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredReceipts.length}
            onClick={() =>
              downloadCsv(
                `employee-dropbox-${new Date().toISOString().slice(0, 10)}.csv`,
                buildInboxExportRows(filteredReceipts),
              )
            }
          >
            Export CSV
          </button>
        </div>
      </section>
      <UploadDropZone
        title="Drop receipts into your employee queue"
        subtitle="Send multiple files into processing while keeping company-wide dashboards, settings, and peer uploads hidden from employee sessions."
        busy={props.uploadBusy}
        onFiles={(files) => props.onUpload("cost", files)}
      />
      <section className="panel table-panel">
        {filteredReceipts.length ? (
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
              {filteredReceipts.map((receipt) => (
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
        ) : (
          <div className="empty-inline-state">
            <strong>{query.trim() || statusFilter !== "All" ? "No employee receipts match the current filters." : "No employee receipts uploaded yet."}</strong>
            <p>{query.trim() || statusFilter !== "All" ? "Change the search or status filter to see more uploaded receipts." : "Use the upload area above to submit the first employee receipt into the synced drop box."}</p>
          </div>
        )}
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
  const [query, setQuery] = useState("");
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<InboxStatus | "All">("All");
  const deferredQuery = useDeferredValue(query);

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

  const search = deferredQuery.trim().toLowerCase();
  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      !search ||
      `${receipt.sourceFilename} ${receipt.vendorName ?? ""} ${receipt.category ?? ""} ${receipt.rawTextSummary ?? ""}`
        .toLowerCase()
        .includes(search);
    const matchesStatus = receiptStatusFilter === "All" || receipt.status === receiptStatusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <div className="filter-row">
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredReceipts.length}
            onClick={() =>
              downloadCsv(
                `claim-${claim.id}-${new Date().toISOString().slice(0, 10)}.csv`,
                buildClaimExportRows(claim, filteredReceipts),
              )
            }
          >
            Export claim CSV
          </button>
        {!props.employeeMode ? (
          <>
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
          </>
        ) : null}
        </div>
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
        <div className="filter-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search receipt, supplier, category, or notes"
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                setQuery(nextValue);
              });
            }}
          />
          <select value={receiptStatusFilter} onChange={(event) => setReceiptStatusFilter(event.target.value as InboxStatus | "All")}>
            <option value="All">All receipt statuses</option>
            <option value="Processing">Processing</option>
            <option value="Review">Review</option>
            <option value="Ready">Ready</option>
            <option value="Published">Published</option>
          </select>
        </div>
        {filteredReceipts.length ? (
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
              {filteredReceipts.map((receipt) => (
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
        ) : (
          <div className="empty-inline-state">
            <strong>{query.trim() || receiptStatusFilter !== "All" ? "No claim receipts match the current filters." : "No receipts linked to this claim yet."}</strong>
            <p>{query.trim() || receiptStatusFilter !== "All" ? "Change the search or receipt-status filter to inspect more linked claim receipts." : "Attach receipts to this claim from the cost workspace to review them here."}</p>
          </div>
        )}
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
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortOrder, setSortOrder] = useState<"a_z" | "z_a" | "active_first">("a_z");
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
  const deferredQuery = useDeferredValue(query);
  const search = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? "";
    const nextStatus = params.get("status");
    const nextSort = params.get("sort");

    setQuery(nextSearch);
    setStatusFilter(nextStatus === "active" || nextStatus === "inactive" ? nextStatus : "all");
    setSortOrder(nextSort === "z_a" || nextSort === "active_first" ? nextSort : "a_z");
  }, [location.search]);

  const filteredRules = props.rules.filter((rule) => {
    const matchesSearch =
      !search ||
      `${rule.supplierMatchText} ${rule.category} ${rule.taxRate} ${rule.paymentMethod}`.toLowerCase().includes(search);
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "active" ? rule.isActive : !rule.isActive;
    return matchesSearch && matchesStatus;
  }).sort((left, right) => compareSupplierRules(left, right, sortOrder));

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
        <div className="filter-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search supplier, category, tax, or payment method"
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                setQuery(nextValue);
              });
            }}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All rules</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
            <option value="a_z">Supplier A-Z</option>
            <option value="z_a">Supplier Z-A</option>
            <option value="active_first">Active first</option>
          </select>
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredRules.length}
            onClick={() =>
              downloadCsv(
                `supplier-rules-${new Date().toISOString().slice(0, 10)}.csv`,
                buildRuleExportRows(filteredRules),
              )
            }
          >
            Export rules CSV
          </button>
        </div>
        <div className="rules-list">
          {filteredRules.length ? (
            filteredRules.map((rule) => (
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
              <strong>{query.trim() || statusFilter !== "all" ? "No supplier rules match the current filters." : "No supplier rules created yet."}</strong>
              <p>{query.trim() || statusFilter !== "all" ? "Change the search or rule-status filter to see more automation rules." : "Build automation for recurring suppliers by setting category, tax rate, and payment defaults above."}</p>
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
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReconciliationLine["status"] | "All">("All");
  const [candidateFilter, setCandidateFilter] = useState<"All" | "With candidates" | "No candidates">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_amount" | "lowest_amount">("newest");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? "";
    const nextStatus = params.get("status");
    const nextCandidates = params.get("candidates");
    const nextSort = params.get("sort");

    setQuery(nextSearch);
    setStatusFilter(nextStatus === "Open" || nextStatus === "Audited" ? nextStatus : "All");
    setCandidateFilter(
      nextCandidates === "With candidates" || nextCandidates === "No candidates" ? nextCandidates : "All",
    );
    setSortOrder(
      nextSort === "oldest" || nextSort === "highest_amount" || nextSort === "lowest_amount"
        ? nextSort
        : "newest",
    );
  }, [location.search]);

  const search = deferredQuery.trim().toLowerCase();
  const filteredLines = props.lines.filter((line) => {
    const matchesSearch =
      !search ||
      `${line.description ?? ""} ${line.remittanceInformation} ${line.statementDate ?? line.bookingDate} ${line.candidates.map((candidate) => candidate.vendorName ?? "").join(" ")}`
        .toLowerCase()
        .includes(search);
    const matchesStatus = statusFilter === "All" || line.status === statusFilter;
    const matchesCandidateFilter =
      candidateFilter === "All"
        ? true
        : candidateFilter === "With candidates"
          ? line.candidates.length > 0
          : line.candidates.length === 0;
    return matchesSearch && matchesStatus && matchesCandidateFilter;
  }).sort((left, right) => compareReconciliationLines(left, right, sortOrder));

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>Bank reconciliation</h2>
          <p>Cross-reference imported statement lines against processed receipts and lock audited matches.</p>
        </div>
        <div className="filter-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search bank description or date"
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                setQuery(nextValue);
              });
            }}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReconciliationLine["status"] | "All")}>
            <option value="All">All bank lines</option>
            <option value="Open">Open only</option>
            <option value="Audited">Audited only</option>
          </select>
          <select value={candidateFilter} onChange={(event) => setCandidateFilter(event.target.value as typeof candidateFilter)}>
            <option value="All">All candidate states</option>
            <option value="With candidates">With candidates</option>
            <option value="No candidates">No candidates</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest_amount">Highest amount</option>
            <option value="lowest_amount">Lowest amount</option>
          </select>
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredLines.length}
            onClick={() =>
              downloadCsv(
                `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`,
                buildReconciliationExportRows(filteredLines),
              )
            }
          >
            Export CSV
          </button>
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
              {filteredLines.map((line) => (
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
          <span>{filteredLines.length} bank line{filteredLines.length === 1 ? "" : "s"} in view</span>
        </div>
        <div className="candidate-groups">
          {filteredLines.length ? (
            filteredLines.map((line) => (
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
              <strong>{query.trim() || statusFilter !== "All" || candidateFilter !== "All" ? "No bank lines match the current filters." : "No bank statement lines imported yet."}</strong>
              <p>{query.trim() || statusFilter !== "All" || candidateFilter !== "All" ? "Change the search, bank-line status filter, or candidate filter to inspect more reconciliation work." : "Connect a bank feed above to bring statement lines into reconciliation."}</p>
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
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <h2>Open Banking requisitions</h2>
        <span>Read-only ledger connection</span>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {feedback ? <div className="success-banner">{feedback}</div> : null}
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
            setFeedback(null);
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
        <button
          className="secondary-action"
          type="button"
          onClick={() =>
            downloadCsv(
              `requisition-draft-${new Date().toISOString().slice(0, 10)}.csv`,
              buildRequisitionDraftExportRows(provider, institutionId),
            )
          }
        >
          Export setup CSV
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={async () => {
            const copied = await copyText(institutionId.trim());
            setFeedback(copied ? "Institution id copied." : "Could not copy the institution id.");
          }}
          disabled={!institutionId.trim()}
        >
          Copy institution id
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
  const navigate = useNavigate();
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
      <div className="toolbar">
        <button
          className="secondary-action"
          type="button"
          onClick={() => navigate("/requisitions")}
        >
          Open Banking Setup
        </button>
        {status === "linked" ? (
          <button
            className="primary-action"
            type="button"
            onClick={() => navigate("/reconciliation")}
          >
            Go to Reconciliation
          </button>
        ) : status === "failed" ? (
          <button
            className="primary-action"
            type="button"
            onClick={() => navigate("/requisitions")}
          >
            Try Another Connection
          </button>
        ) : null}
      </div>
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
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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
      {copyFeedback ? <div className="success-banner">{copyFeedback}</div> : null}
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
        <button
          className="secondary-action"
          type="button"
          onClick={() =>
            downloadCsv(
              `organisation-settings-${new Date().toISOString().slice(0, 10)}.csv`,
              buildOrganisationSettingsExportRows(draft),
            )
          }
        >
          Export settings CSV
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
      {lastInvite ? (
        <div className="toolbar">
          <button
            className="secondary-action"
            type="button"
            onClick={async () => {
              const copied = await copyText(toWebsiteInviteLink(lastInvite.inviteLink));
              setCopyFeedback(copied ? "Invite link copied." : "Could not copy the invite link.");
            }}
          >
            Copy invite link
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() =>
              downloadCsv(
                `latest-invite-${new Date().toISOString().slice(0, 10)}.csv`,
                buildInviteExportRows(lastInvite),
              )
            }
          >
            Export invite CSV
          </button>
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

function MetricCard(props: { label: string; value: string; detail: string; onClick?: () => void }) {
  const content = (
    <>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </>
  );

  return props.onClick ? (
    <button className="metric-card metric-card-button" type="button" onClick={props.onClick}>
      {content}
    </button>
  ) : (
    <article className="metric-card">
      {content}
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

function SignalPill({ tone, children }: { tone: "warning" | "info"; children: string }) {
  return <span className={`signal-pill ${tone}`}>{children}</span>;
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
            <h1>Log in to Exdox</h1>
            <p>Secure access for finance teams, approvers, and employee expense users.</p>
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
                {props.busy ? "Signing in..." : "Log in"}
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
          <span>Compatible with Xero, QuickBooks, Sage and FreeAgent</span>
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
  initialPlan: BillingPlanId;
  initialBillingCycle: BillingCycle;
  initialMonthlyDocumentLimit?: number;
  initialIncludedUsers?: number;
  onRegister: (input: {
    email: string;
    password: string;
    fullName?: string;
    organisationName?: string;
    inviteToken?: string;
    billingPlan?: BillingPlanId;
    billingCycle?: BillingCycle;
    monthlyDocumentLimit?: number;
    includedUsers?: number;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState(props.initialEmail);
  const [password, setPassword] = useState("");
  const [billingPlan, setBillingPlan] = useState<BillingPlanId>(props.initialPlan);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(props.initialBillingCycle);
  const invitedFlow = Boolean(props.inviteToken);

  useEffect(() => {
    setEmail(props.initialEmail);
  }, [props.initialEmail]);

  useEffect(() => {
    setBillingPlan(props.initialPlan);
    setBillingCycle(props.initialBillingCycle);
  }, [props.initialBillingCycle, props.initialPlan]);

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
            <h1>{invitedFlow ? "Activate Exdox Access" : "Create an Exdox Workspace"}</h1>
            <p>
              {invitedFlow
                ? "Set a password to activate access to the invited workspace."
                : "Create a business workspace for receipt capture, document review, claims, and finance control."}
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
                  billingPlan: invitedFlow ? undefined : billingPlan,
                  billingCycle: invitedFlow ? undefined : billingCycle,
                  monthlyDocumentLimit:
                    invitedFlow ||
                    billingPlan !== props.initialPlan ||
                    (billingPlan !== "capture" && billingPlan !== "control")
                      ? undefined
                      : props.initialMonthlyDocumentLimit,
                  includedUsers:
                    invitedFlow ||
                    billingPlan !== props.initialPlan ||
                    (billingPlan !== "capture" && billingPlan !== "control")
                      ? undefined
                      : props.initialIncludedUsers,
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
                <>
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
                  <label>
                    Plan
                    <select value={billingPlan} onChange={(event) => setBillingPlan(event.target.value as BillingPlanId)}>
                      {pricingPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Billing Cycle
                    <select
                      value={billingCycle}
                      onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </label>
                </>
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
                {props.busy ? "Creating access..." : invitedFlow ? "Activate access" : "Create workspace"}
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
            <Link to="/pricing">Pricing</Link>
            {" | "}
            <a href="mailto:hello@exdox.co.uk?subject=Security%20request">Security</a>
          </span>
          <span>Compatible with Xero, QuickBooks, Sage and FreeAgent</span>
          <span>Copyright {new Date().getFullYear()} exdox.co.uk</span>
        </footer>
      </div>
    </div>
  );
}

function PublicSite() {
  const location = useLocation();

  if (location.pathname === "/platform") {
    return (
      <PublicLayout activePath="/platform">
        <PublicPageIntro
          kicker="Platform"
          title="A finance workspace built for operational review."
          body="Receipt capture, invoice review, claims, vault storage, supplier rules, reconciliation, and data health sit inside one connected Exdox platform."
        />
        <PlatformCapabilitiesSection />
        <CoverageSection />
        <FlowSection />
        <WorkflowCoverageSection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/integrations") {
    return (
      <PublicLayout activePath="/integrations">
        <PublicPageIntro
          kicker="Integrations"
          title="Keep evidence, review queues, and accounting handoff in one operational flow."
          body="Exdox supports connected accounting workflows with ready and published queues, protected source evidence, and bank-led reconciliation."
        />
        <IntegrationSection />
        <FlowSection />
        <WorkflowCoverageSection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/pricing") {
    return (
      <PublicLayout activePath="/pricing">
        <PricingSection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/company") {
    return (
      <PublicLayout activePath="/company">
        <PublicPageIntro
          kicker="Company"
          title="Built to keep capture, review, and source evidence aligned."
          body="Organisation-scoped records flow across mobile capture, web review, archive retrieval, and finance controls."
        />
        <CompanySection />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout activePath="/">
      <section className="public-hero">
        <div className="public-hero-copy">
          <h1>Capture, review and publish business spend without chasing paper.</h1>
          <p>
            Exdox gives businesses one synced workspace across mobile and web for receipt capture,
            invoice review, document vault storage, expense claims, supplier rules and bank-led reconciliation.
          </p>
          <div className="hero-actions">
            <Link className="public-primary" to="/register?plan=control&billingCycle=monthly">Start Free Trial</Link>
            <Link className="secondary-inline-link" to="/pricing">See pricing structure</Link>
          </div>
          <span>No credit card required to start the trial.</span>
        </div>
        <img src="/branding/exdox-platform-hero.png" alt="Connected exdox accounting workspace" />
      </section>
      <PlatformCapabilitiesSection />
      <FlowSection />
      <PricingTeaserSection />
    </PublicLayout>
  );
}

function PublicLayout(props: { activePath: string; children: React.ReactNode }) {
  return (
    <div className="public-home">
      <header className="public-header">
        <Link className="public-brand" to="/" aria-label="exdox home">
          <img src={brandMarkSrc} alt="" />
          <strong>exdox</strong>
        </Link>
        <nav className="public-nav" aria-label="Website">
          {publicNavItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `public-nav-link${isActive || props.activePath === item.to ? " active" : ""}`}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="public-actions">
          <Link to="/login">Log In</Link>
          <a className="public-button" href="mailto:hello@exdox.co.uk">Request Demo</a>
        </div>
      </header>

      <main>{props.children}</main>
      <footer className="public-footer">
        <span>Compatible with Xero, QuickBooks, Sage and FreeAgent</span>
        <span>
          <Link to="/pricing">Pricing</Link>
          {" | "}
          <a href="mailto:hello@exdox.co.uk?subject=Security%20request">Security</a>
        </span>
      </footer>
    </div>
  );
}

function PublicPageIntro(props: { kicker: string; title: string; body: string }) {
  return (
    <section className="public-page-intro">
      <p className="section-kicker">{props.kicker}</p>
      <h1>{props.title}</h1>
      <p>{props.body}</p>
    </section>
  );
}

function PlatformCapabilitiesSection() {
  return (
    <section className="capabilities-band">
      <h2>Key Platform Capabilities</h2>
      <div className="capabilities-grid">
        <Link className="capability-card" to="/register?plan=capture&billingCycle=monthly"><NavIcon name="costs" /><strong>Receipt & Invoice Capture</strong><span>Mobile and web submission</span></Link>
        <Link className="capability-card" to="/register?plan=control&billingCycle=monthly"><NavIcon name="workflow" /><strong>Approval Workflows</strong><span>Review, approve and publish in one place</span></Link>
        <Link className="capability-card" to="/register?plan=operations&billingCycle=monthly"><NavIcon name="rules" /><strong>Supplier Rules</strong><span>Consistent coding and tax defaults</span></Link>
        <Link className="capability-card" to="/register?plan=control&billingCycle=monthly"><NavIcon name="claims" /><strong>Mileage & Expense Claims</strong><span>Staff submission, mileage entry and approval</span></Link>
        <Link className="capability-card" to="/register?plan=capture&billingCycle=monthly"><NavIcon name="health" /><strong>Client Data Health</strong><span>Unreadable, duplicate and low-confidence follow-up</span></Link>
        <Link className="capability-card" to="/register?plan=operations&billingCycle=monthly"><NavIcon name="claims" /><strong>Document Vault</strong><span>Archive and retrieve source evidence fast</span></Link>
        <Link className="capability-card" to="/register?plan=operations&billingCycle=monthly"><NavIcon name="bank" /><strong>Bank Reconciliation</strong><span>Match bank-line evidence back to spend</span></Link>
        <Link className="capability-card" to="/register?plan=operations&billingCycle=monthly"><NavIcon name="integrations" /><strong>Bank & Statement Review</strong><span>Imported bank activity and evidence-led review</span></Link>
        <Link className="capability-card" to="/register?plan=control&billingCycle=monthly"><NavIcon name="open-banking" /><strong>Queue Exports</strong><span>CSV handoff across inboxes, claims, and reconciliation</span></Link>
        <Link className="capability-card" to="/register?plan=enterprise&billingCycle=annual"><NavIcon name="overview" /><strong>Organisation Switching</strong><span>Move between business contexts without leaving the workspace</span></Link>
      </div>
    </section>
  );
}

function CoverageSection() {
  return (
    <section className="workflow-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Coverage Today</p>
          <h2>Built for the documents your finance team already works with</h2>
        </div>
        <p>
          Exdox keeps the submission mix visible in one place across mobile and web, from
          receipt capture and invoice handling to mileage claims, bank-led evidence, and archived support files.
        </p>
      </div>
      <div className="document-grid">
        <Link className="document-card" to="/register?plan=capture&billingCycle=monthly"><strong>Receipts</strong><span>Mobile capture, employee submission, and web upload</span></Link>
        <Link className="document-card" to="/register?plan=capture&billingCycle=monthly"><strong>Purchase invoices</strong><span>Structured totals, tax fields, and review-ready coding</span></Link>
        <Link className="document-card" to="/register?plan=control&billingCycle=monthly"><strong>Sales documents</strong><span>Separate sales workspace with the same synced review flow</span></Link>
        <Link className="document-card" to="/register?plan=control&billingCycle=monthly"><strong>Mileage claims</strong><span>Staff mileage entry and approval-ready claim handling</span></Link>
        <Link className="document-card" to="/register?plan=operations&billingCycle=monthly"><strong>Bank-led evidence</strong><span>Imported bank activity matched back to supporting records</span></Link>
        <Link className="document-card" to="/register?plan=operations&billingCycle=monthly"><strong>Vault files</strong><span>Stored reference documents with protected retrieval</span></Link>
      </div>
    </section>
  );
}

function FlowSection() {
  return (
    <section className="workflow-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Operational Flow</p>
          <h2>Move from capture to publish without switching tools</h2>
        </div>
        <p>
          Exdox covers the bookkeeping path finance teams work through every day:
          collect evidence, extract the data, review exceptions, retain the source file, and
          keep approvals moving in the same synced workspace.
        </p>
      </div>
      <div className="process-grid">
        <Link className="process-card" to="/register?plan=capture&billingCycle=monthly"><span>1. Capture</span><strong>Collect receipts, invoices, and supporting files</strong><p>Use mobile capture, web upload, employee drop box flows, and bank-led intake.</p></Link>
        <Link className="process-card" to="/register?plan=capture&billingCycle=monthly"><span>2. Extract</span><strong>Pull out totals, tax, supplier, and line detail</strong><p>Structured extraction, VAT-aware fields, and document detail all stay visible for review.</p></Link>
        <Link className="process-card" to="/register?plan=control&billingCycle=monthly"><span>3. Review</span><strong>Work the exceptions instead of retyping everything</strong><p>Needs-review, duplicate, unreadable, and low-confidence signals surface the items that need attention.</p></Link>
        <Link className="process-card" to="/register?plan=operations&billingCycle=monthly"><span>4. Store</span><strong>Keep the original evidence easy to retrieve</strong><p>Vault storage, protected document access, and searchable archive views keep source files close at hand.</p></Link>
        <Link className="process-card" to="/register?plan=control&billingCycle=monthly"><span>5. Approve &amp; Publish</span><strong>Move claims, reviews, and handoff queues forward</strong><p>Approval-ready claims, ready queues, and export routes keep the downstream workflow moving.</p></Link>
      </div>
    </section>
  );
}

function WorkflowCoverageSection() {
  return (
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
        <Link className="workflow-card workflow-link" to="/register?plan=capture&billingCycle=monthly">
          <strong>Capture across every submission route</strong>
          <ul>
            <li>Mobile receipt capture in the app</li>
            <li>Drag-and-drop uploads in costs and sales inboxes</li>
            <li>Dedicated employee drop box for non-admin users</li>
            <li>Mileage entry and expense-claim capture for staff</li>
            <li>Bank-line review against imported statement activity</li>
            <li>Separate workspaces for purchase and sales documents</li>
          </ul>
        </Link>
        <Link className="workflow-card workflow-link" to="/register?plan=operations&billingCycle=monthly">
          <strong>Automate the review layer</strong>
          <ul>
            <li>Supplier rules for category, tax rate and payment method</li>
            <li>VAT-aware editable totals, net and tax fields</li>
            <li>Needs-review queues across costs, sales and claims</li>
            <li>Low-confidence and unreadable-document follow-up</li>
            <li>Duplicate upload checks before final publish</li>
            <li>Audit-friendly document detail editing before publish</li>
          </ul>
        </Link>
        <Link className="workflow-card workflow-link" to="/register?plan=operations&billingCycle=monthly">
          <strong>Close the loop with finance controls</strong>
          <ul>
            <li>Dedicated vault workspace for searchable archived evidence</li>
            <li>Open banking requisitions and callback handling</li>
            <li>Approval-ready claims and document review handoff</li>
            <li>Reconciliation matching against imported bank lines</li>
            <li>Filtered CSV exports across queues and document views</li>
            <li>Organisation-level VAT settings and tax defaults</li>
            <li>Live sync with the same receipt records used in mobile</li>
          </ul>
        </Link>
      </div>
    </section>
  );
}

function IntegrationSection() {
  return (
    <section className="integration-band">
      <div>
        <h2>Accounting Integrations &amp; Connected Workflows</h2>
        <p>
          Keep capture, review and accounting data moving together across your finance stack with
          synced web and mobile workflows, organisation switching, bank-linked reconciliation,
          ready-and-published handoff queues, and archive-safe evidence retrieval from the same workspace.
        </p>
      </div>
      <div className="integration-names" aria-label="Compatible accounting platforms">
        <Link to="/register?plan=control&billingCycle=monthly">Sage</Link>
        <Link to="/register?plan=control&billingCycle=monthly">Xero</Link>
        <Link to="/register?plan=control&billingCycle=monthly">QuickBooks</Link>
        <Link to="/register?plan=control&billingCycle=monthly">FreeAgent</Link>
      </div>
    </section>
  );
}

function PricingTeaserSection() {
  return (
    <section className="pricing-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Pricing</p>
          <h2>Roll out Exdox by workflow, not by disconnected tools</h2>
        </div>
        <p>
          Start with employee capture, then add supplier rules, claims, tax controls and
          reconciliation as finance operations mature.
        </p>
      </div>
      <div className="pricing-grid">
        {pricingPlans.slice(0, 3).map((plan) => (
          <Link
            key={plan.id}
            className={`pricing-card pricing-link${plan.featured ? " featured" : ""}`}
            to={buildRegisterLink(plan.id, "monthly")}
          >
            <span>{plan.name}</span>
            <strong>{plan.tagline}</strong>
            <p>{plan.monthlyPrice != null ? `${currency(plan.monthlyPrice)} per month` : "Custom pricing"}</p>
            <p>{plan.monthlyDocuments} · {plan.users}</p>
          </Link>
        ))}
      </div>
      <div className="section-actions">
        <Link className="public-button" to="/pricing">View pricing page</Link>
        <Link className="secondary-inline-link" to={buildRegisterLink("control", "monthly")}>Start Trial</Link>
      </div>
    </section>
  );
}

function PricingSection() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(normalizePublicBillingCycle(params.get("billingCycle")));
  const initialSliderIndex = Math.max(
    0,
    pricingSliderSteps.findIndex((step) => step.planId === normalizePublicPlan(params.get("plan"))),
  );
  const [sliderIndex, setSliderIndex] = useState(initialSliderIndex);
  const selectedStep = pricingSliderSteps[sliderIndex] ?? pricingSliderSteps[0]!;
  const selectedPlan = pricingPlans.find((plan) => plan.id === selectedStep.planId) ?? pricingPlans[0]!;
  const selectedPrice =
    billingCycle === "annual" ? selectedStep.annualMonthlyPrice : selectedStep.monthlyPrice;
  const selectedCredits = [
    { label: "Sheets of Bank Statement Extraction", value: selectedStep.bankStatementCredits },
    { label: "Documents with Line Item Extraction", value: selectedStep.lineItemCredits },
    { label: "Supplier Statement Extraction", value: selectedStep.supplierStatementCredits },
  ];
  const sliderBands: Array<{ id: BillingPlanId; label: string }> = [
    { id: "capture", label: "Capture" },
    { id: "control", label: "Control" },
    { id: "operations", label: "Operations" },
    { id: "enterprise", label: "Enterprise" },
  ];

  return (
    <section className="pricing-band pricing-page-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Pricing</p>
          <h1>Choose the workflow depth that fits the business.</h1>
        </div>
        <p>
          Exdox plans are structured around document volume, users, control depth, and operational workflow coverage.
        </p>
      </div>
      <div className="slider-pricing-layout">
        <article className="slider-pricing-card">
          <div className="billing-cycle-toggle" role="group" aria-label="Billing cycle">
            <button
              className={billingCycle === "monthly" ? "active" : ""}
              type="button"
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              className={billingCycle === "annual" ? "active" : ""}
              type="button"
              onClick={() => setBillingCycle("annual")}
            >
              Annual
            </button>
          </div>
          <span className="slider-save-note">Save 20% with annual billing</span>
          <div className="slider-price-row">
            <strong>{currency(selectedPrice)}</strong>
            <span>Per Month</span>
          </div>
          <span className="slider-vat-note">GBP, excludes VAT</span>
          <div className="slider-capacity-copy">
            <strong>{selectedStep.documents.toLocaleString()}</strong>
            <span>Documents Per Month</span>
          </div>
          <div className="slider-capacity-copy">
            <strong>{selectedStep.users}</strong>
            <span>Users Included</span>
          </div>
          <input
            className="pricing-slider"
            type="range"
            min={0}
            max={pricingSliderSteps.length - 1}
            step={1}
            value={sliderIndex}
            onChange={(event) => setSliderIndex(Number(event.target.value))}
            aria-label="Pricing allowance slider"
          />
          <div className="slider-bands" aria-hidden="true">
            {sliderBands.map((band) => (
              <span
                key={band.id}
                className={selectedStep.planId === band.id ? "active" : ""}
              >
                {band.label}
              </span>
            ))}
          </div>
          <p className="slider-helper">Drag the slider to increase allowance.</p>
          {selectedStep.planId === "enterprise" ? (
            <a className="public-button" href="mailto:hello@exdox.co.uk?subject=Enterprise%20pricing%20request">
              Talk to Sales
            </a>
          ) : (
            <Link
              className="public-button"
              to={buildRegisterLink(selectedStep.planId, billingCycle === "annual" ? "annual" : "monthly", {
                monthlyDocumentLimit:
                  selectedStep.planId === "capture" || selectedStep.planId === "control"
                    ? selectedStep.documents
                    : undefined,
                includedUsers:
                  selectedStep.planId === "capture" || selectedStep.planId === "control"
                    ? selectedStep.users
                    : undefined,
              })}
            >
              {selectedPlan.cta}
            </Link>
          )}
        </article>
        <div className="slider-side-stack">
          <article className="slider-info-card">
            <h2>Included extraction credits</h2>
            <ul className="slider-credit-list">
              {selectedCredits.map((credit) => (
                <li key={credit.label}>
                  <strong>{credit.value}</strong>
                  <span>{credit.label}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="slider-info-card slider-access-card">
            <h2>{selectedStep.accessBand} access band</h2>
            <p>{selectedStep.tagline}</p>
            <div className="slider-access-group">
              <strong>Unlocked</strong>
              <div className="slider-access-tags">
                {selectedStep.unlockedWorkspaces.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            {selectedStep.lockedWorkspaces.length ? (
              <div className="slider-access-group">
                <strong>Locked until next tier</strong>
                <div className="slider-access-tags slider-access-tags-locked">
                  {selectedStep.lockedWorkspaces.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <ul className="slider-feature-list">
              {selectedPlan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <p className="slider-enterprise-note">
              {selectedStep.planId === "enterprise"
                ? "For larger entity counts and tailored rollout scope, commercial setup is handled directly."
                : "Route access, users, and document allowance scale with the selected package band."}
            </p>
          </article>
        </div>
      </div>
      <div className="pricing-grid pricing-grid-expanded">
        {pricingPlans.map((plan) => (
          <article key={plan.id} className={`pricing-card${plan.featured ? " featured" : ""}`}>
            <span>{plan.name}</span>
            <strong>{plan.tagline}</strong>
            <p>{plan.trialLabel}</p>
            <p>{plan.monthlyPrice != null ? `${currency(billingCycle === "annual" ? plan.annualMonthlyPrice ?? plan.monthlyPrice : plan.monthlyPrice)} per month` : "Custom pricing"}</p>
            <p>{plan.monthlyDocuments}</p>
            <p>{plan.users}</p>
            <ul className="pricing-feature-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {plan.id === "enterprise" ? (
              <a className="public-button" href="mailto:hello@exdox.co.uk?subject=Enterprise%20pricing%20request">Talk to Sales</a>
            ) : (
              <Link className="public-button" to={buildRegisterLink(plan.id, billingCycle)}>
                {plan.cta}
              </Link>
            )}
          </article>
        ))}
      </div>
      <div className="pricing-notes-grid">
        <article className="company-card">
          <strong>Operational control</strong>
          <p>Plans are structured around access depth, team capacity, and monthly document volume.</p>
        </article>
        <article className="company-card">
          <strong>Monthly or annual</strong>
          <p>Teams can choose the billing cycle that fits procurement and budgeting requirements.</p>
        </article>
        <article className="company-card">
          <strong>Scales with volume</strong>
          <p>Higher tiers expand user capacity, document throughput, and finance workflow coverage.</p>
        </article>
      </div>
      <div className="workflow-grid pricing-faq-grid">
        <article className="workflow-card">
          <strong>Free trial</strong>
          <ul>
            <li>Capture, Control, and Operations start with a 14-day trial</li>
            <li>Enterprise can use a longer onboarding window</li>
            <li>No card required to start the initial workspace</li>
          </ul>
        </article>
        <article className="workflow-card">
          <strong>Workflow coverage</strong>
          <ul>
            <li>Capture focuses on receipt and invoice intake</li>
            <li>Control adds sales and broader approval workflow coverage</li>
            <li>Operations adds rules, vault, open banking, and reconciliation</li>
          </ul>
        </article>
        <article className="workflow-card">
          <strong>Enterprise rollout</strong>
          <ul>
            <li>Custom document volume and user capacity</li>
            <li>Priority rollout support</li>
            <li>Multi-entity finance teams and tailored onboarding</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function CompanySection() {
  return (
    <section className="company-band">
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
        <Link className="company-card company-link" to="/register?plan=control&billingCycle=monthly">
          <strong>Secure operational model</strong>
          <p>Organisation-scoped routes, authenticated sessions and protected receipt asset retrieval.</p>
        </Link>
        <Link className="company-card company-link" to="/register?plan=operations&billingCycle=monthly">
          <strong>Review-ready audit trail</strong>
          <p>Receipts, vault files, sales evidence, claims, supplier rules and reconciliation status live in one workspace.</p>
        </Link>
        <Link className="company-card company-link" to="/register?plan=enterprise&billingCycle=annual">
          <strong>Built for finance teams</strong>
          <p>Business admins get the full control surface, employees can still submit directly, and the active organisation context stays visible across the workspace.</p>
        </Link>
      </div>
    </section>
  );
}

function BillingPage(props: { session: SessionState }) {
  const navigate = useNavigate();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const lockedRoute = new URLSearchParams(useLocation().search).get("locked");
  const billing = props.session.billing;

  if (!billing) {
    return (
      <section className="panel-stack">
        <div className="panel">
          <h2>Billing</h2>
          <p>Billing information is not available for this workspace yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-stack">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Billing</p>
            <h2>{billing.planLabel ?? billing.planId} plan</h2>
          </div>
          <span className="status-chip">{billing.status.replace(/_/g, " ")}</span>
        </div>
        {lockedRoute ? <p className="locked-explainer">That workspace area is locked on your current plan: {lockedRoute}</p> : null}
        <div className="billing-metrics">
          <div className="metric-card">
            <span>Billing cycle</span>
            <strong>{billing.billingCycle}</strong>
          </div>
          <div className="metric-card">
            <span>Documents this month</span>
            <strong>
              {billing.monthlyDocumentUsage}
              {billing.monthlyDocumentLimit !== null ? ` / ${billing.monthlyDocumentLimit}` : ""}
            </strong>
          </div>
          <div className="metric-card">
            <span>Users in workspace</span>
            <strong>
              {billing.currentUserCount}
              {billing.includedUsers !== null ? ` / ${billing.includedUsers}` : ""}
            </strong>
          </div>
        </div>
        <p className="muted-copy">
          {billing.stripeConfigured
            ? "Stripe checkout is ready. Choose a plan below to open checkout, or use the billing portal if this workspace already has a Stripe customer."
            : "Stripe checkout endpoints are wired, but the live Stripe secret key and price ids have not been added yet."}
        </p>
        <div className="section-actions">
          <button className="secondary-action" type="button" onClick={() => navigate("/pricing")}>
            Compare plans
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={!billing.stripeConfigured || !billing.stripeCustomerId || busyPlan !== null}
            onClick={async () => {
              setBusyPlan("portal");
              setMessage(null);
              try {
                const response = await createBillingPortalSession(props.session.token);
                if (response.portalUrl) {
                  window.location.href = response.portalUrl;
                }
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Could not open billing portal.");
              } finally {
                setBusyPlan(null);
              }
            }}
          >
            Open billing portal
          </button>
        </div>
        {message ? <div className="error-banner">{message}</div> : null}
      </div>

      <div className="pricing-grid pricing-grid-expanded">
        {pricingPlans.map((plan) => {
          const active = billing.planId === plan.id;
          return (
            <article key={plan.id} className={`pricing-card${plan.featured ? " featured" : ""}${active ? " current-plan" : ""}`}>
              <span>{plan.name}</span>
              <strong>{plan.tagline}</strong>
              <p>{plan.monthlyPrice != null ? `${currency(plan.monthlyPrice)} per month` : "Custom pricing"}</p>
              <p>{plan.monthlyDocuments}</p>
              <p>{plan.users}</p>
              <ul className="pricing-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {active ? (
                <button className="secondary-action" type="button" disabled>
                  Current plan
                </button>
              ) : plan.id === "enterprise" ? (
                <a className="public-button" href="mailto:hello@exdox.co.uk?subject=Enterprise%20upgrade%20request">
                  Talk to sales
                </a>
              ) : (
                <button
                  className="public-button"
                  type="button"
                  disabled={busyPlan !== null}
                  onClick={async () => {
                    setBusyPlan(plan.id);
                    setMessage(null);
                    try {
                      const response = await createBillingCheckoutSession(props.session.token, {
                        planId: plan.id,
                        billingCycle: "monthly",
                      });
                      if (response.checkoutUrl) {
                        window.location.href = response.checkoutUrl;
                      }
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "Could not start checkout.");
                    } finally {
                      setBusyPlan(null);
                    }
                  }}
                >
                  {busyPlan === plan.id ? "Opening checkout..." : "Upgrade"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    health: <><path d="M12 21s-6-4.35-8.5-8.16C1.94 10.55 3.1 7 6.4 7c2 0 3.1 1.08 3.6 2 .5-.92 1.6-2 3.6-2 3.3 0 4.46 3.55 2.9 5.84C18 16.65 12 21 12 21Z" /><path d="M8 12h2l1.2-2.2L13 15l1.1-2H16" /></>,
    integrations: <><path d="M7 12h10" /><path d="M12 7v10" /><path d="M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z" /></>,
    workflow: <><path d="M4 6h8v5H4zM12 13h8v5h-8z" /><path d="M12 8h4M16 8v5M8 11v4h4" /></>,
    productivity: <><path d="M5 19h14M7 16V9M12 16V5M17 16v-3" /></>,
    automation: <><path d="M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.9l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.1l2.8-2.8" /><circle cx="12" cy="12" r="3" /></>,
    costs: <><path d="M6 3h12l2 5-2 5H6L4 8l2-5Z" /><path d="M8 17h8M9 21h6" /></>,
    sales: <><path d="M4 6h16v12H4z" /><path d="m4 9 8 5 8-5" /></>,
    claims: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 13h6M10 17h6" /></>,
    rules: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><path d="M10.5 10.5 13.5 13.5M16 3v4M3 16h4" /></>,
    bank: <><path d="m3 9 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 21h16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    billing: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M8 15h4" /></>,
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

type DuplicateInsightGroup = {
  key: string;
  records: ReceiptRecord[];
  vendorLabel: string;
  documentDate: string;
  grossAmount: number;
  workspaceLabel: string;
};

function buildDuplicateInsights(records: ReceiptRecord[]) {
  const grouped = new Map<string, ReceiptRecord[]>();

  for (const record of records) {
    for (const key of duplicateCandidateKeys(record)) {
      const existing = grouped.get(key) ?? [];
      existing.push(record);
      grouped.set(key, existing);
    }
  }

  const groups = new Map<string, DuplicateInsightGroup>();
  const byReceiptId = new Map<number, DuplicateInsightGroup>();
  const receiptIds = new Set<number>();

  for (const recordsForKey of grouped.values()) {
    if (recordsForKey.length < 2) {
      continue;
    }

    const ordered = [...recordsForKey].sort((left, right) => left.id - right.id);
    const groupKey = ordered.map((record) => record.id).join(":");
    if (groups.has(groupKey)) {
      continue;
    }

    const anchor = ordered[0]!;
    const group: DuplicateInsightGroup = {
      key: groupKey,
      records: ordered,
      vendorLabel: anchor.vendorName?.trim() || anchor.sourceFilename,
      documentDate: duplicateCandidateDate(anchor),
      grossAmount: duplicateCandidateAmount(anchor) ?? 0,
      workspaceLabel: anchor.workspaceContext === "sales" ? "Sales" : anchor.workspaceContext === "vault" ? "Vault" : "Costs",
    };

    groups.set(groupKey, group);
    for (const record of ordered) {
      byReceiptId.set(record.id, group);
      receiptIds.add(record.id);
    }
  }

  return {
    groups: Array.from(groups.values()).sort((left, right) => right.records.length - left.records.length || right.key.localeCompare(left.key)),
    byReceiptId,
    receiptIds,
  };
}

function buildWorkspaceHealthIssues(store: AppStore, limit = 4) {
  const allRecords = [...store.costs, ...store.sales, ...store.vault];
  const unreadableCount = allRecords.filter((record) => looksUnreadable(record)).length;
  const processingCount = allRecords.filter((record) => record.status === "Processing").length;
  const duplicateGroups = buildDuplicateInsights([...store.costs, ...store.sales]).groups.length;
  const pendingReviewCount = allRecords.filter((record) => record.needsReview).length;
  const lowConfidenceCount = allRecords.filter((record) => isLowConfidence(record)).length;
  const issues: Array<{ label: string; detail: string; route: string }> = [];

  if (unreadableCount) {
    issues.push({
      label: `${unreadableCount} unreadable document${unreadableCount === 1 ? "" : "s"}`,
      detail: "These records likely need manual review, re-upload, or a manual entry fallback before publish.",
      route: firstInboxRouteForIssue(store, (record) => looksUnreadable(record), "Unreadable"),
    });
  }

  if (processingCount) {
    issues.push({
      label: `${processingCount} document${processingCount === 1 ? "" : "s"} still processing`,
      detail: "Keep an eye on uploads that have not settled into Review, Ready, or Published yet.",
      route: firstInboxRouteForIssue(store, (record) => record.status === "Processing", "Processing"),
    });
  }

  if (duplicateGroups) {
    issues.push({
      label: `${duplicateGroups} duplicate candidate group${duplicateGroups === 1 ? "" : "s"}`,
      detail: "Likely repeat uploads are grouped from matching supplier or filename, amount, and date evidence.",
      route: firstInboxRouteForDuplicateReview(store),
    });
  }

  if (lowConfidenceCount) {
    issues.push({
      label: `${lowConfidenceCount} low-confidence document${lowConfidenceCount === 1 ? "" : "s"}`,
      detail: "These records have weaker extraction confidence and should be checked before they are published onward.",
      route: firstInboxRouteForIssue(store, (record) => isLowConfidence(record), "Low confidence"),
    });
  }

  if (pendingReviewCount) {
    issues.push({
      label: `${pendingReviewCount} document${pendingReviewCount === 1 ? "" : "s"} need review`,
      detail: "Review-required items are still waiting on tax, coding, claim, or publish decisions.",
      route: firstInboxRouteForIssue(store, (record) => record.needsReview, "Needs review"),
    });
  }

  return issues.slice(0, limit);
}

function buildCodingGapRecords(store: AppStore) {
  return [...store.costs, ...store.sales]
    .filter((record) => needsCodingAttention(record))
    .sort((left, right) => compareIsoDate(right.updatedAt, left.updatedAt));
}

function buildAttentionRecords(
  store: AppStore,
  duplicateGroupsByReceiptId: Map<number, DuplicateInsightGroup>,
) {
  return [...store.costs, ...store.sales, ...store.vault]
    .map((record) => {
      const reasons: string[] = [];
      if (looksUnreadable(record)) reasons.push("Unreadable");
      if (record.status === "Processing") reasons.push("Processing");
      if (duplicateGroupsByReceiptId.has(record.id)) reasons.push("Possible duplicate");
      if (isLowConfidence(record)) reasons.push("Low confidence");
      if (record.needsReview) reasons.push("Needs review");
      if (needsCodingAttention(record)) reasons.push("Coding gap");
      return { record, reasons };
    })
    .filter(({ reasons }) => reasons.length > 0)
    .sort((left, right) => {
      const severityDelta = right.reasons.length - left.reasons.length;
      if (severityDelta !== 0) {
        return severityDelta;
      }
      return compareIsoDate(right.record.updatedAt, left.record.updatedAt);
    });
}

function needsCodingAttention(record: ReceiptRecord) {
  if (record.workspaceContext === "vault") {
    return false;
  }
  return !(record.category ?? "").trim() || !(record.vendorName ?? "").trim();
}

function recordRoute(record: ReceiptRecord) {
  return `${workspaceRoute(record.workspaceContext)}/${record.id}`;
}

function workspaceRoute(context: ReceiptRecord["workspaceContext"]) {
  return context === "sales" ? "/sales" : context === "vault" ? "/vault" : "/costs";
}

function workspaceLabel(context: ReceiptRecord["workspaceContext"]) {
  return context === "sales" ? "Sales" : context === "vault" ? "Vault" : "Costs";
}

function duplicateCandidateKeys(record: ReceiptRecord) {
  const amount = duplicateCandidateAmount(record);
  if (amount === null) {
    return [];
  }

  const date = duplicateCandidateDate(record);
  const baseParts = [record.workspaceContext, amount.toFixed(2), date];
  const vendor = normalizeDuplicateText(record.vendorName);
  const fileName = normalizeDuplicateText(record.sourceFilename.replace(/\.[a-z0-9]+$/i, ""));
  const keys: string[] = [];

  if (vendor) {
    keys.push(["vendor", vendor, ...baseParts].join("|"));
  }
  if (fileName) {
    keys.push(["file", fileName, ...baseParts].join("|"));
  }

  return keys;
}

function duplicateCandidateAmount(record: ReceiptRecord) {
  const hasComponentAmount = record.netAmount != null || record.vatAmount != null;
  const gross = record.totalAmount ?? (hasComponentAmount ? (record.netAmount ?? 0) + (record.vatAmount ?? 0) : null);
  return gross === null || !Number.isFinite(gross) || gross <= 0 ? null : gross;
}

function duplicateCandidateDate(record: ReceiptRecord) {
  return (record.invoiceDate ?? record.createdAt).slice(0, 10);
}

function normalizeDuplicateText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ?? "";
}

function looksUnreadable(record: ReceiptRecord) {
  const summary = record.rawTextSummary?.toLowerCase() ?? "";
  return (
    summary.includes("could not read") ||
    summary.includes("unable to read") ||
    (record.needsReview && !record.vendorName && (record.totalAmount === null || record.totalAmount === 0))
  );
}

function isLowConfidence(record: ReceiptRecord) {
  return typeof record.confidenceScore === "number" && record.confidenceScore > 0 && record.confidenceScore < 0.75;
}

function firstInboxRouteForIssue(
  store: AppStore,
  predicate: (record: ReceiptRecord) => boolean,
  issue: "Unreadable" | "Processing" | "Low confidence" | "Needs review",
) {
  if (store.costs.some(predicate)) {
    return `/costs?issue=${encodeURIComponent(issue)}`;
  }
  if (store.sales.some(predicate)) {
    return `/sales?issue=${encodeURIComponent(issue)}`;
  }
  if (store.vault.some(predicate)) {
    return `/vault?issue=${encodeURIComponent(issue)}`;
  }
  return `/costs?issue=${encodeURIComponent(issue)}`;
}

function firstInboxRouteForSource(store: AppStore, source: ReceiptRecord["receiptSource"]) {
  if (store.costs.some((record) => record.receiptSource === source)) {
    return `/costs?source=${encodeURIComponent(source)}`;
  }
  if (store.sales.some((record) => record.receiptSource === source)) {
    return `/sales?source=${encodeURIComponent(source)}`;
  }
  if (store.vault.some((record) => record.receiptSource === source)) {
    return `/vault?source=${encodeURIComponent(source)}`;
  }
  return `/costs?source=${encodeURIComponent(source)}`;
}

function firstInboxRouteForStatus(store: AppStore, status: InboxStatus) {
  if (store.costs.some((record) => record.status === status)) {
    return `/costs?status=${encodeURIComponent(status)}`;
  }
  if (store.sales.some((record) => record.status === status)) {
    return `/sales?status=${encodeURIComponent(status)}`;
  }
  if (store.vault.some((record) => record.status === status)) {
    return `/vault?status=${encodeURIComponent(status)}`;
  }
  return `/costs?status=${encodeURIComponent(status)}`;
}

function firstInboxRouteForDuplicateReview(store: AppStore) {
  if (buildDuplicateInsights(store.costs).groups.length) {
    return "/costs?issue=Possible+duplicates";
  }
  if (buildDuplicateInsights(store.sales).groups.length) {
    return "/sales?issue=Possible+duplicates";
  }
  return "/costs?issue=Possible+duplicates";
}

function firstInboxRouteForCategorizedRecords(store: AppStore) {
  if (store.costs.some((record) => (record.category ?? "").trim())) {
    return "/costs";
  }
  if (store.sales.some((record) => (record.category ?? "").trim())) {
    return "/sales";
  }
  if (store.vault.some((record) => (record.category ?? "").trim())) {
    return "/vault";
  }
  return "/costs";
}

function firstExportRoute(store: AppStore) {
  if (store.costs.length) {
    return "/costs";
  }
  if (store.sales.length) {
    return "/sales";
  }
  if (store.vault.length) {
    return "/vault";
  }
  if (store.claims.length) {
    return "/claims";
  }
  return "/reconciliation";
}

function firstPublishedOrArchiveRoute(store: AppStore) {
  if ([...store.costs, ...store.sales, ...store.vault].some((record) => record.status === "Published")) {
    return firstInboxRouteForStatus(store, "Published");
  }
  if (store.vault.length) {
    return "/vault";
  }
  return "/costs?status=Published";
}

function firstClaimCompletionRoute(store: AppStore) {
  if (store.claims.some((claim) => claim.status === "paid")) {
    return "/claims?status=paid";
  }
  if (store.claims.some((claim) => claim.status === "approved")) {
    return "/claims?status=approved";
  }
  return "/claims";
}

function firstPendingClaimsRoute(store: AppStore) {
  if (store.claims.some((claim) => claim.status === "pending")) {
    return "/claims?status=pending";
  }
  return "/claims";
}

function firstOpenReconciliationRoute(store: AppStore) {
  if (store.reconciliation.some((line) => line.status === "Open")) {
    return "/reconciliation?status=Open";
  }
  return "/reconciliation";
}

function compareInboxRecords(
  left: ReceiptRecord,
  right: ReceiptRecord,
  sortOrder: "newest" | "oldest" | "highest_total" | "lowest_total" | "lowest_confidence",
) {
  if (sortOrder === "oldest") {
    return compareIsoDate(left.createdAt, right.createdAt);
  }
  if (sortOrder === "highest_total") {
    return (right.totalAmount ?? -1) - (left.totalAmount ?? -1) || compareIsoDate(right.createdAt, left.createdAt);
  }
  if (sortOrder === "lowest_total") {
    return (left.totalAmount ?? Number.MAX_SAFE_INTEGER) - (right.totalAmount ?? Number.MAX_SAFE_INTEGER) || compareIsoDate(right.createdAt, left.createdAt);
  }
  if (sortOrder === "lowest_confidence") {
    return (left.confidenceScore ?? Number.MAX_SAFE_INTEGER) - (right.confidenceScore ?? Number.MAX_SAFE_INTEGER) || compareIsoDate(right.createdAt, left.createdAt);
  }
  return compareIsoDate(right.createdAt, left.createdAt);
}

function compareIsoDate(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function compareClaimRecords(
  left: ClaimRecord,
  right: ClaimRecord,
  sortOrder: "newest" | "oldest" | "highest_total" | "lowest_total",
) {
  if (sortOrder === "oldest") {
    return compareIsoDate(left.createdAt, right.createdAt);
  }
  if (sortOrder === "highest_total") {
    return right.totalAmount - left.totalAmount || compareIsoDate(right.createdAt, left.createdAt);
  }
  if (sortOrder === "lowest_total") {
    return left.totalAmount - right.totalAmount || compareIsoDate(right.createdAt, left.createdAt);
  }
  return compareIsoDate(right.createdAt, left.createdAt);
}

function compareSupplierRules(
  left: SupplierRule,
  right: SupplierRule,
  sortOrder: "a_z" | "z_a" | "active_first",
) {
  if (sortOrder === "z_a") {
    return right.supplierMatchText.localeCompare(left.supplierMatchText);
  }
  if (sortOrder === "active_first") {
    return Number(right.isActive) - Number(left.isActive) || left.supplierMatchText.localeCompare(right.supplierMatchText);
  }
  return left.supplierMatchText.localeCompare(right.supplierMatchText);
}

function compareReconciliationLines(
  left: ReconciliationLine,
  right: ReconciliationLine,
  sortOrder: "newest" | "oldest" | "highest_amount" | "lowest_amount",
) {
  const leftDate = left.statementDate ?? left.bookingDate;
  const rightDate = right.statementDate ?? right.bookingDate;
  if (sortOrder === "oldest") {
    return compareIsoDate(leftDate, rightDate);
  }
  if (sortOrder === "highest_amount") {
    return (right.amountSpent ?? right.transactionAmount) - (left.amountSpent ?? left.transactionAmount) || compareIsoDate(rightDate, leftDate);
  }
  if (sortOrder === "lowest_amount") {
    return (left.amountSpent ?? left.transactionAmount) - (right.amountSpent ?? right.transactionAmount) || compareIsoDate(rightDate, leftDate);
  }
  return compareIsoDate(rightDate, leftDate);
}

function buildInboxExportRows(records: ReceiptRecord[]) {
  return records.map((record) => ({
    id: String(record.id),
    workspace: record.workspaceContext,
    status: record.status,
    source: sourceLabel(record.receiptSource),
    document_type: documentTypeLabel(record.documentType),
    supplier: record.vendorName ?? "",
    category: record.category ?? "",
    customer: record.customer ?? "",
    invoice_date: record.invoiceDate ?? "",
    due_date: record.dueDate ?? "",
    invoice_number: record.invoiceNumber ?? "",
    net_amount: formatExportNumber(record.netAmount),
    vat_amount: formatExportNumber(record.vatAmount),
    total_amount: formatExportNumber(record.totalAmount),
    subtotal_amount: formatExportNumber(record.subtotalAmount ?? null),
    total_tax_amount: formatExportNumber(record.totalTaxAmount ?? null),
    tax_rate: record.taxRateApplied ?? "",
    confidence_score: record.confidenceScore == null ? "" : String(record.confidenceScore),
    needs_review: record.needsReview ? "yes" : "no",
    description: record.description ?? "",
    notes: record.rawTextSummary ?? "",
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }));
}

function buildReceiptSummaryExportRows(receipt: ReceiptRecord) {
  return [{
    receipt_id: String(receipt.id),
    workspace: receipt.workspaceContext,
    status: receipt.status,
    source: sourceLabel(receipt.receiptSource),
    document_type: documentTypeLabel(receipt.documentType),
    supplier: receipt.vendorName ?? "",
    category: receipt.category ?? "",
    customer: receipt.customer ?? "",
    invoice_date: receipt.invoiceDate ?? "",
    due_date: receipt.dueDate ?? "",
    invoice_number: receipt.invoiceNumber ?? "",
    net_amount: formatExportNumber(receipt.netAmount),
    vat_amount: formatExportNumber(receipt.vatAmount),
    total_amount: formatExportNumber(receipt.totalAmount),
    subtotal_amount: formatExportNumber(receipt.subtotalAmount ?? null),
    total_tax_amount: formatExportNumber(receipt.totalTaxAmount ?? null),
    tax_rate: receipt.taxRateApplied ?? "",
    payment_method: receipt.paymentMethod,
    confidence_score: receipt.confidenceScore == null ? "" : String(receipt.confidenceScore),
    confidence_source: receipt.confidenceSource ?? "",
    extraction_provider: receipt.extractionProvider ?? "",
    extraction_model: receipt.extractionModel ?? "",
    needs_review: receipt.needsReview ? "yes" : "no",
    description: receipt.description ?? "",
    notes: receipt.rawTextSummary ?? "",
    created_at: receipt.createdAt,
    updated_at: receipt.updatedAt,
  }];
}

function buildLineItemExportRows(receipt: ReceiptRecord) {
  return (receipt.lineItems ?? []).map((item, index) => ({
    receipt_id: String(receipt.id),
    line_index: String(index + 1),
    description: item.description ?? "",
    quantity: item.quantity == null ? "" : String(item.quantity),
    unit_price: formatExportNumber(item.unitPrice),
    tax_amount: formatExportNumber(item.taxAmount),
    total: formatExportNumber(item.total),
  }));
}

function buildTaxBreakdownExportRows(receipt: ReceiptRecord) {
  return (receipt.taxBreakdown ?? []).map((item, index) => ({
    receipt_id: String(receipt.id),
    tax_line_index: String(index + 1),
    label: item.label ?? "",
    rate: item.rate == null ? "" : String(item.rate),
    amount: formatExportNumber(item.amount),
  }));
}

function buildClaimExportRows(claim: ClaimRecord, receipts: ReceiptRecord[]) {
  return receipts.map((receipt) => ({
    claim_id: String(claim.id),
    claim_name: claim.name,
    claim_status: claimStatusLabel(claim.status),
    claim_total: formatExportNumber(claim.totalAmount),
    receipt_id: String(receipt.id),
    supplier: receipt.vendorName ?? "",
    source_filename: receipt.sourceFilename,
    receipt_status: receipt.status,
    category: receipt.category ?? "",
    invoice_date: receipt.invoiceDate ?? "",
    total_amount: formatExportNumber(receipt.totalAmount),
    net_amount: formatExportNumber(receipt.netAmount),
    vat_amount: formatExportNumber(receipt.vatAmount),
    source: sourceLabel(receipt.receiptSource),
    document_type: documentTypeLabel(receipt.documentType),
    created_at: receipt.createdAt,
  }));
}

function buildClaimsListExportRows(claims: ClaimRecord[]) {
  return claims.map((claim) => ({
    claim_id: String(claim.id),
    claim_name: claim.name,
    status: claimStatusLabel(claim.status),
    total_amount: formatExportNumber(claim.totalAmount),
    currency: claim.currency,
    document_count: String(claim.documentCount),
    claiming_employee: claimEmployeeLabel(claim),
    description: claim.description ?? "",
    created_at: claim.createdAt,
    updated_at: claim.updatedAt,
  }));
}

function buildRuleExportRows(rules: SupplierRule[]) {
  return rules.map((rule) => ({
    rule_id: String(rule.id),
    supplier_match_text: rule.supplierMatchText,
    category: rule.category,
    tax_rate: rule.taxRate,
    payment_method: rule.paymentMethod,
    is_active: rule.isActive ? "yes" : "no",
  }));
}

function buildOrganisationSettingsExportRows(settings: OrganisationSettings) {
  return [{
    organisation_id: String(settings.organisationId),
    organisation_name: settings.organisationName,
    is_vat_registered: settings.isVatRegistered ? "yes" : "no",
    default_tax_rate: settings.defaultTaxRate,
  }];
}

function buildInviteExportRows(invite: InviteResult) {
  return [{
    user_id: String(invite.userId),
    email: invite.email,
    full_name: invite.fullName ?? "",
    role: invite.role,
    status: invite.status,
    organisation_id: String(invite.organisationId),
    delivery_method: invite.delivery?.method ?? "",
    delivered: invite.delivery?.delivered ? "yes" : "no",
    invite_link: toWebsiteInviteLink(invite.inviteLink),
  }];
}

function buildRequisitionDraftExportRows(provider: string, institutionId: string) {
  return [{
    provider,
    institution_id: institutionId.trim(),
  }];
}

function buildReconciliationExportRows(lines: ReconciliationLine[]) {
  return lines.flatMap((line) =>
    (line.candidates.length ? line.candidates : [null]).map((candidate) => ({
      bank_line_id: String(line.id),
      bank_status: line.status,
      booking_date: line.statementDate ?? line.bookingDate,
      description: line.description ?? line.remittanceInformation,
      amount_spent: formatExportNumber(line.amountSpent ?? line.transactionAmount),
      matched_receipt_id: line.matchedReceiptId == null ? "" : String(line.matchedReceiptId),
      candidate_receipt_id: candidate ? String(candidate.id) : "",
      candidate_supplier: candidate?.vendorName ?? "",
      candidate_invoice_date: candidate?.invoiceDate ?? "",
      candidate_total_amount: formatExportNumber(candidate?.totalAmount ?? null),
      candidate_source: candidate ? sourceLabel(candidate.receiptSource) : "",
      candidate_status: candidate?.status ?? "",
      candidate_match_score: candidate ? candidate.matchScore.toFixed(2) : "",
    })),
  );
}

function formatExportNumber(value: number | null) {
  return value == null ? "" : value.toFixed(2);
}

function downloadCsv(fileName: string, rows: Array<Record<string, string>>) {
  if (!rows.length || typeof window === "undefined") {
    return;
  }

  const headers = Object.keys(rows[0]!);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").replace(/"/g, "\"\"");
  return /[",]/.test(normalized) ? `"${normalized}"` : normalized;
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
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
  if (isBusinessAdmin(session) && pathname.startsWith("/billing")) {
    return true;
  }

  const allowedRoutes = session.allowedWebRoutes;
  if (!allowedRoutes?.length) {
    return isBusinessAdmin(session) ? pathname !== "/dropbox" : pathname === "/dropbox" || pathname.startsWith("/claims");
  }

  return allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getDefaultRoute(session: SessionState) {
  const allowedRoutes = session.allowedWebRoutes;
  if (allowedRoutes?.length) {
    const firstAllowed = allowedRoutes.find((route) => route !== "/billing");
    return firstAllowed ?? "/billing";
  }

  return isBusinessAdmin(session) ? "/overview" : "/dropbox";
}

function getAttentionRoute(session: SessionState, store: AppStore) {
  if (isBusinessAdmin(session) && session.billing && !isBillingStatusActive(session.billing.status)) {
    return "/billing";
  }
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
  if (store.vault.some((receipt) => receipt.needsReview || receipt.status === "Processing")) {
    return "/vault";
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
  if (pathname.startsWith("/billing")) {
    return "Billing";
  }

  const matched = navItems.find((item) => pathname.startsWith(item.to));
  return matched?.label ?? "Overview";
}

function buildRegisterLink(
  planId: BillingPlanId,
  billingCycle: BillingCycle,
  options?: {
    monthlyDocumentLimit?: number;
    includedUsers?: number;
  },
) {
  const params = new URLSearchParams({
    plan: planId,
    billingCycle,
  });
  if (typeof options?.monthlyDocumentLimit === "number") {
    params.set("monthlyDocumentLimit", String(options.monthlyDocumentLimit));
  }
  if (typeof options?.includedUsers === "number") {
    params.set("includedUsers", String(options.includedUsers));
  }
  return `/register?${params.toString()}`;
}

function normalizePublicPlan(value: string | null): BillingPlanId {
  return value === "capture" || value === "control" || value === "operations" || value === "enterprise"
    ? value
    : "control";
}

function normalizePublicBillingCycle(value: string | null): BillingCycle {
  return value === "annual" ? "annual" : "monthly";
}

function isBillingStatusActive(status: NonNullable<SessionState["billing"]>["status"]) {
  return status === "trialing" || status === "active" || status === "legacy";
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

