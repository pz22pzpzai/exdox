import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  listCompanyCards,
  confirmEmailWithToken,
  createBillingCheckoutSession,
  createBillingPortalSession,
  createClaim,
  createDepartment,
  exportEmployeeReimbursements,
  exportMasterExpenses,
  markEmployeeReimbursementsPaid,
  createRequisition,
  deleteAccount,
  deleteReceipt,
  fetchSession,
  getClaim,
  getTeam,
  getReceipt,
  getReceiptAssetUrl,
  getSettings,
  listClaims,
  listReceipts,
  listReconciliation,
  listRules,
  loginWithEmail,
  loadStoredSession,
  requestPasswordReset,
  resetPasswordWithToken,
  resendConfirmationEmail,
  registerWithEmail,
  matchReconciliation,
  assignTeamMemberDepartment,
  removeRule,
  removeCompanyCard,
  removeCompanyCardException,
  saveStoredSession,
  saveReceipt,
  saveRule,
  saveCompanyCard,
  saveCompanyCardException,
  saveSettings,
  sendInvite,
  submitContactForm,
  updateClaimStatus,
  upgradeBillingPlan,
  uploadDocuments,
} from "./api";
import type {
  BillingCycle,
  BillingPlanId,
  ClaimRecord,
  EmployeeReimbursementPaymentRow,
  Department,
  InboxStatus,
  InviteResult,
  TeamMember,
  MasterExpenseExportRow,
  OrganisationSettings,
  ReceiptRecord,
  ReconciliationLine,
  SessionState,
  SupplierRule,
  CompanyCard,
  CompanyCardEmployeeException,
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
  { to: "/overview/data-health", label: "Workspace Health", icon: "health" },
  { to: "/overview/workflows", label: "Workflows", icon: "workflow" },
  { to: "/overview/analytics", label: "Analytics", icon: "analytics" },
  { to: "/overview/automation", label: "Automation", icon: "automation" },
  { to: "/costs", label: "Costs Inbox", icon: "costs" },
  { to: "/sales", label: "Sales Inbox", icon: "sales" },
  { to: "/vault", label: "Vault", icon: "claims" },
  { to: "/claims", label: "Expense Claims", icon: "claims" },
  { to: "/rules", label: "Supplier Rules", icon: "rules" },
  { to: "/company-cards", label: "Company Cards", icon: "rules" },
  { to: "/contact", label: "Contact", icon: "contact" },
  { to: "/settings", label: "Profile/Settings", icon: "settings" },
  { to: "/billing", label: "Billing", icon: "billing" },
];

const privateAppRoutePrefixes = [
  "/overview",
  "/costs",
  "/sales",
  "/vault",
  "/claims",
  "/rules",
  "/company-cards",
  "/reconciliation",
  "/contact",
  "/settings",
  "/requisitions",
  "/billing",
  "/dropbox",
  "/employee",
  "/bank-callback",
];

function isPrivateAppPath(pathname: string) {
  return privateAppRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const publicNavItems = [
  { to: "/", label: "Home" },
  { to: "/platform", label: "Platform" },
  { to: "/integrations", label: "Workflows" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQs" },
  { to: "/company", label: "About" },
] as const;
const supportPagePath = "/contact";
const contactPagePath = "/contact";
const contactEmailAddress = "contact@exdox.co.uk";
const forgotPasswordPagePath = "/forgot-password";
const resetPasswordPagePath = "/reset-password";
const termsPagePath = "/terms";
const accountDeletionPagePath = "/account-deletion";
const termsVersion = "2026-08-31";
const cookieConsentStorageKey = "exdox-cookie-consent-v1";

type CookieConsentChoice = "essential_only" | "all_cookies";

const pricingPlans: Array<{
  id: BillingPlanId;
  name: string;
  tagline: string;
  monthlyDocuments: string;
  users: string;
  cta: string;
  trialLabel: string;
  monthlyPrice?: number;
  annualMonthlyPrice?: number;
  unlockedWorkspaces?: string[];
  monthlyDocumentLimit?: number;
  includedUsers?: number;
  features: string[];
}> = [
  {
    id: "capture",
    name: "Capture",
    tagline: "Receipt capture and review for lean teams",
    monthlyDocuments: "250 documents / month",
    users: "5 users included",
    cta: "Open Capture Trial Signup",
    trialLabel: "14-day trial",
    monthlyPrice: 15,
    annualMonthlyPrice: 12,
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    monthlyDocumentLimit: 250,
    includedUsers: 5,
    features: [
      "Mobile receipt and invoice capture",
      "Sales inbox",
      "Web upload for finance review",
      "Employee drop box",
      "Expense claims",
      "Approve expenses and claims",
      "Employee reimbursement payment summary",
      "VAT fields and manual edits",
      "Data health follow-up",
    ],
  },
  {
    id: "control",
    name: "Control",
    tagline: "Costs, sales, claims, and approval-ready workflows",
    monthlyDocuments: "1,500 documents / month",
    users: "30 users included",
    cta: "Open Control Trial Signup",
    trialLabel: "14-day trial",
    monthlyPrice: 89,
    annualMonthlyPrice: 71.2,
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    monthlyDocumentLimit: 1500,
    includedUsers: 30,
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
    tagline: "Rules, vault storage, and expanded workflow controls",
    monthlyDocuments: "3,000 documents / month",
    users: "60 users included",
    cta: "Open Operations Trial Signup",
    trialLabel: "14-day trial",
    monthlyPrice: 173,
    annualMonthlyPrice: 138.4,
    unlockedWorkspaces: ["Costs", "Sales", "Vault", "Claims"],
    monthlyDocumentLimit: 3000,
    includedUsers: 60,
    features: [
      "Everything in Control",
      "Supplier rules",
      "Vault archive workspace",
      "Expanded review workflows",
      "Advanced queue controls",
      "Archive-safe evidence retrieval",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Future enterprise rollout",
    monthlyDocuments: "Capacity to be confirmed",
    users: "Availability to be confirmed",
    cta: "Coming soon",
    trialLabel: "Coming soon",
    unlockedWorkspaces: [],
    features: [
      "Not currently available for purchase",
      "Capacity and onboarding will be announced after validation",
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
    planId: "capture",
    accessBand: "Capture",
    tagline: "Receipt capture and review for lean teams",
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    lockedWorkspaces: ["Vault", "Multi-entity"],
  },
  {
    label: "10 users",
    markerLabel: "10",
    users: 10,
    documents: 500,
    monthlyPrice: 30,
    annualMonthlyPrice: 24,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Expanded capture allowance for growing receipt volume",
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    lockedWorkspaces: ["Vault", "Multi-entity"],
  },
  {
    label: "15 users",
    markerLabel: "15",
    users: 15,
    documents: 750,
    monthlyPrice: 45,
    annualMonthlyPrice: 36,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Scaled capture capacity for broader team usage",
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    lockedWorkspaces: ["Vault", "Multi-entity"],
  },
  {
    label: "20 users",
    markerLabel: "20",
    users: 20,
    documents: 1000,
    monthlyPrice: 60,
    annualMonthlyPrice: 48,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Higher user allowance inside the capture package band",
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    lockedWorkspaces: ["Vault", "Multi-entity"],
  },
  {
    label: "25 users",
    markerLabel: "25",
    users: 25,
    documents: 1250,
    monthlyPrice: 75,
    annualMonthlyPrice: 60,
    planId: "capture",
    accessBand: "Capture",
    tagline: "Top end of the capture package range",
    unlockedWorkspaces: ["Costs", "Sales", "Claims"],
    lockedWorkspaces: ["Vault", "Multi-entity"],
  },
  ...Array.from({ length: 14 }, (_, index) => {
    const users = 30 + index * 5;
    let monthlyPrice: number;
    if (users <= 60) {
      monthlyPrice = 75 + ((users - 25) / 5) * 14;
    } else if (users <= 80) {
      monthlyPrice = 173 + ((users - 60) / 5) * 14.405;
    } else {
      monthlyPrice = 230.62 + ((users - 80) / 5) * 14.405;
    }
    monthlyPrice = Number(monthlyPrice.toFixed(2));
    const annualMonthlyPrice = Number((monthlyPrice * 0.8).toFixed(2));
    const highlightedUsers = new Set([30, 45, 60, 75, 95]);

    return {
      label: `${users} users`,
      markerLabel: highlightedUsers.has(users) ? String(users) : "",
      users,
      documents: users * 50,
      monthlyPrice,
      annualMonthlyPrice,
      planId: (users >= 60 ? "operations" : "control") as BillingPlanId,
      accessBand: users >= 60 ? "Operations" : "Control",
      tagline:
        users >= 60
          ? "Rules, vault storage, and expanded workflow controls"
          : "Costs, sales, claims, and approval-ready workflows",
      unlockedWorkspaces: users >= 60 ? ["Costs", "Sales", "Vault", "Claims"] : ["Costs", "Sales", "Claims"],
      lockedWorkspaces: users >= 60 ? ["Multi-entity"] : ["Vault", "Multi-entity"],
    };
  }),
  {
    label: "100 users",
    markerLabel: "Operations",
    users: 100,
    documents: 5000,
    monthlyPrice: 288.24,
    annualMonthlyPrice: 230.59,
    planId: "operations",
    accessBand: "Operations",
    tagline: "Rules, vault storage, and expanded workflow controls",
    unlockedWorkspaces: ["Costs", "Sales", "Vault", "Claims"],
    lockedWorkspaces: ["Multi-entity"],
  },
];

function resolvePricingSliderStep(
  planId: BillingPlanId,
  monthlyDocumentLimit?: number,
  includedUsers?: number,
) {
  return (
    pricingSliderSteps.find(
      (step) =>
        step.planId === planId &&
        step.documents === monthlyDocumentLimit &&
        step.users === includedUsers,
    ) ?? pricingSliderSteps.find((step) => step.planId === planId) ?? pricingSliderSteps[0]!
  );
}

const brandLogoSrc = "/branding/exdox-logo.webp";
const brandMarkSrc = "/branding/exdox-mark.webp";
const publicBrandMarkSrc = "/branding/exdox-mark-header-v2.webp";
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

function buildFallbackOrganisationSettings(session: SessionState): OrganisationSettings {
  const activeOrganisation =
    session.organisations.find((organisation) => organisation.id === session.activeOrganisationId) ??
    session.organisations[0];

  return {
    organisationId: activeOrganisation?.id ?? session.activeOrganisationId ?? session.user.organisationId,
    organisationName: customerFacingOrganisationName(activeOrganisation?.name),
    baseCurrency: "GBP",
    isVatRegistered: true,
    defaultTaxRate: "20% Standard",
    mileageRate: 0.45,
  };
}

function customerFacingOrganisationName(name: string | null | undefined) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return "Exdox Workspace";
  }
  const normalizedName = trimmedName.replace(/\s+/g, " ").toLowerCase();
  return normalizedName === "receiptflow test workspace" || normalizedName === "receipt flow test workspace"
    ? "Exdox Workspace"
    : trimmedName;
}

function workspaceShellKicker(pathname: string, businessAdmin: boolean) {
  if (!businessAdmin) {
    return "Employee submissions";
  }
  if (pathname.startsWith("/rules")) {
    return "Supplier automation";
  }
  if (pathname.startsWith("/company-cards")) {
    return "Company card controls";
  }
  if (pathname.startsWith("/settings")) {
    return "Profile and workspace controls";
  }
  if (pathname.startsWith("/billing")) {
    return "Subscription and access";
  }
  if (pathname.startsWith("/claims")) {
    return "Expenses and approvals";
  }
  if (pathname.startsWith("/costs")) {
    return "Costs workflow";
  }
  if (pathname.startsWith("/sales")) {
    return "Sales workflow";
  }
  if (pathname.startsWith("/vault")) {
    return "Archive and storage";
  }
  if (pathname.startsWith("/overview")) {
    return "Commercial finance workspace";
  }
  return "Exdox workspace";
}

function employeeRouteTitle(pathname: string) {
  if (pathname.startsWith("/employee/sales")) {
    return "My Sales";
  }
  if (pathname.startsWith("/employee/vault")) {
    return "My Vault";
  }
  if (pathname.startsWith("/employee/reports")) {
    return "My Reports";
  }
  if (pathname.startsWith("/claims")) {
    return "My Claims";
  }
  if (pathname.startsWith("/contact")) {
    return "Contact Exdox";
  }
  return "My Expenses";
}

function isSignedInPublicPage(pathname: string) {
  if (pathname === "/pricing" || pathname === "/account-deletion") {
    return true;
  }
  return pathname === "/platform"
    || pathname === "/integrations"
    || pathname === "/faq"
    || pathname === "/company"
    || pathname === "/contact"
    || pathname === "/terms"
    || pathname === "/privacy"
    || pathname === "/cookies";
}

function signedInPublicPrimaryRoute(session: SessionState) {
  return getDefaultRoute(session);
}

function signedInPublicPrimaryHeroLabel(session: SessionState) {
  return signedInPublicPrimaryRoute(session) === "/billing" ? "Open Billing" : "Back to Workspace";
}

function signedInPublicPrimaryNavLabel(session: SessionState) {
  return signedInPublicPrimaryRoute(session) === "/billing" ? "Billing" : "Dashboard";
}

function signedInPublicSecondaryRoute(session: SessionState) {
  return isRouteAllowed(session, "/settings") ? "/settings" : getDefaultRoute(session);
}

function signedInPublicSecondaryLabel(session: SessionState) {
  return isRouteAllowed(session, "/settings") ? "Settings" : "Back to Workspace";
}

function syncPageSearchParams(
  pathname: string,
  currentSearch: string,
  navigate: (to: string, options?: { replace?: boolean }) => void,
  entries: Record<string, string | null | undefined>,
) {
  const params = new URLSearchParams(currentSearch);
  let changed = false;

  Object.entries(entries).forEach(([key, value]) => {
    if (value == null || value === "") {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
      return;
    }

    if (params.get(key) !== value) {
      params.set(key, value);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const nextSearch = params.toString();
  navigate(`${pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
}

function isPublicSeoPath(pathname: string) {
  return pathname === "/"
    || pathname === "/platform"
    || pathname === "/integrations"
    || pathname === "/pricing"
    || pathname === "/faq"
    || pathname === "/company"
    || pathname === "/contact"
    || pathname === "/terms"
    || pathname === "/privacy"
    || pathname === "/cookies"
    || pathname === "/account-deletion"
    || pathname === "/login"
    || pathname === "/register"
    || pathname === "/confirm-email"
    || pathname === forgotPasswordPagePath
    || pathname === resetPasswordPagePath;
}

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
    updateMetaTag("property", "og:image", `${websiteOrigin}/branding/exdox-platform-hero.webp`);
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", seo.title);
    updateMetaTag("name", "twitter:description", seo.description);
    updateMetaTag("name", "twitter:image", `${websiteOrigin}/branding/exdox-platform-hero.webp`);
    updateCanonicalLink(`${websiteOrigin}${seo.canonicalPath}`);
    updateStructuredData(seo.structuredData);
  }, [pathname, session]);

  return null;
}

function buildSeoConfig(pathname: string, session: SessionState | null): SeoConfig {
  const normalizedPath = normalizeCanonicalPath(pathname);
  if (!session || isPublicSeoPath(normalizedPath)) {
    if (normalizedPath === "/platform") {
      return {
        title: "Expense Management Platform | Receipt Capture, Claims and Review | Exdox",
        description:
          "Explore the Exdox expense management platform for receipt capture, invoice review, VAT handling, document storage, claims, and approvals.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Platform",
          pageDescription:
            "Explore the Exdox expense management platform for receipt capture, invoice review, VAT handling, document storage, claims, and approvals.",
        }),
      };
    }
    if (normalizedPath === "/integrations") {
      return {
        title: "Connected Receipt and Expense Workflows | Exdox",
        description:
          "See how Exdox connects mobile capture, web review, protected source evidence, approvals, and export-ready queues.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Integrations",
          pageDescription:
            "See how Exdox connects mobile capture, web review, protected source evidence, approvals, and export-ready queues.",
        }),
      };
    }
    if (normalizedPath === "/pricing") {
      return {
        title: "Pricing for Receipt Capture and Expense Workflows | Exdox",
        description:
          "Compare Exdox pricing for receipt capture, expense claims, supplier rules, document vault storage, and review workflows.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Pricing",
          pageDescription:
            "Compare Exdox pricing for receipt capture, expense claims, supplier rules, document vault storage, and review workflows.",
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
          pageName: "About",
          pageDescription:
            "Learn how Exdox keeps mobile capture, web review, archived evidence, VAT edits, and finance controls aligned in one workspace.",
        }),
      };
    }
    if (normalizedPath === "/contact") {
      return {
        title: "Contact Exdox | Access, Billing and Product Support",
        description:
          "Contact Exdox for access support, billing questions, product enquiries, and security-related requests.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Contact Us",
          pageDescription:
            "Get in touch with Exdox for access support, billing coordination, and product enquiries.",
        }),
      };
    }
    if (normalizedPath === "/faq") {
      return {
        title: "Exdox FAQs | Help Using the App and Website",
        description:
          "Find answers for using the Exdox mobile app and website, including uploads, review queues, duplicate receipts, login issues, claims, and document sync.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "FAQs",
          pageDescription:
            "Find answers for using the Exdox mobile app and website, including uploads, review queues, duplicate receipts, login issues, claims, and document sync.",
        }),
      };
    }
    if (normalizedPath === "/terms") {
      return {
        title: "Terms and Conditions | Exdox",
        description:
          "Read the Exdox Terms and Conditions for free trials, billing, cancellation, acceptable use, account access, and service responsibilities.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Terms and Conditions",
          pageDescription:
            "Read the Exdox Terms and Conditions for free trials, billing, cancellation, acceptable use, account access, and service responsibilities.",
        }),
      };
    }
    if (normalizedPath === "/privacy") {
      return {
        title: "Privacy Policy | Exdox",
        description:
          "Read the Exdox privacy policy, including how we use cookies, analytics, contact data, and Google advertising services.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Privacy Policy",
          pageDescription:
            "Read the Exdox privacy policy, including how we use cookies, analytics, contact data, and Google advertising services.",
        }),
      };
    }
    if (normalizedPath === "/account-deletion") {
      return {
        title: "Account Deletion | Exdox",
        description:
          "Request Exdox account deletion and understand which account records are deleted, which finance records may be retained, and the expected timelines.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Account Deletion",
          pageDescription:
            "Request Exdox account deletion and understand which account records are deleted, which finance records may be retained, and the expected timelines.",
        }),
      };
    }
    if (normalizedPath === "/cookies") {
      return {
        title: "Cookie Policy | Exdox",
        description:
          "Read the Exdox cookie policy, including essential, analytics, advertising, and consent-management cookies.",
        canonicalPath: normalizedPath,
        robots: "index,follow",
        structuredData: buildPublicStructuredData({
          path: normalizedPath,
          pageName: "Cookie Policy",
          pageDescription:
            "Read the Exdox cookie policy, including essential, analytics, advertising, and consent-management cookies.",
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
    if (normalizedPath === "/confirm-email") {
      return {
        title: "Confirm Email | Exdox",
        description: "Confirm your Exdox email address and activate your workspace.",
        canonicalPath: normalizedPath,
        robots: "noindex,nofollow",
      };
    }
    if (normalizedPath === forgotPasswordPagePath) {
      return {
        title: "Forgot Password | Exdox",
        description: "Request a secure Exdox password reset link for your account.",
        canonicalPath: normalizedPath,
        robots: "noindex,nofollow",
      };
    }
    if (normalizedPath === resetPasswordPagePath) {
      return {
        title: "Reset Password | Exdox",
        description: "Choose a new password for your Exdox account.",
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
      logo: `${websiteOrigin}/branding/exdox-logo.webp`,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "contact@exdox.co.uk",
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
  const navigate = useNavigate();
  const initialStoredSession = useMemo(() => loadStoredSession(), []);
  const [session, setSession] = useState<SessionState | null>(initialStoredSession);
  const [store, setStore] = useState<AppStore>({
    costs: [],
    sales: [],
    vault: [],
    claims: [],
    rules: [],
    reconciliation: [],
    settings: null,
  });
  const [loading, setLoading] = useState(Boolean(initialStoredSession));
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
    const canOpenCosts = isRouteAllowed(nextSession, "/costs") || (!businessAdmin && isRouteAllowed(nextSession, "/dropbox"));
    const canOpenSales = isRouteAllowed(nextSession, "/sales") || (!businessAdmin && isRouteAllowed(nextSession, "/employee/sales"));
    const canOpenVault = isRouteAllowed(nextSession, "/vault") || (!businessAdmin && isRouteAllowed(nextSession, "/employee/vault"));
    const canOpenClaims = isRouteAllowed(nextSession, "/claims");
    const canOpenRules = isRouteAllowed(nextSession, "/rules");
    const canOpenReconciliation = isRouteAllowed(nextSession, "/reconciliation");
    const canOpenSettings = isRouteAllowed(nextSession, "/settings");
    const sessionToken = nextSession.token;
    const [costs, sales, vault, claims, rules, reconciliation, settings] = await Promise.all([
      canOpenCosts ? listReceipts(sessionToken, "cost") : Promise.resolve([]),
      canOpenSales ? listReceipts(sessionToken, "sales") : Promise.resolve([]),
      canOpenVault ? listReceipts(sessionToken, "vault") : Promise.resolve([]),
      canOpenClaims ? listClaims(sessionToken).catch(() => []) : Promise.resolve([]),
      businessAdmin && canOpenRules ? listRules(sessionToken).catch(() => []) : Promise.resolve([]),
      businessAdmin && canOpenReconciliation ? listReconciliation(sessionToken).catch(() => []) : Promise.resolve([]),
      businessAdmin && canOpenSettings ? getSettings(sessionToken).catch(() => null) : Promise.resolve(null),
    ]);

    saveStoredSession(nextSession);
    setSession(nextSession);
    setStore({
      costs,
      sales,
      vault,
      claims,
      rules,
      reconciliation,
      settings: settings ?? (businessAdmin ? buildFallbackOrganisationSettings(nextSession) : null),
    });
    setError(null);
    setAuthError(null);
  };

  const startPendingTrialCheckout = async (nextSession: SessionState) => {
    const billing = nextSession.billing;
    const selfServePlan = billing && ["capture", "control", "operations"].includes(billing.planId);
    if (billing?.status !== "inactive" || !selfServePlan) {
      return false;
    }

    const checkout = await createBillingCheckoutSession(nextSession.token, {
      planId: billing.planId,
      billingCycle: billing.billingCycle,
    });
    if (!checkout.checkoutUrl) {
      throw new Error("Payment setup is not available yet. Please try again shortly or contact contact@exdox.co.uk.");
    }

    window.location.assign(checkout.checkoutUrl);
    return true;
  };

  useEffect(() => {
    if (!initialStoredSession) {
      setLoading(false);
      return;
    }

    loadWorkspace(initialStoredSession.token, initialStoredSession)
      .catch((nextError: Error) => {
        clearStoredSession();
        setError(nextError.message);
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialStoredSession]);

  if (loading && !session) {
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

  if (session && location.pathname === "/confirm-email") {
    return <Navigate to={getDefaultRoute(session)} replace />;
  }

  if (location.pathname === forgotPasswordPagePath) {
    return (
      <>
        <SeoManager pathname={location.pathname} session={session} />
        <PublicLayout activePath="">
          <ForgotPasswordState
            busy={authBusy}
            error={authError ?? error}
            initialEmail={new URLSearchParams(location.search).get("email") ?? session?.user.email ?? ""}
            embeddedInPublicShell
            onRequest={async (email) => {
              setAuthBusy(true);
              setAuthError(null);
              setError(null);
              try {
                const response = await requestPasswordReset({ email });
                return response.message;
              } catch (requestError) {
                setAuthError(requestError instanceof Error ? requestError.message : "Could not start password reset.");
                return null;
              } finally {
                setAuthBusy(false);
              }
            }}
          />
        </PublicLayout>
      </>
    );
  }

  if (location.pathname === resetPasswordPagePath) {
    return (
      <>
        <SeoManager pathname={location.pathname} session={session} />
        <PublicLayout activePath="">
          <ResetPasswordState
            busy={authBusy}
            error={authError ?? error}
            email={new URLSearchParams(location.search).get("email") ?? ""}
            token={new URLSearchParams(location.search).get("token") ?? ""}
            embeddedInPublicShell
            onReset={async (email, token, password) => {
              setAuthBusy(true);
              setAuthError(null);
              setError(null);
              try {
                const response = await resetPasswordWithToken({ email, token, password });
                return response.message;
              } catch (resetError) {
                setAuthError(resetError instanceof Error ? resetError.message : "Could not reset the password.");
                return null;
              } finally {
                setAuthBusy(false);
              }
            }}
          />
        </PublicLayout>
      </>
    );
  }

  if (location.pathname === "/confirm-email") {
    return (
      <>
        <SeoManager pathname={location.pathname} session={session} />
        <PublicLayout activePath="">
          <ConfirmEmailState
            busy={authBusy}
            error={authError ?? error}
            email={new URLSearchParams(location.search).get("email") ?? ""}
            token={new URLSearchParams(location.search).get("token") ?? ""}
            embeddedInPublicShell
            onConfirm={async (email, token) => {
              setAuthBusy(true);
              setAuthError(null);
              setError(null);
              try {
                await confirmEmailWithToken({ email, token });
                navigate(`/login?email=${encodeURIComponent(email)}&confirmed=1`, { replace: true });
              } catch (confirmError) {
                setAuthError(confirmError instanceof Error ? confirmError.message : "Email confirmation failed.");
              } finally {
                setAuthBusy(false);
              }
            }}
            onResend={async (email) => {
              const response = await resendConfirmationEmail({ email });
              return response.message;
            }}
          />
        </PublicLayout>
      </>
    );
  }

  if (!session && location.pathname !== "/login") {
    if (location.pathname === "/register") {
      return (
        <>
          <SeoManager pathname={location.pathname} session={session} />
          <PublicLayout activePath="/pricing">
            <RegisterState
              busy={authBusy}
              error={authError ?? error}
              initialEmail={new URLSearchParams(location.search).get("email") ?? ""}
              inviteToken={new URLSearchParams(location.search).get("inviteToken") ?? ""}
              initialAudience={
                new URLSearchParams(location.search).get("inviteToken")
                  ? "employee"
                  : new URLSearchParams(location.search).get("audience") === "sole_trader"
                    ? "sole_trader"
                  : new URLSearchParams(location.search).has("plan")
                    ? "business"
                    : null
              }
              initialPlan={normalizePublicPlan(new URLSearchParams(location.search).get("plan"))}
              initialBillingCycle={normalizePublicBillingCycle(new URLSearchParams(location.search).get("billingCycle"))}
              initialMonthlyDocumentLimit={Number(new URLSearchParams(location.search).get("monthlyDocumentLimit")) || undefined}
              initialIncludedUsers={Number(new URLSearchParams(location.search).get("includedUsers")) || undefined}
              embeddedInPublicShell
              onRegister={async (input) => {
                setAuthBusy(true);
                setAuthError(null);
                setError(null);
                try {
                  const result = await registerWithEmail(input);
                  if (result.kind === "confirmed") {
                    await loadWorkspace(result.session.token, result.session);
                    return null;
                  }
                  if (result.checkoutUrl) {
                    window.location.assign(result.checkoutUrl);
                    return null;
                  }
                  return result.message;
                } catch (registerError) {
                  setSession(null);
                  setAuthError(registerError instanceof Error ? registerError.message : "Registration failed.");
                  return null;
                } finally {
                  setAuthBusy(false);
                }
              }}
              onResendConfirmation={async (email) => {
                const response = await resendConfirmationEmail({ email });
                return response.message;
              }}
            />
          </PublicLayout>
        </>
      );
    }
    if (isPrivateAppPath(location.pathname)) {
      return <Navigate to="/login" replace />;
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
        <PublicLayout activePath="">
          <LoginState
            busy={authBusy}
            error={authError ?? error}
            initialEmail={new URLSearchParams(location.search).get("email") ?? ""}
            confirmationComplete={new URLSearchParams(location.search).get("confirmed") === "1"}
            confirmationStatus={new URLSearchParams(location.search).get("confirmation")}
            checkoutStatus={new URLSearchParams(location.search).get("checkout")}
            accountDeleted={new URLSearchParams(location.search).get("accountDeleted") === "1"}
            embeddedInPublicShell
            onLogin={async (email, password) => {
              setAuthBusy(true);
              setAuthError(null);
              setError(null);
              try {
                const loginResult = await loginWithEmail({ email, password });
                if (loginResult.kind === "pending_confirmation") {
                  if (loginResult.checkoutUrl) {
                    window.location.assign(loginResult.checkoutUrl);
                    return;
                  }
                  setAuthError(loginResult.message);
                  return;
                }
                const nextSession = loginResult.session;
                if (await startPendingTrialCheckout(nextSession)) {
                  return;
                }
                await loadWorkspace(nextSession.token, nextSession);
              } catch (loginError) {
                setSession(null);
                setAuthError(loginError instanceof Error ? loginError.message : "Sign in failed.");
              } finally {
                setAuthBusy(false);
              }
            }}
          />
        </PublicLayout>
      </>
    );
  }

  if (isSignedInPublicPage(location.pathname)) {
    return (
      <>
        <SeoManager pathname={location.pathname} session={session} />
        <PublicSite session={session} />
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
                  const uploadResult = await uploadDocuments(session.token, workspaceContext, files);
                  const refreshed = await listReceipts(session.token, workspaceContext);
                  setStore((current) => ({
                    ...current,
                    [targetKey]: refreshed,
                  }));
                  if (uploadResult.failed.length) {
                    const failedSummary = uploadResult.failed.map((item) => item.fileName).join(", ");
                    setError(
                      uploadResult.uploaded.length
                        ? `Uploaded ${uploadResult.uploaded.length} of ${files.length} files. Failed: ${failedSummary}.`
                        : `None of the selected files finished uploading. Failed: ${failedSummary}.`,
                    );
                  }
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
              onReimbursementsMarkedPaid={async () => {
                const [result, costs, claims] = await Promise.all([
                  markEmployeeReimbursementsPaid(session.token),
                  listReceipts(session.token, "cost"),
                  listClaims(session.token),
                ]);
                setStore((current) => ({ ...current, costs, claims }));
                return result.paidCount;
              }}
              onReimbursementsExported={async () => {
                const [costs, claims] = await Promise.all([
                  listReceipts(session.token, "cost"),
                  listClaims(session.token),
                ]);
                setStore((current) => ({ ...current, costs, claims }));
              }}
              onReceiptDelete={async (id) => {
                await deleteReceipt(session.token, id);
                const refreshedClaims = await listClaims(session.token);
                setStore((current) => ({
                  ...current,
                  costs: current.costs.filter((item) => item.id !== id),
                  sales: current.sales.filter((item) => item.id !== id),
                  vault: current.vault.filter((item) => item.id !== id),
                  claims: refreshedClaims,
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
                const [receipt, asset] = await Promise.all([
                  getReceipt(session.token, id),
                  getReceiptAssetUrl(session.token, id),
                ]);
                return {
                  receipt,
                  assetUrl: asset.previewUrl,
                  downloadUrl: asset.downloadUrl,
                };
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
  onReimbursementsMarkedPaid: () => Promise<number>;
  onReimbursementsExported: () => Promise<void>;
  onReceiptDelete: (id: number) => Promise<void>;
  onAttachReceiptToClaim: (receiptId: number, claimId: number) => Promise<ReceiptRecord>;
  onClaimCreate: (payload: { name?: string; description?: string; currency?: string; claimType?: 'standard' | 'mileage'; startPostcode?: string; endPostcode?: string; totalMiles?: number; mileageRate?: number }) => Promise<ClaimRecord>;
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
  onSettingsSave: (payload: Pick<OrganisationSettings, "baseCurrency" | "isVatRegistered" | "defaultTaxRate">) => Promise<void>;
  onInviteEmployee: (payload: {
    email: string;
    fullName?: string;
    role?: "Business_Admin" | "Standard_Employee";
    departmentId?: number | null;
  }) => Promise<InviteResult>;
  onActiveOrganisationChange: (organisationId: number) => Promise<void>;
  onSignOut: () => void;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null; downloadUrl: string | null }>;
  loadClaim: (id: number) => Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }>;
}) {
  const [uploadBusy, setUploadBusy] = useState(false);
  const [confirmationResendBusy, setConfirmationResendBusy] = useState(false);
  const [confirmationResendFeedback, setConfirmationResendFeedback] = useState<string | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const businessAdmin = isBusinessAdmin(props.session);
  const approvalWorkflowsEnabled = hasSessionFeature(props.session, "approval_workflows");
  const costReviewCount = props.store.costs.filter((receipt) => countsAsManualReview(receipt)).length;
  const salesReviewCount = props.store.sales.filter((receipt) => countsAsManualReview(receipt)).length;
  const vaultAttentionCount = props.store.vault.filter((receipt) => receipt.needsReview || receipt.status === "Processing").length;
  const pendingClaimCount = pendingClaimsNeedingAction(props.store.claims).length;
  const paymentProcessingCount = props.store.costs.filter(
    (receipt) =>
      receipt.paymentMethod === "cash_personal" &&
      receipt.status === "Payment processing" &&
      !receipt.needsReview,
  ).length;
  const openBankMatchCount = props.store.reconciliation.filter((line) => line.status === "Open").length;
  const actionBreakdown = [
    { count: costReviewCount, label: "cost review" },
    { count: salesReviewCount, label: "sales review" },
    { count: vaultAttentionCount, label: "vault upload" },
    { count: pendingClaimCount, label: "pending claim" },
    { count: openBankMatchCount, label: "bank match" },
  ].filter((item) => item.count > 0);
  const actionLabel = actionBreakdown.length
    ? actionBreakdown.map((item) => `${item.count} ${item.label}${item.count === 1 ? "" : "s"}`).join(" + ")
    : "No actions needed";
  const visibleNavItems = businessAdmin
    ? navItems
      .filter((item) => props.session.user.isOwner || item.to !== "/billing")
      .map((item) => ({
        ...item,
        locked: !isRouteAllowed(props.session, item.to),
      }))
    : [
        { to: "/dropbox", label: "My Costs", icon: "costs" },
        ...(isRouteAllowed(props.session, "/employee/sales") ? [{ to: "/employee/sales", label: "My Sales", icon: "sales" }] : []),
        { to: "/employee/vault", label: "My Vault", icon: "claims", locked: !isRouteAllowed(props.session, "/employee/vault") },
        { to: "/claims", label: "My Claims", icon: "claims" },
        { to: "/employee/reports", label: "My Reports", icon: "analytics" },
        { to: "/contact", label: "Contact", icon: "contact" },
      ];
  const defaultRoute = getDefaultRoute(props.session);
  const dashboardNavigationLinks = (onNavigate?: () => void) => visibleNavItems.map((item) => {
    const locked = "locked" in item && item.locked;
    const destination = locked && businessAdmin ? `/billing?locked=${encodeURIComponent(item.to)}` : item.to;
    return (
      <NavLink
        key={item.to}
        className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}${locked ? " locked" : ""}`}
        to={destination}
        onClick={onNavigate}
      >
        <NavIcon name={item.icon} />
        {item.label}
        {locked ? <span className="sidebar-lock-tag">Locked</span> : null}
      </NavLink>
    );
  });

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-main">
          <Link className="brand-lockup" to={defaultRoute} aria-label="Exdox workspace home">
            <img className="brand-mark" src={publicBrandMarkSrc} alt="" />
            <strong>Exdox</strong>
          </Link>
          <nav className="sidebar-nav" aria-label="Primary">
            {dashboardNavigationLinks()}
          </nav>
        </div>
        <div className="sidebar-card">
          {businessAdmin ? (
            <>
              <span>Secure workspace</span>
              <strong>Organisation-based access</strong>
              <p>Uploads, review queues, and settings stay separated by organisation and user permissions.</p>
            </>
          ) : (
            <>
              <span>Personal workspace</span>
              <strong>Employee view</strong>
              <p>Review your own expenses and claims, download your history, and contact Exdox support.</p>
            </>
          )}
        </div>
      </aside>

      {mobileNavigationOpen ? (
        <>
          <button
            className="dashboard-nav-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside className="mobile-dashboard-nav" aria-label="Workspace navigation">
            <div className="mobile-dashboard-nav-header">
              <Link className="brand-lockup" to={defaultRoute} onClick={() => setMobileNavigationOpen(false)} aria-label="Exdox workspace home">
                <img className="brand-mark" src={publicBrandMarkSrc} alt="" />
                <strong>Exdox</strong>
              </Link>
              <button
                className="mobile-dashboard-close"
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavigationOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <nav className="sidebar-nav mobile-dashboard-links" aria-label="Mobile primary">
              {dashboardNavigationLinks(() => setMobileNavigationOpen(false))}
            </nav>
          </aside>
        </>
      ) : null}

      <main className="workspace">
        <header className="topbar">
          <button
            className="dashboard-menu-button"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavigationOpen}
            onClick={() => setMobileNavigationOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p className="topbar-kicker">{workspaceShellKicker(location.pathname, businessAdmin)}</p>
            <h1>{businessAdmin ? routeTitle(location.pathname) : employeeRouteTitle(location.pathname)}</h1>
          </div>
          <div className="topbar-actions">
            {businessAdmin ? (
              <>
                <select
                  className="org-selector"
                  value={props.session.activeOrganisationId}
                  onChange={(event) => props.onActiveOrganisationChange(Number(event.target.value))}
                >
                  {props.session.organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {customerFacingOrganisationName(organisation.name)}
                    </option>
                  ))}
                </select>
                {actionBreakdown.length ? (
                  <button
                    className="icon-button action-count-button"
                    type="button"
                    aria-label={actionLabel}
                    title={actionLabel}
                    onClick={() => navigate("/overview/attention")}
                  >
                    {actionLabel}
                  </button>
                ) : (
                  <span className="icon-button action-count-button action-count-static" aria-label={actionLabel} title={actionLabel}>
                    {actionLabel}
                  </span>
                )}
                {paymentProcessingCount > 0 ? (
                  <button
                    className="icon-button action-count-button"
                    type="button"
                    aria-label={`Review ${paymentProcessingCount} reimbursement payment${paymentProcessingCount === 1 ? "" : "s"} before marking them paid`}
                    title={`Review ${paymentProcessingCount} reimbursement payment${paymentProcessingCount === 1 ? "" : "s"} before marking them paid`}
                    onClick={() => navigate(`/costs?status=${encodeURIComponent("Payment processing")}`)}
                  >
                    {`${paymentProcessingCount} payment${paymentProcessingCount === 1 ? "" : "s"} to mark paid`}
                  </button>
                ) : null}
              </>
            ) : (
              <span className="employee-workspace-label">
                <span>Personal workspace</span>
                <strong>My Exdox</strong>
              </span>
            )}
              {isRouteAllowed(props.session, "/settings") ? (
              <button className="secondary-action" type="button" onClick={() => navigate("/settings")}>
                Profile/Settings
              </button>
            ) : null}
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
            ) : <span className="employee-read-only-badge">Personal workspace</span>}
          </div>
        </header>

        {props.error ? <div className="error-banner">{props.error}</div> : null}

        {new URLSearchParams(location.search).get("confirmed") === "1"
          && props.session.user.status === "active" ? (
            <div className="success-banner" role="status">
              Email confirmed
            </div>
          ) : null}

        {props.session.user.status === "pending_confirmation" ? (
          <div className="email-confirmation-notice" role="status">
            <div>
              <strong>Confirm your email within three days</strong>
              <span>
                Your card setup is complete and your workspace is available now. Confirm {props.session.user.email}
                {props.session.user.emailConfirmationDueAt
                  ? ` by ${new Date(props.session.user.emailConfirmationDueAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}`
                  : " within three days"} to keep access.
              </span>
              {confirmationResendFeedback ? (
                <span className="confirmation-resend-feedback" aria-live="polite">
                  {confirmationResendFeedback}
                </span>
              ) : null}
            </div>
            <button
              className="secondary-action"
              type="button"
              disabled={confirmationResendBusy}
              onClick={async () => {
                setConfirmationResendBusy(true);
                setConfirmationResendFeedback(null);
                try {
                  const response = await resendConfirmationEmail({ email: props.session.user.email });
                  setConfirmationResendFeedback(response.message);
                } catch (resendError) {
                  setConfirmationResendFeedback(
                    resendError instanceof Error
                      ? resendError.message
                      : "The confirmation email could not be sent. Please try again.",
                  );
                } finally {
                  setConfirmationResendBusy(false);
                }
              }}
            >
              {confirmationResendBusy ? "Sending..." : "Resend confirmation email"}
            </button>
          </div>
        ) : null}

        <Routes>
          {businessAdmin ? (
            <>
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview" element={<OverviewPage session={props.session} store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/data-health" element={<DataHealthPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/integrations" element={<Navigate to="/overview/workflows" replace />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/workflows" element={<WorkflowPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/productivity" element={<Navigate to="/overview/data-health" replace />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <>
                  <Route path="/overview/analytics" element={<SpendingReportsPage store={props.store} />} />
                  <Route path="/overview/reports" element={<Navigate to="/overview/analytics" replace />} />
                </>
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/automation" element={<AutomationPage store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") ? (
                <Route path="/overview/attention" element={<AttentionPage session={props.session} store={props.store} />} />
              ) : null}
              {isRouteAllowed(props.session, "/overview") || isRouteAllowed(props.session, "/billing") ? (
                <Route path="/pricing" element={<PricingSection session={props.session} />} />
              ) : null}
              <Route path="/contact" element={<WorkspaceContactPage session={props.session} />} />
              {isRouteAllowed(props.session, "/costs") ? (
                <Route
                  path="/costs"
                  element={
                    <InboxPage
                      title="Costs Inbox"
                      records={props.store.costs}
                      basePath="/costs"
                      showEmployeeFilter
                      settings={props.store.settings}
                      uploadBusy={uploadBusy}
                      onUpload={(files) => props.onUpload("cost", files)}
                      onReimbursementsMarkedPaid={props.onReimbursementsMarkedPaid}
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
                      sessionToken={props.session.token}
                      fallbackRecords={props.store.costs}
                      claims={props.store.claims}
                      settings={props.store.settings}
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      onAttachToClaim={props.onAttachReceiptToClaim}
                      onReimbursementsExported={props.onReimbursementsExported}
                      canUseApprovalWorkflows={approvalWorkflowsEnabled}
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
                      settings={props.store.settings}
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
                      sessionToken={props.session.token}
                      fallbackRecords={props.store.sales}
                      claims={props.store.claims}
                      settings={props.store.settings}
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      onAttachToClaim={props.onAttachReceiptToClaim}
                      loadReceipt={props.loadReceipt}
                      canUseApprovalWorkflows={approvalWorkflowsEnabled}
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
                      settings={props.store.settings}
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
                      sessionToken={props.session.token}
                      fallbackRecords={props.store.vault}
                      claims={props.store.claims}
                      settings={props.store.settings}
                      onSave={props.onReceiptSave}
                      onDelete={props.onReceiptDelete}
                      onAttachToClaim={props.onAttachReceiptToClaim}
                      loadReceipt={props.loadReceipt}
                      canUseApprovalWorkflows={approvalWorkflowsEnabled}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/claims") ? (
                <Route path="/claims" element={<ClaimsPage session={props.session} claims={props.store.claims} onCreateClaim={props.onClaimCreate} />} />
              ) : null}
              {isRouteAllowed(props.session, "/claims") ? (
                <Route
                  path="/claims/:id"
                  element={<ClaimDetailPage onStatusChange={props.onClaimStatusChange} loadClaim={props.loadClaim} settings={props.store.settings} canUseApprovalWorkflows={approvalWorkflowsEnabled} />}
                />
              ) : null}
              <Route path="/dropbox" element={<Navigate to="/costs" replace />} />
              <Route path="/dropbox/:id" element={<DropboxDetailRedirect />} />
              {isRouteAllowed(props.session, "/rules") ? (
                <Route
                  path="/rules"
                  element={
                    <RulesPage rules={props.store.rules} onSave={props.onRuleSave} onDelete={props.onRuleDelete} />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/company-cards") ? (
                <Route path="/company-cards" element={<CompanyCardsPage token={props.session.token} />} />
              ) : null}
              {isRouteAllowed(props.session, "/settings") ? (
                <Route
                  path="/settings"
                  element={
                    <SettingsPage
                      session={props.session}
                      settings={props.store.settings ?? buildFallbackOrganisationSettings(props.session)}
                      onSave={props.onSettingsSave}
                      onInviteEmployee={props.onInviteEmployee}
                      onSignOut={props.onSignOut}
                    />
                  }
                />
              ) : null}
              {isRouteAllowed(props.session, "/settings") ? (
                <Route path="/settings/delete-account" element={<DeleteAccountPage session={props.session} />} />
              ) : null}
              {props.session.user.isOwner ? (
                <>
                  <Route path="/billing" element={<BillingPage session={props.session} />} />
                  <Route path="/billing/upgrade" element={<BillingUpgradePage session={props.session} />} />
                </>
              ) : null}
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </>
          ) : (
            <>
              <Route
                path="/dropbox"
                element={<EmployeeDocumentsPage title="My costs" description="Upload and view your own receipts. Personal expenses can be added to reimbursement claims after they are approved." records={props.store.costs} workspaceContext="cost" settings={props.store.settings} onUpload={(files) => props.onUpload("cost", files)} uploadBusy={uploadBusy} />}
              />
              {isRouteAllowed(props.session, "/employee/sales") ? (
                <Route
                  path="/employee/sales"
                  element={<EmployeeDocumentsPage title="My sales" description="Upload and view your own sales documents. Company-wide sales review remains with your finance team." records={props.store.sales} workspaceContext="sales" settings={props.store.settings} onUpload={(files) => props.onUpload("sales", files)} uploadBusy={uploadBusy} />}
                />
              ) : null}
              <Route
                path="/employee/vault"
                element={isRouteAllowed(props.session, "/employee/vault")
                  ? <EmployeeDocumentsPage title="My vault" description="Store and retrieve your own supporting documents in the secure company vault." records={props.store.vault} workspaceContext="vault" settings={props.store.settings} onUpload={(files) => props.onUpload("vault", files)} uploadBusy={uploadBusy} />
                  : <EmployeeVaultLockedPage />}
              />
              <Route
                path="/claims"
                element={<ClaimsPage session={props.session} claims={props.store.claims} onCreateClaim={props.onClaimCreate} employeeMode />}
              />
              <Route
                path="/claims/:id"
                element={
                  <ClaimDetailPage
                    onStatusChange={props.onClaimStatusChange}
                    loadClaim={props.loadClaim}
                    settings={props.store.settings}
                    employeeMode
                  />
                }
              />
              <Route path="/contact" element={<WorkspaceContactPage session={props.session} />} />
              <Route path="/employee/reports" element={<EmployeeReportsPage costs={props.store.costs} sales={props.store.sales} vault={props.store.vault} claims={props.store.claims} settings={props.store.settings} />} />
              <Route path="/dropbox/:id" element={<EmployeeReceiptDetailPage fallbackRecords={[...props.store.costs, ...props.store.sales, ...props.store.vault]} loadReceipt={props.loadReceipt} />} />
              <Route path="/employee/sales/:id" element={<EmployeeReceiptDetailPage fallbackRecords={[...props.store.costs, ...props.store.sales, ...props.store.vault]} loadReceipt={props.loadReceipt} />} />
              <Route path="/employee/vault/:id" element={<EmployeeReceiptDetailPage fallbackRecords={[...props.store.costs, ...props.store.sales, ...props.store.vault]} loadReceipt={props.loadReceipt} />} />
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </>
          )}
        </Routes>
      </main>
      <HelpChatWidget />
    </div>
  );
}

type HelpChatMessage = {
  id: number;
  sender: "assistant" | "visitor";
  text: string;
};

const helpChatQuickPrompts = [
  "How do I get started?",
  "How do I upload a receipt?",
  "How do reimbursement payments work?",
  "How do I invite a manager?",
];

function helpChatReply(message: string) {
  const input = message.toLowerCase().replace(/[^a-z0-9£@]+/g, " ").trim();
  const includes = (...terms: string[]) => terms.some((term) => input.includes(term));

  if (!input) {
    return "It looks as though your message did not come through. Tell me what you are trying to do and I will point you in the right direction.";
  }
  if (/^(hi|hello|hey|hiya|good morning|good afternoon|good evening|morning|afternoon|evening)\b/.test(input) && input.split(" ").length <= 4) {
    return "Hello! I’m the Exdox assistant. I can help you find your way around receipts, sales, claims, Vault, reviews, plans, and account access. What would you like to do?";
  }
  if (/(how are you|how s it going|hows it going|are you okay|are you there)/.test(input)) {
    return "I’m here and ready to help. What are you working on in Exdox today?";
  }
  if (/^(thanks|thank you|cheers|great|perfect|that helps|ok|okay)\b/.test(input)) {
    return "You’re very welcome. If anything else comes up, just ask — I’m happy to help.";
  }
  if (/^(bye|goodbye|see you|see ya|talk later|that s all|thats all)\b/.test(input)) {
    return "Goodbye for now. Take care, and come back whenever you need a hand with Exdox.";
  }
  if (includes("register", "sign up", "create account", "open an account", "new account")) {
    return "Choose Register to start. Select A business or A sole trader to choose a plan, create the workspace, set up the card for the free trial, and then sign in. Select An employee of a business if you are joining an employer's workspace. Employees do not set up billing.";
  }
  if (includes("business or sole trader", "sole trader", "business owner", "which account type", "account type")) {
    return "Businesses and sole traders follow the same plan and billing flow. A business can use its company name; a sole trader can use a trading name or continue with a personal email address. Both become the workspace owner and control billing. Employees use the separate employee route.";
  }
  if (includes("join company", "join a company", "join my employer", "employee registration", "employee sign up", "employee signup", "employee account", "company email")) {
    return "Employees do not need a card. If your employer uses a private company email domain, register as an employee with that email to join the matching confirmed workspace. If you use a public address such as Gmail or Outlook, ask the business owner to send an individual invite from Profile/Settings.";
  }
  if (includes("invite", "invitation", "add employee", "add staff", "add a user")) {
    return "The business owner or a manager can open Profile/Settings, choose Team & access, enter the person's email, select Employee or Manager, choose an optional department, and create the invite. The recipient follows the Exdox link to create their own password and access the right workspace.";
  }
  if (includes("manager", "other admin", "additional admin", "add admin", "admin access")) {
    return "Managers are additional business administrators. They can review company expenses and claims, manage operational workflow, and download company CSV exports. Only the original workspace owner can manage Stripe billing, cancel the subscription, or delete the workspace.";
  }
  if (includes("department", "team department", "drivers", "office staff", "depot")) {
    return "Create and manage departments in Profile/Settings under Team & access. You can name them to match your business, then assign or move employees between them. In Costs Inbox, use the department filter to focus review work on one team without changing that employee's access level.";
  }
  if (includes("confirm email", "email confirmation", "verify email", "verification link", "confirmation link", "resend confirmation")) {
    return "Use the newest confirmation email from Exdox and open its link on any device. The link confirms the email, then takes you to the Exdox login page so you can sign in normally. If it has expired or does not work, use Resend confirmation email from the workspace or contact Access support.";
  }
  if (includes("free trial", "card setup", "card details", "stripe checkout", "first charge", "charged")) {
    return "For a business or sole-trader workspace, card setup is completed securely in Stripe Checkout. The 14-day trial starts after checkout. The first subscription charge is taken only when the trial ends, unless the workspace owner cancels before renewal. Employees never enter the business card details.";
  }
  if (includes("google play", "play store", "download app", "android app", "install app")) {
    return "The Exdox Android app is available through Google Play. Use the app for capture on the move and the website for wider review, team, billing, and administration tasks. Sign in with the same Exdox email address on both.";
  }
  if (includes("overview", "dashboard", "no actions needed", "actions needed", "attention queue")) {
    return "Overview is the workspace summary. The action button totals live work that still needs attention, such as document reviews, Vault processing, or pending claims. Select it to open the Attention queue. 'No actions needed' means there is no current review or payment action in that workspace.";
  }
  if (includes("workspace health", "data health", "unreadable", "missing supplier", "missing category", "review completion")) {
    return "Workspace Health brings together record-quality checks and day-to-day workflow progress. It highlights unreadable uploads, processing documents, review work, missing supplier or category details, claims progress, and handoff queues. It is not an error score: open the relevant item, complete the missing details, and save the review.";
  }
  if (includes("submission channels", "mobile capture", "web upload", "how can documents enter")) {
    return "Documents enter Exdox through the mobile app capture flow or the website upload buttons for Costs, Sales, and Vault. Exdox does not currently offer inbound email submission, bank feeds, or accounting-software imports, so those are not routes you need to configure.";
  }
  if (includes("workflow", "workflow page", "productivity", "automation")) {
    return "Workflows, Workspace Health, and Automation are operational views of the same workspace. Workspace Health shows where records need attention and how work is progressing; Workflows shows the approval lanes; Automation manages supplier-rule defaults. They do not replace the final human review and approval step.";
  }
  if (includes("reviewed in purchases", "reviewed purchase", "reviewed receipt", "ready for reimbursement", "awaiting reimbursement")) {
    return "A Reviewed purchase has passed document review but has not yet been included in a reimbursement payment batch, so it remains in Purchases. When an admin downloads the Employee reimbursement payment summary, eligible personal expenses move to Payment processing and then appear in the employee's Reports archive.";
  }
  if (includes("payment processing", "mark as paid", "payment batch", "reimbursement payment", "reimbursement summary", "reimbursement csv")) {
    return "After all eligible personal expenses are approved, a business admin downloads the Employee reimbursement payment summary CSV. Exdox marks those expenses Payment processing so they cannot appear in the next batch. Once the business has paid them, use the bulk Mark as paid action. Employees then see the records as Paid in Reports.";
  }
  if (includes("master export", "master csv", "approved expense export", "accountant csv", "expense summary csv")) {
    return "In Expense Claims, business admins can use Master approved expense export. Select the relevant employee claims and Exdox creates one accountant-friendly row per employee with totals and counts, not individual receipt lines. The selected employees receive an Exdox summary email without their payment amount.";
  }
  if (includes("export all", "detailed csv", "cost csv", "sales csv", "download csv")) {
    return "Use Export CSV in Costs, Sales, Vault, Claims, or Settings for the information shown in that area. Filter first if you only need one status, employee, department, supplier, or date range. For employee payment totals, use Employee reimbursement payment summary rather than a detailed receipt export.";
  }
  if (includes("claim approved", "claim rejected", "claim pending", "expense claim status", "submit claim", "create claim", "attach to claim")) {
    return "Employees create a claim and attach their own personal-spend receipts. A manager or business admin then reviews it. Pending means it is waiting for a decision; Approved means it is ready for the finance payment process; Rejected means the employee should check the feedback and make the needed changes. Paid is the final payment state.";
  }
  if (includes("cost review", "approve cost", "approve receipt", "costs inbox", "supplier bill")) {
    return "Costs Inbox is for receipts, supplier bills, and purchase evidence. Open each Review item, check supplier, date, category, payment method, totals, and VAT where applicable, save corrections, then approve it. Approved personal-spend items can later be included in a reimbursement payment summary.";
  }
  if (includes("sales review", "approve sales", "sales invoice", "sales inbox")) {
    return "Sales Inbox is for sales invoices and supporting sales documents. Upload through Upload Sales, then open the Review item, check the extracted customer, invoice number, date, totals, category, and VAT, save corrections, and approve it. Sales records are separate from employee reimbursement workflows.";
  }
  if (includes("vault ocr", "vault processing", "vault status", "vault upload", "archive document")) {
    return "Vault is for source evidence you need to store separately from active Costs and Sales. Upload with Upload Vault. Exdox reads the file using the same OCR route as receipt and invoice uploads, then records a Ready or Review outcome. Vault documents do count towards the workspace document allowance.";
  }
  if (includes("supplier rules", "automatic category", "default category", "automatic tax", "automatic payment method")) {
    return "Supplier Rules let business administrators save repeat defaults for matching supplier documents, including category, tax rate, and payment method. Create or adjust rules in Supplier Rules, but still review unfamiliar or unusual documents before approval.";
  }
  if (includes("filter employee", "filter department", "filter costs", "filter sales", "filter vault", "search costs")) {
    return "Use the inbox filters to narrow records by status, issue, source, document type, employee, department, and sort order where available. The employee and department filters are especially useful for managers processing work for a particular team. Search works well with supplier, filename, category, note, or document text.";
  }
  if (includes("usage allowance", "documents remaining", "documents left", "monthly allowance", "document limit", "over limit")) {
    return "Business admins can see current document usage and remaining allowance on Overview and Billing. Costs, Sales, and Vault uploads count towards the monthly limit. If the allowance is too small, the workspace owner can use Billing to compare or upgrade the plan.";
  }
  if (includes("upgrade plan", "change plan", "more users", "more documents", "increase allowance")) {
    return "Only the workspace owner can change the subscription. Go to Billing and choose Upgrade plan, select a higher plan or allowance, and complete the secure Stripe update. Exdox updates the existing subscription and the workspace allowance; it does not create a separate customer subscription.";
  }
  if (includes("cancel subscription", "cancel trial", "stop trial", "cancel billing", "payment details", "billing portal")) {
    return "Only the original workspace owner can cancel or change payment details. Go to Billing or Profile/Settings and open Manage or cancel subscription. The Stripe billing portal shows the active trial or subscription and confirms any cancellation date before you finish.";
  }
  if (includes("account deletion", "delete workspace", "delete my business", "close workspace")) {
    return "Only the original workspace owner can delete a workspace. Go to Profile/Settings, choose Account deletion, review the consequences, and complete the confirmation. This cancels the linked Stripe subscription and permanently removes workspace data, so export anything you need first. Employees and managers cannot delete the business workspace.";
  }
  if (includes("change email", "change account email", "change my email", "profile email")) {
    return "Email-address changes are handled through Profile/Settings using Open email change request. This protects the workspace from an unauthorised account change. Use Access support if you cannot sign in to submit the request.";
  }
  if (includes("two factor", "2fa", "authenticator", "google authenticator")) {
    return "Two-factor authentication is not self-serve yet. You can request it from Profile/Settings using Open 2FA request, or contact the Exdox security team. Never share a password, verification code, or recovery code in this chat.";
  }
  if (includes("browser preferences", "start page", "date format", "compact tables", "alerts", "notifications")) {
    return "Profile/Settings lets each user choose their default landing page, date format, compact table view, and browser-specific upload, review, and claim alerts. These preferences apply only to the browser where you save them, not to every person in the workspace.";
  }
  if (includes("bank", "open banking", "bank feed", "reconciliation", "xero", "quickbooks", "sage", "accounting software")) {
    return "Exdox does not currently provide bank feeds, Open Banking, bank reconciliation, or live accounting-software integrations. Do not rely on the product for those connections yet. You can use the available CSV exports for your accountant or finance process instead.";
  }
  if (includes("employee view", "employee dashboard", "what can employees see", "employee permissions", "my expenses", "my claims")) {
    return "Employees use the same login but receive a personal Exdox workspace. They can see only their own expenses and claims, track their reimbursement status, download their personal expense CSV, and contact support. They cannot see the business dashboard, other employees' data, billing, company settings, or approval controls.";
  }
  if (includes("organisation switch", "current organisation", "switch organisation", "multiple organisations")) {
    return "If your account has permission for more than one workspace, business administrators can use the organisation selector in the top bar to switch between them. Records, review queues, usage, team settings, and exports stay separate for each organisation.";
  }
  if (includes("contact form", "contact us", "access support", "billing support", "security contact", "support request")) {
    return "Use Contact for account-specific help. The form can route general questions, Access support, Billing support, onboarding, security requests, and account-deletion queries to contact@exdox.co.uk. When signed in, your name and email are prefilled. The form sends the message directly; it does not open an email draft.";
  }
  if (includes("cookie", "cookies", "privacy policy", "terms and conditions", "terms of service")) {
    return "The footer links to Exdox's Privacy, Cookies, and Terms pages. The cookie prompt lets you choose essential-only or all cookies. You can change that choice later using Cookie preferences in the footer. For a personal data or security request, use Contact rather than sharing private details in chat.";
  }
  if (includes("what can you do", "what do you do", "how can you help", "help me", "getting started", "get started", "new here", "new user")) {
    return "I can explain how Exdox works and help with everyday tasks: capturing receipts, uploading cost or sales documents, reviewing extracted details, claims, Vault, supplier rules, exports, plans, and signing in. Tell me what you are trying to achieve and we can take it step by step.";
  }
  if (includes("what is exdox", "what does exdox", "about exdox", "what is this")) {
    return "Exdox is a connected finance workspace for capturing business documents, reviewing them, keeping source evidence safe, managing employee claims, and preparing export-ready records. The mobile app is ideal for capture on the move; the website gives you the wider review and administration workspace.";
  }
  if (includes("app or website", "app and website", "mobile app", "android", "phone")) {
    return "Use the mobile app to capture receipts or upload files while you are out and about. Use the website for the wider workspace: reviewing Costs and Sales, managing Claims and Vault, working with supplier rules, exports, billing, and settings. Both use the same Exdox account and sync to the same organisation.";
  }
  if (includes("upload", "add", "submit", "take a photo", "camera", "receipt", "invoice", "document")) {
    if (includes("sales", "customer invoice", "outbound")) {
      return "For sales evidence, choose Upload Sales in the workspace and add the relevant invoice or supporting document. It will enter the Sales review flow, where you can check the extracted details before it is approved.";
    }
    if (includes("vault", "archive", "store a file")) {
      return "Use Upload Vault for documents you want to keep as protected source evidence. Vault items are stored separately from the Costs and Sales review queues, but they still receive Exdox processing so you can find and check their details later.";
    }
    return "To upload a cost document on the website, choose Upload Costs and select the receipt, bill, or invoice. In the mobile app, use the camera button to take a photo or choose a file. Exdox reads the document, then places it in the relevant review queue so you can confirm the details.";
  }
  if (includes("review", "approve", "approval", "next expense", "save changes", "ready", "to be reviewed", "to be review")) {
    return "A document in review is waiting for a person to check it. Open it, confirm or correct details such as supplier, date, total, category, and VAT where relevant, save your changes, then approve it when it is accurate. This keeps the final record and exports reliable.";
  }
  if (includes("processing", "reading", "still loading", "stuck", "not finished", "taking long")) {
    return "A short processing period is normal while Exdox reads and prepares the document. Try refreshing the relevant queue and opening the record again. If it remains in processing longer than expected, please contact support with the document name and approximate upload time — but never send passwords or card details in chat.";
  }
  if (includes("wrong", "incorrect", "mistake", "edit", "change", "fix", "unknown supplier", "missing details")) {
    return "That is exactly what the review step is for. Open the document, update the supplier, date, amount, category, tax, or other incorrect field, and save the changes before approval. “Unknown supplier” or “Missing details” usually means a key review field still needs completing, rather than a problem with your account.";
  }
  if (includes("duplicate", "same receipt", "twice", "again", "already uploaded")) {
    return "Exdox checks for duplicate receipts so the same document does not become two normal records. If you uploaded a receipt twice, the duplicate should be blocked, particularly when the same file is used. If two records remain, avoid approving both and contact support with their filenames or dates.";
  }
  if (includes("sync", "not showing", "can t see", "cannot see", "missing from website", "missing from app", "different on")) {
    return "The app and website normally stay in sync, although a new upload or recent edit can take a moment to settle. Refresh the list, reopen the document, and check its latest saved details. If it still appears in one place but not the other, support can investigate the account-specific record.";
  }
  if (includes("costs", "costs inbox", "expense", "purchase")) {
    return "Costs is where receipts, supplier bills, and purchase documents are reviewed. Use the Costs Inbox to search and filter documents, open a row, check the extracted details, save corrections, and move each item through its review workflow.";
  }
  if (includes("sales", "sales inbox")) {
    return "Sales is the workspace for your outbound sales evidence. Upload the relevant sales documents there, review the extracted information, and keep the approved record alongside the rest of your Exdox evidence trail.";
  }
  if (includes("vault", "archive")) {
    return "Vault is Exdox’s protected document store. Use it for source documents you need to retain and retrieve, separate from your active Costs and Sales review queues. You can upload files to Vault and later search or open them from the workspace.";
  }
  if (includes("claim", "reimbursement", "personal expense", "employee expense")) {
    return "Claims are for employee expenses and reimbursement workflows. Employees can submit and track their own expenses and claims; business administrators can review the appropriate claim records and export approved reimbursement information when the review is complete.";
  }
  if (includes("employee", "staff", "team", "invite", "user access", "permissions", "role")) {
    return "Business administrators manage the organisation workspace and its controls. Employees can submit and track their own expenses and claims, but they do not see company billing, settings, approval controls, or other people’s records. For an invite or access issue, use the Contact page’s Access support option.";
  }
  if (includes("search", "find", "filter", "where is", "locate")) {
    return "In Costs, Sales, and Vault, start with the search box and narrow the result with the available status or issue filters. Supplier names, filenames, categories, notes, and document wording are useful things to search for.";
  }
  if (includes("export", "csv", "download", "report", "reporting")) {
    return "Exdox provides CSV exports from the relevant workspace views once documents or claims are in the right state. Business administrators can also use the claims area for approved-expense and reimbursement summaries. If you tell me what you need to export, I can point you to the closest area.";
  }
  if (includes("supplier rule", "rules", "category", "categorise", "categorize")) {
    return "Supplier rules help keep repeat documents consistent. In the website workspace, review a document’s supplier and category, then use the Rules area to manage the matching behaviour available to your plan. You should still review new or unusual documents before approval.";
  }
  if (includes("vat", "tax", "net", "gross")) {
    return "During review, check that the total and tax information matches the document. VAT-registered workspaces can review net, VAT, gross, and tax-rate information; where VAT tracking is turned off, Exdox uses a simpler gross-total view. If you are unsure what should be recorded, check with your accountant or finance adviser.";
  }
  if (includes("price", "pricing", "plan", "trial", "billing", "card", "cancel", "subscription", "upgrade", "allowance", "limit", "usage", "documents left")) {
    return "You can compare plan capacity and pricing on the Pricing page. Business administrators can see document usage, manage their trial or subscription, upgrade where available, and cancel before renewal from Billing. Costs, Sales, and Vault uploads count towards the monthly document allowance.";
  }
  if (includes("password", "login", "log in", "sign in", "forgot", "reset", "email confirm", "confirmation", "activate", "invite link")) {
    return "For sign-in trouble, first make sure you are using the email address linked to the workspace, then use Forgot Password on the login page if needed. After registration, confirm your email using the latest Exdox email. If an invitation or activation link is not working, the Contact page has an Access support route.";
  }
  if (includes("delete", "close account", "remove account", "data removal")) {
    return "A business administrator can permanently close an Exdox workspace from Profile/Settings. Closing the workspace cancels its linked subscription and removes the workspace data, so please make sure you have any records you need before continuing. The Account deletion page explains the process.";
  }
  if (includes("privacy", "data", "secure", "security", "gdpr", "cookies", "terms")) {
    return "Exdox keeps organisation records within authenticated workspace access and uses protected document retrieval. For the full details on privacy, cookies, terms, or a security request, please use the links in the website footer or the Contact page. Please do not share passwords, payment details, or private documents in this chat.";
  }
  if (includes("contact", "support", "speak to", "human", "person", "email", "phone", "demo", "onboarding")) {
    return "For help that needs someone to look at your specific account, use the Contact page. It has routes for general questions, access support, billing support, onboarding, demos, security, and account deletion. You can also email contact@exdox.co.uk. Please keep passwords, card details, and private documents out of chat messages.";
  }
  return "I want to make sure I point you to the right place. I can help with receipts and uploads, Costs, Sales, Vault, Claims, review, syncing, plans, access, and support. Could you tell me a little more about what you are trying to do?";
}

function HelpChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<HelpChatMessage[]>([
    { id: 1, sender: "assistant", text: "Hello. I am the Exdox support assistant. How can I help today?" },
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const thread = threadRef.current;
      thread?.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isReplying, messages.length, open]);

  const sendMessage = (rawMessage: string) => {
    const text = rawMessage.trim();
    if (!text || isReplying) {
      return;
    }
    setMessages((current) => [...current, { id: Date.now(), sender: "visitor", text }]);
    setDraft("");
    setIsReplying(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: Date.now() + 1, sender: "assistant", text: helpChatReply(text) }]);
      setIsReplying(false);
    }, 420);
  };

  const toggle = () => setOpen((current) => !current);

  return (
    <div className={`help-chat${open ? " is-open" : ""}`}>
      {open ? (
        <section className="help-chat-panel" role="dialog" aria-label="Exdox support chat">
          <div className="help-chat-header">
            <div className="help-chat-avatar" aria-hidden="true">E</div>
            <div className="help-chat-title">
              <strong>Exdox support</strong>
              <span><i /> Online now</span>
            </div>
            <button className="help-chat-close" type="button" onClick={toggle} aria-label="Close Exdox support chat">
              ×
            </button>
          </div>
          <div className="help-chat-body">
            <div ref={threadRef} className="help-chat-thread" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`help-chat-message ${message.sender}`}>
                  {message.text}
                </div>
              ))}
              {isReplying ? <div className="help-chat-message assistant help-chat-typing"><span /><span /><span /></div> : null}
            </div>
            <div className="help-chat-prompts" aria-label="Suggested questions">
              {helpChatQuickPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={isReplying}>{prompt}</button>
              ))}
            </div>
            <form
              className="help-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(draft);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a question..."
                aria-label="Ask Exdox support a question"
              />
              <button type="submit" disabled={!draft.trim() || isReplying} aria-label="Send message">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 9-18 9 3-9-3-9Zm3 9h8" /></svg>
              </button>
            </form>
            <p className="help-chat-disclaimer">General guidance only. <Link to="/contact" onClick={() => setOpen(false)}>Contact support</Link> for account-specific help.</p>
          </div>
        </section>
      ) : null}
      <button
        className="help-chat-trigger"
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Close Exdox support chat" : "Open Exdox support chat"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 3H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h3.5L12 21l3.5-4H19a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3Z" />
          <path d="M7 9h10M7 12h6" />
        </svg>
        <span>Chat with us</span>
      </button>
    </div>
  );
}

function OverviewPage({ session, store }: { session: SessionState; store: AppStore }) {
  const navigate = useNavigate();
  const totalCosts = sumGross(store.costs);
  const totalSales = sumGross(store.sales);
  const vaultDocuments = store.vault.length;
  const pendingClaims = pendingClaimsNeedingAction(store.claims).length;
  const monthlyDocumentUsage = Math.max(0, session.billing?.monthlyDocumentUsage ?? 0);
  const monthlyDocumentLimit = session.billing?.monthlyDocumentLimit ?? null;
  const remainingDocumentAllowance = monthlyDocumentLimit === null
    ? null
    : Math.max(0, monthlyDocumentLimit - monthlyDocumentUsage);
  const usagePercentage = monthlyDocumentLimit && monthlyDocumentLimit > 0
    ? Math.min(100, Math.round((monthlyDocumentUsage / monthlyDocumentLimit) * 100))
    : 0;
  const workspaceUserCount = Math.max(1, session.billing?.currentUserCount ?? 1);
  const includedUserLimit = session.billing?.includedUsers ?? null;
  const recentVaultDocuments = store.vault.slice(0, 4);
  const duplicateInsights = buildDuplicateInsights([...store.costs, ...store.sales]);
  const healthIssues = buildWorkspaceHealthIssues(store);
  const isNewWorkspace = store.costs.length === 0
    && store.sales.length === 0
    && store.vault.length === 0
    && store.claims.length === 0;

  return (
    <div className="stack-page">
      {isNewWorkspace ? (
        <section className="onboarding-panel" aria-labelledby="onboarding-title">
          <div className="onboarding-intro">
            <span>Getting started</span>
            <h2 id="onboarding-title">Set up your first Exdox workflow</h2>
            <p>Start with one real document, check the result, then invite the people who will use the workspace.</p>
          </div>
          <div className="onboarding-steps">
            <div className="onboarding-step complete">
              <span>1</span>
              <div>
                <strong>{session.user.status === "active" ? "Email confirmed" : "Confirm your email"}</strong>
                <small>{session.user.status === "active" ? "Your account is ready." : "Use the link in your confirmation email."}</small>
              </div>
            </div>
            <Link className="onboarding-step" to="/costs">
              <span>2</span>
              <div>
                <strong>Upload your first expense</strong>
                <small>Add a receipt or supplier invoice for review.</small>
              </div>
            </Link>
            <Link className="onboarding-step" to="/settings">
              <span>3</span>
              <div>
                <strong>Invite your team</strong>
                <small>Add employees or another workspace administrator.</small>
              </div>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="metrics-grid">
        <MetricCard label="Costs ledger" value={currency(totalCosts)} detail={`${store.costs.length} documents`} to="/costs" />
        <MetricCard label="Sales ledger" value={currency(totalSales)} detail={`${store.sales.length} invoices`} to="/sales" />
        <MetricCard label="Vault archive" value={String(vaultDocuments)} detail="Stored reference files" to="/vault" />
        <MetricCard label="Pending claims" value={String(pendingClaims)} detail="Approval workload" to={firstPendingClaimsRoute(store)} />
        <UsageAllowanceCard
          usage={monthlyDocumentUsage}
          limit={monthlyDocumentLimit}
          remaining={remainingDocumentAllowance}
          percentage={usagePercentage}
          userCount={workspaceUserCount}
          userLimit={includedUserLimit}
        />
        <MetricCard
          label="Duplicate review"
          value={String(duplicateInsights.groups.length)}
          detail={
            duplicateInsights.groups.length
              ? `${duplicateInsights.receiptIds.size} receipts need a duplicate check`
              : "No likely duplicate uploads detected"
          }
          to={firstInboxRouteForDuplicateReview(store)}
        />
      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Inbox throughput</h2>
            <span>Live totals</span>
          </div>
          <div className="status-strip">
            {[
              {
                key: "processing",
                label: "Processing",
                count: [...store.costs, ...store.sales, ...store.vault].filter((item) => hasInboxStatus(item, "Processing")).length,
                route: firstInboxRouteForStatus(store, "Processing"),
              },
              {
                key: "needs-review",
                label: "Needs review",
                count: [...store.costs, ...store.sales, ...store.vault].filter((item) => countsAsManualReview(item)).length,
                route: firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"),
              },
              {
                key: "ready",
                label: "Ready",
                count: [...store.costs, ...store.sales, ...store.vault].filter((item) => hasInboxStatus(item, "Ready")).length,
                route: firstInboxRouteForStatus(store, "Ready"),
              },
              {
                key: "published",
                label: "Published",
                count: [...store.costs, ...store.sales, ...store.vault].filter((item) => hasInboxStatus(item, "Published")).length,
                route: firstInboxRouteForStatus(store, "Published"),
              },
            ].map((item) => (
              <button className="status-box" type="button" key={item.key} onClick={() => navigate(item.route)}>
                <strong>{item.count}</strong>
                <span>{item.label}</span>
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
            <Link className="secondary-action" to="/overview/data-health">
              Open data health view
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

function AttentionPage({ session, store }: { session: SessionState; store: AppStore }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = isBusinessAdmin(session);
  const issueFilter = parseAttentionIssueFilter(new URLSearchParams(location.search).get("issue"));
  const items: Array<{ title: string; detail: string; route: string; count?: number; countLabel?: string }> = issueFilter
    ? buildAttentionItemsForIssue(store, issueFilter)
    : [];

  if (!issueFilter && isAdmin && session.billing && !isBillingStatusActive(session.billing.status)) {
    items.push({
      title: "Billing needs attention",
      detail: "The current workspace plan is not active.",
      route: "/billing",
    });
  }
  if (!issueFilter && isAdmin) {
    const costReview = store.costs.filter((receipt) => countsAsManualReview(receipt)).length;
    if (costReview > 0) {
      items.push({
        title: "Costs need review",
        detail: `${costReview} cost records still need review or final checks.`,
        route: "/costs?issue=Needs%20review",
        count: costReview,
        countLabel: `${costReview} cost review${costReview === 1 ? "" : "s"}`,
      });
    }
    const salesReview = store.sales.filter((receipt) => countsAsManualReview(receipt)).length;
    if (salesReview > 0) {
      items.push({
        title: "Sales need review",
        detail: `${salesReview} sales records still need review or final checks.`,
        route: "/sales?issue=Needs%20review",
        count: salesReview,
        countLabel: `${salesReview} sales review${salesReview === 1 ? "" : "s"}`,
      });
    }
    const vaultAttention = store.vault.filter((receipt) => receipt.needsReview || receipt.status === "Processing").length;
    if (vaultAttention > 0) {
      items.push({
        title: "Vault uploads need attention",
        detail: `${vaultAttention} archived files still need review or are still processing.`,
        route: "/vault",
        count: vaultAttention,
        countLabel: `${vaultAttention} vault upload${vaultAttention === 1 ? "" : "s"}`,
      });
    }
    const pendingClaims = pendingClaimsNeedingAction(store.claims).length;
    if (pendingClaims > 0) {
      items.push({
        title: "Claims are pending",
        detail: `${pendingClaims} claims are still waiting for approval or payment.`,
        route: "/claims?status=pending",
        count: pendingClaims,
        countLabel: `${pendingClaims} pending claim${pendingClaims === 1 ? "" : "s"}`,
      });
    }
  } else if (pendingClaimsNeedingAction(store.claims).length > 0) {
    const pendingClaims = pendingClaimsNeedingAction(store.claims).length;
    items.push({
      title: "Claims are pending",
      detail: `${pendingClaims} claims are still waiting for approval or payment.`,
      route: "/claims?status=pending",
      count: pendingClaims,
      countLabel: `${pendingClaims} pending claim${pendingClaims === 1 ? "" : "s"}`,
    });
  }

  const activeGroupCount = items.length;
  const activeSummary =
    activeGroupCount > 0
      ? items.map((item) => item.countLabel ?? item.title).join(" + ")
      : issueFilter
        ? `No ${issueFilter.toLowerCase()} actions`
        : "No active actions";

  return (
    <div className="stack-page">
      <section className="panel">
        <div className="panel-heading">
          <h2>Attention queue</h2>
          <span>{activeSummary}</span>
        </div>
        <p className="muted-copy">
          {issueFilter
            ? `Review the live ${issueFilter.toLowerCase()} items across the workspace. The total adds up all actions listed below.`
            : "Review the live items that still need action across the workspace. The total adds up all actions listed below."}
        </p>
      </section>
      <section className="panel">
        {items.length ? (
          <div className="summary-list">
            {items.map((item) => (
              <button
                key={`${item.title}-${item.route}`}
                className="summary-action-row"
                type="button"
                onClick={() => navigate(item.route)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <span>{item.countLabel ?? (item.count ? `${item.count} action${item.count === 1 ? "" : "s"}` : "Open")}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No attention items right now</strong>
            <p>The workspace is clear of review, claims, and reconciliation follow-up.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function DataHealthPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allRecords = [...store.costs, ...store.sales, ...store.vault];
  const healthIssues = buildWorkspaceHealthIssues(store, 6, false);
  const codingGapRecords = buildCodingGapRecords(store);
  const attentionRecords = buildAttentionRecords(store, false);
  const workspaceBreakdown = [
    { label: "Costs", route: "/costs", records: attentionRecords.filter(({ record }) => record.workspaceContext === "cost") },
    { label: "Sales", route: "/sales", records: attentionRecords.filter(({ record }) => record.workspaceContext === "sales") },
    { label: "Vault", route: "/vault", records: attentionRecords.filter(({ record }) => record.workspaceContext === "vault") },
  ];
  const unreadableCount = allRecords.filter((record) => looksUnreadable(record)).length;
  const processingCount = allRecords.filter((record) => record.status === "Processing").length;
  const reviewCount = allRecords.filter((record) => countsAsManualReview(record)).length;
  const readyCount = allRecords.filter((record) => record.status === "Ready").length;
  const publishedCount = allRecords.filter((record) => record.status === "Published").length;
  const pendingClaims = pendingClaimsNeedingAction(store.claims).length;
  const completedClaims = store.claims.filter((claim) => claim.status === "approved" || claim.status === "paid").length;
  const reviewCompletion = allRecords.length ? Math.round(((allRecords.length - reviewCount) / allRecords.length) * 100) : 0;
  const claimCompletion = store.claims.length ? Math.round((completedClaims / store.claims.length) * 100) : 0;
  const sourceMix = [
    { label: "Mobile", count: allRecords.filter((record) => record.receiptSource === "mobile").length, route: firstInboxRouteForSource(store, "mobile") },
    { label: "Web", count: allRecords.filter((record) => record.receiptSource === "web_upload").length, route: firstInboxRouteForSource(store, "web_upload") },
    { label: "Email", count: allRecords.filter((record) => record.receiptSource === "email").length, route: firstInboxRouteForSource(store, "email") },
  ];

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard
          label="Unreadable"
          value={String(unreadableCount)}
          detail="Manual fallback or re-upload needed"
          onClick={() => navigate(attentionRouteForIssue("Unreadable"))}
        />
        <MetricCard
          label="Still processing"
          value={String(processingCount)}
          detail="Uploads not yet settled into review"
          onClick={() => navigate(attentionRouteForIssue("Processing"))}
        />
        <MetricCard
          label="Needs review"
          value={String(reviewCount)}
          detail="Review or publish decisions are still outstanding"
          onClick={() => navigate(attentionRouteForIssue("Needs review"))}
        />
        <MetricCard
          label="Missing details"
          value={String(codingGapRecords.length)}
          detail="Documents missing category or supplier"
          onClick={() => navigate(codingGapRecords[0] ? recordRoute(codingGapRecords[0]) : "/costs")}
        />
        <MetricCard
          label="Review completion"
          value={`${reviewCompletion}%`}
          detail="Records no longer waiting for manual review"
          onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))}
        />
        <MetricCard
          label="Claims completion"
          value={`${claimCompletion}%`}
          detail="Claims approved or fully paid"
          onClick={() => navigate(firstClaimCompletionRoute(store))}
        />
        <MetricCard
          label="Ready for handoff"
          value={String(readyCount + publishedCount)}
          detail="Records ready for export or already published"
          onClick={() => navigate(readyCount ? firstInboxRouteForStatus(store, "Ready") : firstPublishedOrArchiveRoute(store))}
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
                  <strong>{codingGapRecords.length} document{codingGapRecords.length === 1 ? "" : "s"} missing supplier or category</strong>
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
                      {workspaceLabel(record.workspaceContext)} | {currency(receiptGrossAmount(record))} | {record.createdAt.slice(0, 10)} | {reasons.join(", ")}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li>
                <strong>No data-health blockers right now</strong>
                <span>Unreadable, processing, review-required, and incomplete records will show up here automatically.</span>
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

      </section>

      <section className="overview-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Operational throughput</h2>
            <span>Where work is currently waiting</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.status === "Processing", "Processing"))}>
                <strong>Processing backlog</strong>
                <span>{processingCount} document{processingCount === 1 ? " is" : "s are"} still settling into the review flow.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))}>
                <strong>Manual review load</strong>
                <span>{reviewCount} document{reviewCount === 1 ? " still needs" : "s still need"} review, tax, or publish decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=pending")}>
                <strong>Approval queue</strong>
                <span>{pendingClaims} claim{pendingClaims === 1 ? " is" : "s are"} waiting on approval.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Workflow controls</h2>
            <span>Settings that reduce avoidable follow-up</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/rules")}>
                <strong>Supplier rules</strong>
                <span>{store.rules.length} rule{store.rules.length === 1 ? " is" : "s are"} available to standardise category, tax, and payment defaults.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/settings")}>
                <strong>Organisation tax defaults</strong>
                <span>Company tax settings are available to reduce avoidable review corrections.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Submission mix</h2>
            <span>Where records are entering the workspace</span>
          </div>
          <ul className="summary-list">
            {sourceMix.map((source) => (
              <li key={source.label}>
                <button className="summary-action-row" type="button" onClick={() => navigate(source.route)}>
                  <strong>{source.label}</strong>
                  <span>{source.count} document{source.count === 1 ? " currently originates" : "s currently originate"} from this channel.</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Export and archive</h2>
            <span>Current handoff and evidence routes</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstExportRoute(store))}>
                <strong>Open an export-ready queue</strong>
                <span>Open the first live queue that supports CSV export for costs, sales, vault, or claims.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/vault")}>
                <strong>Archive retrieval</strong>
                <span>{store.vault.length} vault file{store.vault.length === 1 ? " is" : "s are"} available as retained reference evidence.</span>
              </button>
            </li>
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
  };
  const readyCosts = store.costs.filter((record) => record.status === "Ready").length;
  const readySales = store.sales.filter((record) => record.status === "Ready").length;
  const publishedRecords = allRecords.filter((record) => record.status === "Published").length;
  const reviewedClaims = pendingClaimsNeedingAction(store.claims).length;
  const recentUploads = allRecords
    .slice()
    .sort((left, right) => compareIsoDate(right.createdAt, left.createdAt))
    .slice(0, 8);

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Mobile capture" value={String(sourceCounts.mobile)} detail="Receipts from the app" onClick={() => navigate(firstInboxRouteForSource(store, "mobile"))} />
        <MetricCard label="Web uploads" value={String(sourceCounts.web_upload)} detail="Drag-and-drop from the browser" onClick={() => navigate(firstInboxRouteForSource(store, "web_upload"))} />
        <MetricCard label="Ready to export" value={String(readyCosts + readySales)} detail="Reviewed documents ready for CSV export" onClick={() => navigate(firstInboxRouteForStatus(store, "Ready"))} />
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
            <h2>Review and export</h2>
            <span>Current document workflow</span>
          </div>
          <ul className="summary-list">
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/costs?status=Ready")}>
                <strong>Costs ready for export</strong>
                <span>{readyCosts} cost document{readyCosts === 1 ? " is" : "s are"} sitting in Ready.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/sales?status=Ready")}>
                <strong>Sales invoices ready for export</strong>
                <span>{readySales} sales document{readySales === 1 ? " is" : "s are"} ready for CSV export.</span>
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
            <h2>Recent activity</h2>
            <span>Latest records across active submission channels</span>
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
                <strong>No activity yet</strong>
                <span>Uploads and archived files will appear here once the first records enter the workspace.</span>
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
  const documentsNeedingReview = allDocuments.filter((record) => countsAsManualReview(record));
  const costReady = store.costs.filter((record) => record.status === "Ready");
  const salesReady = store.sales.filter((record) => record.status === "Ready");
  const pendingClaims = pendingClaimsNeedingAction(store.claims);
  const publishedDocuments = allDocuments.filter((record) => record.status === "Published");
  const processingDocuments = allDocuments.filter((record) => record.status === "Processing");
  const sourceCounts = {
    mobile: allDocuments.filter((record) => record.receiptSource === "mobile").length,
    web_upload: allDocuments.filter((record) => record.receiptSource === "web_upload").length,
  };
  const recentUploads = allDocuments
    .slice()
    .sort((left, right) => compareIsoDate(right.createdAt, left.createdAt))
    .slice(0, 8);
  const reviewByWorkspace = [
    { label: "Costs review", route: "/costs?issue=Needs+review", records: store.costs.filter((record) => countsAsManualReview(record)) },
    { label: "Sales review", route: "/sales?issue=Needs+review", records: store.sales.filter((record) => countsAsManualReview(record)) },
    { label: "Vault review", route: "/vault?issue=Needs+review", records: store.vault.filter((record) => countsAsManualReview(record)) },
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
        <MetricCard label="Review queue" value={String(documentsNeedingReview.length)} detail="Documents waiting on review or publish decisions" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))} />
        <MetricCard label="Cost approvals" value={String(costReady.length)} detail="Cost documents ready for handoff" onClick={() => navigate("/costs?status=Ready")} />
        <MetricCard label="Sales approvals" value={String(salesReady.length)} detail="Sales documents ready for handoff" onClick={() => navigate("/sales?status=Ready")} />
        <MetricCard label="Pending claims" value={String(pendingClaims.length)} detail="Expense claims awaiting approval" onClick={() => navigate("/claims?status=pending")} />
        <MetricCard label="Still processing" value={String(processingDocuments.length)} detail="Uploads not yet settled into review" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => record.status === "Processing", "Processing"))} />
        <MetricCard label="Published" value={String(publishedDocuments.length)} detail="Documents already pushed onward" onClick={() => navigate(firstInboxRouteForStatus(store, "Published"))} />
        <MetricCard label="Mobile capture" value={String(sourceCounts.mobile)} detail="Receipts sent from the app" onClick={() => navigate(firstInboxRouteForSource(store, "mobile"))} />
        <MetricCard label="Web uploads" value={String(sourceCounts.web_upload)} detail="Files uploaded from the browser" onClick={() => navigate(firstInboxRouteForSource(store, "web_upload"))} />
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
                <span>{costReady.length} cost document{costReady.length === 1 ? " is" : "s are"} ready for CSV export.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/sales?status=Ready")}>
                <strong>Sales publish lane</strong>
                <span>{salesReady.length} sales document{salesReady.length === 1 ? " is" : "s are"} ready for the next step.</span>
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
                <span>{publishedDocuments.length} published document{publishedDocuments.length === 1 ? " is" : "s are"} already in the downstream handoff state.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=approved")}>
                <strong>Approved claims</strong>
                <span>{store.claims.filter((claim) => claim.status === "approved").length} approved claim{store.claims.filter((claim) => claim.status === "approved").length === 1 ? " is" : "s are"} waiting on payment or close-out.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=paid")}>
                <strong>Paid claims</strong>
                <span>{store.claims.filter((claim) => claim.status === "paid").length} claim{store.claims.filter((claim) => claim.status === "paid").length === 1 ? " has" : "s have"} fully completed the reimbursement workflow.</span>
              </button>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Submission channels</h2>
            <span>How records are entering Exdox</span>
          </div>
          <ul className="summary-list">
            {([
              { source: "mobile", label: "Mobile receipt capture", detail: "Sent from the synced app workflow." },
              { source: "web_upload", label: "Web drag-and-drop", detail: "Uploaded directly into the website inboxes." },
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
            <h2>Recent activity</h2>
            <span>Latest records across active submission channels</span>
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
                <strong>No activity yet</strong>
                <span>Uploads and archived files will appear here once the first records enter the workspace.</span>
              </li>
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}

function ProductivityPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allDocuments = [...store.costs, ...store.sales, ...store.vault];
  const reviewDocuments = allDocuments.filter((record) => countsAsManualReview(record));
  const readyDocuments = allDocuments.filter((record) => record.status === "Ready");
  const publishedDocuments = allDocuments.filter((record) => record.status === "Published");
  const processingDocuments = allDocuments.filter((record) => record.status === "Processing");
  const pendingClaims = pendingClaimsNeedingAction(store.claims).length;
  const automatedCoverage = allDocuments.length
    ? Math.round(((publishedDocuments.length + readyDocuments.length) / allDocuments.length) * 100)
    : 0;
  const reviewCompletion = allDocuments.length
    ? Math.round(((allDocuments.length - reviewDocuments.length) / allDocuments.length) * 100)
    : 0;
  const claimsCompleted = store.claims.filter((claim) => claim.status === "approved" || claim.status === "paid").length;
  const claimCompletion = store.claims.length ? Math.round((claimsCompleted / store.claims.length) * 100) : 0;
  const sourceMix = [
    { label: "Mobile", count: allDocuments.filter((record) => record.receiptSource === "mobile").length, route: firstInboxRouteForSource(store, "mobile") },
    { label: "Web", count: allDocuments.filter((record) => record.receiptSource === "web_upload").length, route: firstInboxRouteForSource(store, "web_upload") },
    { label: "Email", count: allDocuments.filter((record) => record.receiptSource === "email").length, route: firstInboxRouteForSource(store, "email") },
  ];

  return (
    <div className="stack-page">
      <section className="metrics-grid">
        <MetricCard label="Automation coverage" value={`${automatedCoverage}%`} detail="Ready or published records across all queues" onClick={() => navigate(readyDocuments.length ? firstInboxRouteForStatus(store, "Ready") : firstPublishedOrArchiveRoute(store))} />
        <MetricCard label="Review completion" value={`${reviewCompletion}%`} detail="Records that no longer need manual review" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))} />
        <MetricCard label="Claim completion" value={`${claimCompletion}%`} detail="Claims approved or fully paid" onClick={() => navigate(firstClaimCompletionRoute(store))} />
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
                <span>{processingDocuments.length} document{processingDocuments.length === 1 ? " is" : "s are"} still settling into the review flow.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))}>
                <strong>Manual review load</strong>
                <span>{reviewDocuments.length} document{reviewDocuments.length === 1 ? " still needs" : "s still need"} review, tax, or publish decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/claims?status=pending")}>
                <strong>Approval queue</strong>
                <span>{pendingClaims} claim{pendingClaims === 1 ? " is" : "s are"} waiting on approval.</span>
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
                <span>{store.rules.length} rule{store.rules.length === 1 ? " is" : "s are"} available to standardise category, tax, and payment defaults.</span>
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
                  <span>{source.count} document{source.count === 1 ? " currently originates" : "s currently originate"} from this channel.</span>
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
                <strong>Open an export-ready queue</strong>
                <span>Open the first live queue that supports CSV export for costs, sales, vault, or claims.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/overview/integrations")}>
                <strong>Review completion</strong>
                <span>{readyDocuments.length} record{readyDocuments.length === 1 ? " is" : "s are"} sitting in Ready and {publishedDocuments.length} {publishedDocuments.length === 1 ? "has" : "have"} been marked as published.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate("/vault")}>
                <strong>Archive retrieval</strong>
                <span>{store.vault.length} vault file{store.vault.length === 1 ? " is" : "s are"} available as stored reference evidence for audit and retrieval.</span>
              </button>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function SpendingReportsPage({ store }: { store: AppStore }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [period, setPeriod] = useState<AnalyticsPeriod>("last_12_months");
  const [customStartDate, setCustomStartDate] = useState(() => analyticsDateInputValue(startOfCurrentMonth()));
  const [customEndDate, setCustomEndDate] = useState(() => analyticsDateInputValue(new Date()));
  const customDateRange = { start: customStartDate, end: customEndDate };
  const baseCurrency = store.settings?.baseCurrency || "GBP";
  const hasValidCustomRange = period !== "custom" || isValidAnalyticsDateRange(customDateRange);
  const paidCosts = store.costs.filter((record) => record.status === "Paid" && recordMatchesAnalyticsPeriod(record, period, customDateRange));
  const paidSales = store.sales.filter((record) => record.status === "Paid" && recordMatchesAnalyticsPeriod(record, period, customDateRange));
  const categoryOptions = Array.from(
    new Set(["Uncategorised", ...costCategoryOptions, ...paidCosts.map((record) => record.category?.trim()).filter((category): category is string => Boolean(category))]),
  );
  const filteredCosts = selectedCategory === "all"
    ? paidCosts
    : paidCosts.filter((record) => (record.category?.trim() || "Uncategorised") === selectedCategory);
  const itemizedPaidCosts = [...filteredCosts].sort(
    (left, right) => new Date(analyticsRecordDate(right)).getTime() - new Date(analyticsRecordDate(left)).getTime(),
  );
  const categoryRows = categoryOptions
    .map((category) => {
      const records = paidCosts.filter((record) => (record.category?.trim() || "Uncategorised") === category);
      return { category, records, total: sumAnalyticsAmount(records) };
    })
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total);
  const selectedSpend = sumAnalyticsAmount(filteredCosts);
  const paidSalesTotal = sumAnalyticsAmount(paidSales);
  const netCashflow = paidSalesTotal - selectedSpend;
  const months = buildAnalyticsMonths(period, customDateRange);
  const monthlySpend = months.map((month) => ({
    ...month,
    costs: sumAnalyticsAmount(filteredCosts.filter((record) => analyticsMonthKey(record) === month.key)),
    sales: sumAnalyticsAmount(paidSales.filter((record) => analyticsMonthKey(record) === month.key)),
  }));
  const maxMonthlyValue = Math.max(1, ...monthlySpend.flatMap((month) => [month.costs, month.sales]));
  const currentMonth = analyticsMonthKey({ updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() } as ReceiptRecord);
  const currentSpend = monthlySpend.find((month) => month.key === currentMonth)?.costs ?? 0;
  const completedMonths = monthlySpend.filter((month) => month.key !== currentMonth && month.costs > 0);
  const averageMonthlySpend = completedMonths.length
    ? completedMonths.reduce((sum, month) => sum + month.costs, 0) / completedMonths.length
    : selectedSpend;
  const today = new Date();
  const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedSpend = currentSpend > 0
    ? (currentSpend / Math.max(1, today.getDate())) * daysInCurrentMonth
    : averageMonthlySpend;
  const totalCategorySpend = categoryRows.reduce((sum, row) => sum + row.total, 0);
  const pieStops = categoryRows.length
    ? categoryRows.reduce<{ offset: number; stops: string[] }>((result, row, index) => {
        const next = result.offset + (row.total / totalCategorySpend) * 100;
        result.stops.push(`${analyticsPalette[index % analyticsPalette.length]} ${result.offset.toFixed(2)}% ${next.toFixed(2)}%`);
        return { offset: next, stops: result.stops };
      }, { offset: 0, stops: [] }).stops.join(", ")
    : "#dfe7ef 0 100%";

  const exportCategorySummary = async () => {
    await downloadCsv(
      `paid-category-spend-${new Date().toISOString().slice(0, 10)}.csv`,
      categoryRows.map((row) => ({
        category: row.category,
        paid_document_count: String(row.records.length),
        paid_total: row.total.toFixed(2),
        currency: baseCurrency,
        reporting_period: analyticsPeriodLabel(period, customDateRange),
      })),
    );
  };

  const exportPaidExpenses = async () => {
    await downloadCsv(
      `paid-expenses-${selectedCategory === "all" ? "all-categories" : analyticsFileSegment(selectedCategory)}-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredCosts.map((record) => ({
        category: record.category?.trim() || "Uncategorised",
        supplier: record.vendorName || "Unknown supplier",
        receipt_date: receiptDocumentDate(record),
        paid_date: analyticsRecordDate(record),
        document_reference: record.invoiceNumber || String(record.id),
        payment_method: analyticsPaymentMethodLabel(record.paymentMethod),
        original_total: receiptGrossAmount(record).toFixed(2),
        original_currency: receiptCurrency(record),
        paid_total_in_workspace_currency: analyticsAmount(record).toFixed(2),
        workspace_currency: baseCurrency,
      })),
    );
  };

  return (
    <div className="stack-page analytics-page">
      <section className="analytics-hero panel">
        <div>
          <p className="section-kicker">PAID EXPENSE REPORTING</p>
          <h2>Monitor paid expenditure with confidence</h2>
          <p>Explore category spending, paid cashflow and spending forecasts. Only records marked <strong>Paid</strong> are included.</p>
        </div>
        <div className="analytics-controls">
          <label>
            Category
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            Reporting period
            <select value={period} onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}>
              <option value="this_month">This month</option>
              <option value="last_3_months">Last 3 months</option>
              <option value="last_12_months">Last 12 months</option>
              <option value="custom">Custom date range</option>
              <option value="all">All paid records</option>
            </select>
          </label>
          {period === "custom" ? (
            <div className="analytics-date-range" aria-label="Custom reporting date range">
              <label>
                From
                <input type="date" value={customStartDate} max={customEndDate || undefined} onChange={(event) => setCustomStartDate(event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={customEndDate} min={customStartDate || undefined} onChange={(event) => setCustomEndDate(event.target.value)} />
              </label>
            </div>
          ) : null}
        </div>
      </section>

      {period === "custom" && !hasValidCustomRange ? <p className="analytics-range-warning">Choose a valid start and end date to view this report.</p> : null}

      <section className="metrics-grid analytics-metrics">
        <MetricCard label="Paid category spend" value={currency(selectedSpend, baseCurrency)} detail={`${filteredCosts.length} paid expense${filteredCosts.length === 1 ? "" : "s"} in ${analyticsPeriodLabel(period, customDateRange).toLowerCase()}`} />
        <MetricCard label="Projected spend" value={currency(projectedSpend, baseCurrency)} detail="Current-month projection from paid spending" />
        <MetricCard label="Paid income" value={currency(paidSalesTotal, baseCurrency)} detail="Paid sales records in the selected period" />
        <MetricCard label="Paid cashflow" value={currency(netCashflow, baseCurrency)} detail="Paid income less selected paid spend" />
      </section>

      <section className="analytics-layout">
        <article className="panel analytics-category-panel">
          <div className="panel-heading">
            <div><h2>Category spending</h2><span>Paid expenses by category</span></div>
            <button className="secondary-action" type="button" onClick={() => void exportCategorySummary()} disabled={!categoryRows.length}>Download summary CSV</button>
          </div>
          {categoryRows.length ? (
            <div className="category-chart-layout">
              <div className="category-donut" style={{ background: `conic-gradient(${pieStops})` }} aria-label="Category spending chart">
                <div><strong>{currency(totalCategorySpend, baseCurrency)}</strong><span>Total paid</span></div>
              </div>
              <ul className="analytics-legend">
                {categoryRows.map((row, index) => (
                  <li key={row.category}>
                    <button
                      className={`analytics-category-action${selectedCategory === row.category ? " active" : ""}`}
                      type="button"
                      onClick={() => setSelectedCategory(row.category)}
                    >
                      <span className="analytics-legend-swatch" style={{ background: analyticsPalette[index % analyticsPalette.length] }} />
                      <span>{row.category}</span>
                      <strong>{currency(row.total, baseCurrency)}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : <AnalyticsEmptyState message="There are no paid expense records in this reporting period yet." />}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><h2>Forecast</h2><span>Planning view based on paid spend</span></div></div>
          <div className="forecast-value"><strong>{currency(projectedSpend, baseCurrency)}</strong><span>Projected paid spend for {today.toLocaleDateString("en-GB", { month: "long" })}</span></div>
          <div className="forecast-comparison">
            <span>Average paid spend</span><strong>{currency(averageMonthlySpend, baseCurrency)}</strong>
          </div>
          <p className="analytics-note">This is a rolling planning forecast using paid records. It is not a statutory budget or accounting statement.</p>
        </article>
      </section>

      <section className="analytics-layout analytics-wide-layout">
        <article className="panel">
          <div className="panel-heading"><div><h2>Paid spend and income trend</h2><span>Paid cashflow across the selected reporting period</span></div></div>
          <div className="trend-chart" aria-label="Paid spend and income chart">
            {monthlySpend.map((month) => (
              <div className="trend-column" key={month.key}>
                <div className="trend-bars">
                  <span className="trend-bar spend" style={{ height: `${Math.max(month.costs ? 8 : 0, (month.costs / maxMonthlyValue) * 100)}%` }} title={`Spend ${currency(month.costs, baseCurrency)}`} />
                  <span className="trend-bar income" style={{ height: `${Math.max(month.sales ? 8 : 0, (month.sales / maxMonthlyValue) * 100)}%` }} title={`Income ${currency(month.sales, baseCurrency)}`} />
                </div>
                <small>{month.label}</small>
              </div>
            ))}
          </div>
          <div className="trend-key"><span><i className="trend-bar spend" /> Paid spend</span><span><i className="trend-bar income" /> Paid income</span></div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><h2>Paid cashflow P&amp;L</h2><span>Operational view, not a statutory P&amp;L</span></div></div>
          <div className="cashflow-rows">
            <div><span>Paid income</span><strong>{currency(paidSalesTotal, baseCurrency)}</strong></div>
            <div><span>Paid expenses</span><strong>{currency(selectedSpend, baseCurrency)}</strong></div>
            <div className={netCashflow >= 0 ? "cashflow-total positive" : "cashflow-total negative"}><span>Net paid cashflow</span><strong>{currency(netCashflow, baseCurrency)}</strong></div>
          </div>
          <button className="primary-action" type="button" onClick={() => void exportPaidExpenses()} disabled={!filteredCosts.length}>Download paid expenses CSV</button>
        </article>
      </section>

      <section className="panel analytics-ledger-panel">
        <div className="panel-heading">
          <div>
            <h2>{selectedCategory === "all" ? "Paid expense ledger" : `${selectedCategory} paid expense ledger`}</h2>
            <span>{itemizedPaidCosts.length} receipt or invoice{itemizedPaidCosts.length === 1 ? "" : "s"} in {analyticsPeriodLabel(period, customDateRange).toLowerCase()}</span>
          </div>
          <button className="secondary-action" type="button" onClick={() => void exportPaidExpenses()} disabled={!itemizedPaidCosts.length}>Download detailed CSV</button>
        </div>
        {itemizedPaidCosts.length ? (
          <div className="table-panel analytics-ledger-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Receipt date</th>
                  <th>Paid date</th>
                  <th>Payment method</th>
                  <th>Total</th>
                  <th aria-label="Open document" />
                </tr>
              </thead>
              <tbody>
                {itemizedPaidCosts.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.vendorName || "Unknown supplier"}</strong></td>
                    <td>{documentTypeLabel(record.documentType)}{record.invoiceNumber ? ` · ${record.invoiceNumber}` : ""}</td>
                    <td>{record.category?.trim() || "Uncategorised"}</td>
                    <td>{formatShortAnalyticsDate(receiptDocumentDate(record))}</td>
                    <td>{formatShortAnalyticsDate(analyticsRecordDate(record))}</td>
                    <td>{analyticsPaymentMethodLabel(record.paymentMethod)}</td>
                    <td><strong>{currency(analyticsAmount(record), baseCurrency)}</strong></td>
                    <td><Link className="table-action-link" to={`/costs/${record.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <AnalyticsEmptyState message="No paid receipts or invoices match this category and reporting period." />}
      </section>
    </div>
  );
}

function AnalyticsEmptyState({ message }: { message: string }) {
  return <div className="analytics-empty"><strong>No paid data to show</strong><span>{message}</span></div>;
}

const analyticsPalette = ["#168dcc", "#20a98a", "#f0a642", "#7965c1", "#e56a54", "#4b7798", "#bd7c36", "#61a5a2", "#a76791", "#527c54"];
type AnalyticsPeriod = "all" | "this_month" | "last_3_months" | "last_12_months" | "custom";
type AnalyticsDateRange = { start: string; end: string };

function analyticsAmount(record: ReceiptRecord) {
  return record.baseTotalAmount ?? receiptGrossAmount(record);
}

function sumAnalyticsAmount(records: ReceiptRecord[]) {
  return records.reduce((sum, record) => sum + analyticsAmount(record), 0);
}

function analyticsRecordDate(record: Pick<ReceiptRecord, "updatedAt" | "createdAt" | "invoiceDate">) {
  return record.updatedAt || record.invoiceDate || record.createdAt;
}

function analyticsMonthKey(record: Pick<ReceiptRecord, "updatedAt" | "createdAt" | "invoiceDate">) {
  const date = new Date(analyticsRecordDate(record));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function recordMatchesAnalyticsPeriod(record: ReceiptRecord, period: AnalyticsPeriod, customRange: AnalyticsDateRange) {
  if (period === "all") return true;
  const recordDate = new Date(analyticsRecordDate(record));
  if (Number.isNaN(recordDate.getTime())) return false;
  if (period === "custom") {
    if (!isValidAnalyticsDateRange(customRange)) return false;
    const start = analyticsDateStart(customRange.start);
    const end = analyticsDateEnd(customRange.end);
    return recordDate >= start && recordDate <= end;
  }
  const now = new Date();
  const startMonthOffset = period === "this_month" ? 0 : period === "last_3_months" ? 2 : 11;
  const start = new Date(now.getFullYear(), now.getMonth() - startMonthOffset, 1);
  return recordDate >= start && recordDate <= now;
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function analyticsDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function analyticsDateStart(value: string) {
  return new Date(`${value}T00:00:00`);
}

function analyticsDateEnd(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

function isValidAnalyticsDateRange(range: AnalyticsDateRange) {
  if (!range.start || !range.end) return false;
  const start = analyticsDateStart(range.start);
  const end = analyticsDateEnd(range.end);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end;
}

function buildAnalyticsMonths(period: AnalyticsPeriod, customRange: AnalyticsDateRange) {
  const now = new Date();
  const end = period === "custom" && isValidAnalyticsDateRange(customRange) ? analyticsDateEnd(customRange.end) : now;
  const monthsToShow = period === "this_month" ? 1 : period === "last_3_months" ? 3 : period === "last_12_months" ? 12 : 6;
  const start = period === "custom" && isValidAnalyticsDateRange(customRange)
    ? analyticsDateStart(customRange.start)
    : new Date(end.getFullYear(), end.getMonth() - (monthsToShow - 1), 1);
  const count = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-GB", { month: "short" }),
    };
  });
}

function analyticsPeriodLabel(period: AnalyticsPeriod, customRange?: AnalyticsDateRange) {
  if (period === "this_month") return "This month";
  if (period === "last_3_months") return "Last 3 months";
  if (period === "last_12_months") return "Last 12 months";
  if (period === "custom") {
    return customRange && isValidAnalyticsDateRange(customRange)
      ? `${formatShortAnalyticsDate(customRange.start)} to ${formatShortAnalyticsDate(customRange.end)}`
      : "Custom date range";
  }
  return "All paid records";
}

function analyticsPaymentMethodLabel(method: ReceiptRecord["paymentMethod"]) {
  return method === "cash_personal"
    ? "Personal spend"
    : method === "business_card"
      ? "Business card"
      : method === "bank_transfer"
        ? "Bank transfer"
        : "Not applicable";
}

function analyticsFileSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";
}

function formatShortAnalyticsDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function AutomationPage({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const allDocuments = [...store.costs, ...store.sales, ...store.vault];
  const activeRules = store.rules.filter((rule) => rule.isActive);
  const readyDocuments = allDocuments.filter((record) => record.status === "Ready");
  const lowConfidenceDocuments = allDocuments.filter((record) => isLowConfidence(record));
  const reviewDocuments = allDocuments.filter((record) => countsAsManualReview(record));
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
        <MetricCard label="Needs review" value={String(reviewDocuments.length)} detail="Records still breaking out of the automated path" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))} />
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
                <span>{activeRules.length} active rule{activeRules.length === 1 ? " currently standardises" : "s currently standardise"} category, tax, and payment choices.</span>
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
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => countsAsManualReview(record), "Needs review"))}>
                <strong>Manual review fallback</strong>
                <span>{reviewDocuments.length} document{reviewDocuments.length === 1 ? " still needs" : "s still need"} human review, tax, or publish decisions.</span>
              </button>
            </li>
            <li>
              <button className="summary-action-row" type="button" onClick={() => navigate(firstInboxRouteForIssue(store, (record) => isLowConfidence(record), "Low confidence"))}>
                <strong>Extraction uncertainty</strong>
                <span>{lowConfidenceDocuments.length} low-confidence document{lowConfidenceDocuments.length === 1 ? " is" : "s are"} slowing automation confidence.</span>
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
                <span>{store.sales.filter((record) => record.status === "Ready").length} sales document{store.sales.filter((record) => record.status === "Ready").length === 1 ? " is" : "s are"} ready for the next step.</span>
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
            <span>Newest records with categories already in place</span>
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
  showEmployeeFilter = false,
  settings,
  uploadBusy,
  onUpload,
  onReimbursementsMarkedPaid,
}: {
  title: string;
  records: ReceiptRecord[];
  basePath: "/costs" | "/sales" | "/vault";
  showEmployeeFilter?: boolean;
  settings: OrganisationSettings | null;
  uploadBusy: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onReimbursementsMarkedPaid?: () => Promise<number>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const [issueFilter, setIssueFilter] = useState<"All" | "Needs review" | "Unreadable" | "Possible duplicates" | "Low confidence" | "Processing">("All");
  const [sourceFilter, setSourceFilter] = useState<ReceiptRecord["receiptSource"] | "All">("All");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<ReceiptRecord["documentType"] | "All">("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_total" | "lowest_total" | "lowest_confidence">("newest");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [markingPaymentsPaid, setMarkingPaymentsPaid] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const hydratedSearchRef = useRef<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const vatTrackingEnabled = isVatTrackingEnabled(settings);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? "";
    const nextStatus = params.get("status");
    const nextIssue = params.get("issue");
    const nextSource = params.get("source");
    const nextDocumentType = params.get("documentType");
    const nextEmployee = params.get("employee");
    const nextDepartment = params.get("department");
    const nextSort = params.get("sort");

    setQuery(nextSearch);
    setStatusFilter(
      nextStatus === "Processing" ||
      nextStatus === "Review" ||
      nextStatus === "Ready" ||
      nextStatus === "Published" ||
      nextStatus === "Payment processing" ||
      nextStatus === "Paid"
        ? nextStatus
        : "All",
    );
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
    setEmployeeFilter(showEmployeeFilter && nextEmployee ? nextEmployee : "All");
    setDepartmentFilter(basePath === "/costs" && nextDepartment ? nextDepartment : "All");
    setSortOrder(
      nextSort === "oldest" ||
      nextSort === "highest_total" ||
      nextSort === "lowest_total" ||
      nextSort === "lowest_confidence"
        ? nextSort
        : "newest",
    );
    // Do not immediately overwrite a route filter with the previous local filter state.
    hydratedSearchRef.current = location.search;
    setFiltersReady(true);
  }, [location.search, showEmployeeFilter]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }

    if (hydratedSearchRef.current === location.search) {
      hydratedSearchRef.current = null;
      return;
    }

    syncPageSearchParams(location.pathname, location.search, navigate, {
      search: query.trim() || null,
      status: statusFilter !== "All" ? statusFilter : null,
      issue: issueFilter !== "All" ? issueFilter : null,
      source: sourceFilter !== "All" ? sourceFilter : null,
      documentType: documentTypeFilter !== "All" ? documentTypeFilter : null,
      employee: showEmployeeFilter && employeeFilter !== "All" ? employeeFilter : null,
      department: basePath === "/costs" && departmentFilter !== "All" ? departmentFilter : null,
      sort: sortOrder !== "newest" ? sortOrder : null,
    });
  }, [basePath, departmentFilter, documentTypeFilter, employeeFilter, filtersReady, issueFilter, location.pathname, location.search, navigate, query, showEmployeeFilter, sortOrder, sourceFilter, statusFilter]);

  const search = deferredQuery.trim().toLowerCase();
  const isVaultInbox = basePath === "/vault";
  const inboxExportLabel =
    basePath === "/vault"
      ? "vault archive"
      : basePath === "/sales"
        ? "sales inbox"
        : "costs inbox";
  const inboxExportSuccessMessage =
    basePath === "/vault"
      ? "Vault CSV downloaded."
      : basePath === "/sales"
        ? "Sales CSV downloaded."
        : "Costs CSV downloaded.";
  const duplicateInsights = buildDuplicateInsights(records);
  const paymentProcessingCount = records.filter(
    (record) =>
      record.workspaceContext === "cost" &&
      record.paymentMethod === "cash_personal" &&
      record.status === "Payment processing",
  ).length;
  const employeeOptions = Array.from(
    new Map(
      records
        .filter((record) => Boolean(record.uploadedByUserId))
        .map((record) => [
          record.uploadedByUserId as number,
          {
            id: record.uploadedByUserId as number,
            label: record.uploadedByName?.trim()
              ? `${record.uploadedByName.trim()}${record.uploadedByEmail?.trim() ? ` (${record.uploadedByEmail.trim()})` : ""}`
              : record.uploadedByEmail?.trim() || `Employee #${record.uploadedByUserId}`,
          },
        ]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label));
  const departmentOptions = Array.from(
    new Map(
      records
        .filter((record) => Boolean(record.uploadedByDepartmentId && record.uploadedByDepartmentName))
        .map((record) => [
          record.uploadedByDepartmentId as number,
          { id: record.uploadedByDepartmentId as number, label: record.uploadedByDepartmentName as string },
        ]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label));
  const hasActiveFilters = Boolean(
    search || statusFilter !== "All" || issueFilter !== "All" || sourceFilter !== "All" || documentTypeFilter !== "All" || employeeFilter !== "All" || departmentFilter !== "All",
  );
  const filtered = records.filter((record) => {
    const matchesSearch =
      !search ||
      `${record.vendorName ?? ""} ${record.category ?? ""} ${record.sourceFilename} ${record.description ?? ""} ${record.customer ?? ""} ${record.rawTextSummary ?? ""}`
        .toLowerCase()
        .includes(search);
    const matchesStatus = statusFilter === "All" || record.status === statusFilter;
    const matchesSource = sourceFilter === "All" || record.receiptSource === sourceFilter;
    const matchesDocumentType = documentTypeFilter === "All" || (record.documentType ?? "unknown") === documentTypeFilter;
    const matchesEmployee = employeeFilter === "All" || String(record.uploadedByUserId) === employeeFilter;
    const matchesDepartment = departmentFilter === "All" || String(record.uploadedByDepartmentId) === departmentFilter;
    const matchesIssue =
      issueFilter === "All"
        ? true
        : issueFilter === "Needs review"
          ? countsAsManualReview(record)
          : issueFilter === "Unreadable"
            ? looksUnreadable(record)
            : issueFilter === "Possible duplicates"
              ? duplicateInsights.byReceiptId.has(record.id)
              : issueFilter === "Low confidence"
                ? isLowConfidence(record)
              : record.status === "Processing";
    return matchesSearch && matchesStatus && matchesSource && matchesDocumentType && matchesEmployee && matchesDepartment && matchesIssue;
  }).sort((left, right) => compareInboxRecords(left, right, sortOrder));

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{title}</h2>
          <p>
            {isVaultInbox
              ? "Store archive-only evidence in a separate workspace so reference documents do not clutter expense or sales review."
              : "Bulk ingestion, organisation-scoped review, and controlled document updates in a dedicated workspace."}
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
            {basePath === "/costs" ? <option value="Payment processing">Payment processing</option> : null}
            {basePath === "/costs" ? <option value="Paid">Paid</option> : null}
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
          {showEmployeeFilter ? (
            <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} aria-label="Filter by employee">
              <option value="All">All employees</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.label}</option>
              ))}
            </select>
          ) : null}
          {basePath === "/costs" ? (
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Filter by department">
              <option value="All">All departments</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>{department.label}</option>
              ))}
            </select>
          ) : null}
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
            title={filtered.length ? `Download the current ${inboxExportLabel} view as CSV` : "No documents match the current filters yet"}
            onClick={async () => {
              if (await downloadCsv(
                `${basePath.replace("/", "") || "inbox"}-${new Date().toISOString().slice(0, 10)}.csv`,
                buildInboxExportRows(filtered, settings),
              )) {
                setFeedback(inboxExportSuccessMessage);
              }
            }}
          >
            Export CSV
          </button>
          {basePath === "/costs" && statusFilter === "Payment processing" && paymentProcessingCount && onReimbursementsMarkedPaid ? (
            <button
              className="primary-action"
              type="button"
              disabled={markingPaymentsPaid}
              onClick={async () => {
                if (!window.confirm(`Mark all ${paymentProcessingCount} reimbursement expense${paymentProcessingCount === 1 ? "" : "s"} as paid? This removes them from the active payment batch.`)) {
                  return;
                }
                setMarkingPaymentsPaid(true);
                try {
                  const paidCount = await onReimbursementsMarkedPaid();
                  setFeedback(`${paidCount} reimbursement expense${paidCount === 1 ? " was" : "s were"} marked as paid.`);
                } catch (paymentError) {
                  setFeedback(paymentError instanceof Error ? paymentError.message : "Could not mark the reimbursement payment batch as paid.");
                } finally {
                  setMarkingPaymentsPaid(false);
                }
              }}
            >
              {markingPaymentsPaid
                ? "Marking paid..."
                : `Mark ${paymentProcessingCount} payment${paymentProcessingCount === 1 ? "" : "s"} as paid`}
            </button>
          ) : null}
        </div>
      </section>
      {feedback ? <div className="success-banner">{feedback}</div> : null}

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
              : "Store reference files in a separate archive workspace and mark them as Processed once they are safely stored."
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
                  {vatTrackingEnabled ? <th>Net Amount</th> : null}
                  {vatTrackingEnabled ? <th>VAT Amount</th> : null}
                  <th>{vatTrackingEnabled ? "Gross Total" : "Total"}</th>
                  <th>Source</th>
                  <th>Action</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => navigate(`${basePath}/${record.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`${basePath}/${record.id}`);
                    }
                  }}
                  tabIndex={0}
                >
                  {isVaultInbox ? (
                    <>
                      <td>
                        <div className="stacked-cell">
                          <StatusPill status={record.status} label={vaultStatusLabel(record)} />
                          {duplicateInsights.byReceiptId.has(record.id) ? <SignalPill tone="warning">Possible duplicate</SignalPill> : null}
                          {isLowConfidence(record) ? <SignalPill tone="info">Low confidence</SignalPill> : null}
                        </div>
                      </td>
                      <td>{record.createdAt.slice(0, 10)}</td>
                      <td>{record.sourceFilename}</td>
                      <td>{documentTypeLabel(record.documentType)}</td>
                      <td>{sourceLabel(record.receiptSource)}</td>
                      <td>{record.description ?? "Stored vault document"}</td>
                      <td>
                        <button
                          className="secondary-action table-open-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`${basePath}/${record.id}`);
                          }}
                        >
                          Open
                        </button>
                      </td>
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
                      <td>{receiptDocumentDate(record)}</td>
                      <td>{record.vendorName ?? "Unknown supplier"}</td>
                      <td>{record.category ?? "Uncategorised"}</td>
                      {vatTrackingEnabled ? <td>{currency(record.netAmount, receiptCurrency(record))}</td> : null}
                      {vatTrackingEnabled ? <td>{currency(record.vatAmount, receiptCurrency(record))}</td> : null}
                      <td>
                        <div className="amount-with-base">
                          <strong>{currency(receiptGrossAmount(record), receiptCurrency(record))}</strong>
                          {hasForeignCurrencyConversion(record) ? (
                            <span>{currency(record.baseTotalAmount ?? null, receiptBaseCurrency(record))} base equivalent</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{sourceLabel(record.receiptSource)}</td>
                      <td>
                        <button
                          className="secondary-action table-open-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`${basePath}/${record.id}`);
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-inline-state">
            <strong>{hasActiveFilters ? "No documents match the current filters." : isVaultInbox ? "No vault files stored yet." : "No documents uploaded yet."}</strong>
            <p>
              {hasActiveFilters
                ? "Clear or adjust the current filters to bring matching documents back into view."
                : isVaultInbox
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
  sessionToken: string;
  fallbackRecords: ReceiptRecord[];
  claims: ClaimRecord[];
  settings?: OrganisationSettings | null;
  onSave: (id: number, payload: Partial<ReceiptRecord>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAttachToClaim: (receiptId: number, claimId: number) => Promise<ReceiptRecord>;
  onReimbursementsExported?: () => Promise<void>;
  canUseApprovalWorkflows: boolean;
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null; downloadUrl: string | null }>;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(
    props.fallbackRecords.find((item) => item.id === Number(id)) ?? null,
  );
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingSourceFile, setDownloadingSourceFile] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [postApprovePrompt, setPostApprovePrompt] = useState<null | { nextReceiptId: number | null }>(null);
  const [reimbursementExporting, setReimbursementExporting] = useState(false);
  const [reimbursementExportError, setReimbursementExportError] = useState<string | null>(null);
  const imageZoomStageRef = useRef<HTMLDivElement | null>(null);
  const imagePanStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    props.loadReceipt(Number(id))
      .then((payload) => {
        setReceipt(payload.receipt);
        setAssetUrl(payload.assetUrl);
        setDownloadUrl(payload.downloadUrl);
        setSelectedClaimId(payload.receipt.claimId ? String(payload.receipt.claimId) : "");
        setError(null);
      })
      .catch((loadError: Error) => {
        setError(loadError.message || "Could not load this receipt.");
      });
  }, [id, props]);

  useEffect(() => {
    if (!receipt || receipt.invoiceDate?.trim()) {
      return;
    }

    const inferredDate = inferredReceiptTextDate(receipt);
    if (inferredDate) {
      setReceipt({ ...receipt, invoiceDate: inferredDate });
    }
  }, [receipt?.id, receipt?.invoiceDate, receipt?.description, receipt?.rawTextSummary]);

  if (!receipt) {
    return <div className="empty-state">{error ?? "Receipt workspace unavailable."}</div>;
  }

  const inferredReceiptDate = inferredReceiptTextDate(receipt);
  const displayReceiptDate = receiptDocumentDate(receipt);

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
  const vatTrackingEnabled = isVatTrackingEnabled(props.settings ?? null);
  const foreignCurrencyDocument = Boolean(receipt.currency && receipt.currency.toUpperCase() !== "GBP");
  const receiptPublished = receipt.status === "Published";
  const receiptApproved = receipt.status === "Ready" && !receipt.needsReview;
  const reimbursementPaymentLocked =
    props.mode === "cost" &&
    receipt.paymentMethod === "cash_personal" &&
    (receipt.status === "Payment processing" || receipt.status === "Paid");
  const nextReviewReceipt = isVaultRecord
    ? null
    : props.fallbackRecords.find((record) => record.id !== receipt.id && countsAsManualReview(record));
  const reviewItemLabel = props.mode === "sales" ? "sales document" : "expense";
  const claimAttachmentAllowed = receipt.paymentMethod === "cash_personal";
  const previewAsImage = canPreviewReceiptAsImage(receipt);
  const reviewedRecordsForExport = [
    ...props.fallbackRecords.filter((record) => record.id !== receipt.id),
    receipt.status === "Ready" && !receipt.needsReview
      ? { ...receipt, status: "Ready" as const, needsReview: false }
      : receipt,
  ];

  return (
    <>
    <div className="workspace-split">
      <section className="panel viewer-panel">
        <div className="panel-heading">
          <h2>Source document</h2>
          <div className="toolbar">
            <span>{receipt.sourceFilename}</span>
            {assetUrl ? (
              <>
                {previewAsImage ? (
                  <button className="secondary-action" type="button" onClick={() => setImageZoomOpen(true)}>
                    Zoom image
                  </button>
                ) : null}
                <a className="secondary-action link-action" href={assetUrl} target="_blank" rel="noreferrer">
                  Open source file
                </a>
                {downloadUrl ? (
                  <button
                    className="secondary-action"
                    type="button"
                    disabled={downloadingSourceFile}
                    onClick={async () => {
                      setDownloadingSourceFile(true);
                      setError(null);
                      try {
                        const downloaded = await downloadFileFromUrl(downloadUrl, receipt.sourceFilename);
                        if (downloaded) {
                          setFeedback("File downloaded.");
                        } else {
                          setError("Could not download the file.");
                        }
                      } catch (downloadError) {
                        setError(downloadError instanceof Error ? downloadError.message : "Could not download the file.");
                      } finally {
                        setDownloadingSourceFile(false);
                      }
                    }}
                  >
                    {downloadingSourceFile ? "Downloading..." : "Download file"}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {assetUrl ? (
          previewAsImage ? (
            <button
              className="document-image-frame"
              type="button"
              onClick={() => setImageZoomOpen(true)}
              aria-label={`Open larger preview for ${receipt.sourceFilename}`}
            >
              <img className="document-image" src={assetUrl} alt={receipt.sourceFilename} />
            </button>
          ) : (
            <iframe className="document-frame" src={assetUrl} title={receipt.sourceFilename} />
          )
        ) : (
          <div className="document-placeholder">
            <img className="placeholder-logo" src={brandMarkSrc} alt="Exdox document preview placeholder" />
            <strong>Document preview</strong>
            <p>The secure source file preview will appear here when the stored document asset is available.</p>
          </div>
        )}
      </section>

      <section className="panel editor-panel">
        <div className="panel-heading">
          <h2>{props.mode === "cost" ? "Cost review" : props.mode === "sales" ? "Sales ledger review" : "Vault record"}</h2>
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
            <input type="date" value={displayReceiptDate} onChange={(event) => setReceipt({ ...receipt, invoiceDate: event.target.value })} />
          </label>
          <label>
            Invoice Number
            <input value={receipt.invoiceNumber ?? ""} onChange={(event) => setReceipt({ ...receipt, invoiceNumber: event.target.value })} />
          </label>
          <label>
            Original currency
            <input value={receipt.currency ?? "GBP"} readOnly />
          </label>
          <label>
            {receipt.baseCurrency ?? "GBP"} equivalent
            <input value={currency(receipt.baseTotalAmount ?? receiptGrossAmount(receipt), receipt.baseCurrency ?? "GBP")} readOnly />
          </label>
          {receipt.exchangeRate ? (
            <label className="form-span-2">
              FX audit
              <input value={`1 ${receipt.currency ?? "GBP"} = ${receipt.exchangeRate} ${receipt.baseCurrency ?? "GBP"} | ${receipt.exchangeRateProvider ?? "Recorded rate"} | ${receipt.exchangeRateDate ?? ""}`} readOnly />
            </label>
          ) : null}
          {foreignCurrencyDocument ? (
            <>
              <label>
                Foreign tax on source document
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={receipt.foreignTaxAmount ?? ""}
                  placeholder="Not shown on document"
                  onChange={(event) => setReceipt({ ...receipt, foreignTaxAmount: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </label>
              <label>
                UK VAT treatment
                <select
                  value={receipt.ukVatTreatment ?? "no_uk_vat_to_reclaim"}
                  onChange={(event) => setReceipt({ ...receipt, ukVatTreatment: event.target.value as NonNullable<ReceiptRecord["ukVatTreatment"]> })}
                >
                  <option value="no_uk_vat_to_reclaim">No UK VAT to reclaim</option>
                  <option value="reverse_charge_required">Reverse charge required</option>
                  <option value="import_vat">Import VAT evidence held</option>
                  <option value="accountant_review">Accountant review required</option>
                </select>
                <span className="field-hint">Foreign sales tax is recorded separately and is not treated as UK VAT.</span>
              </label>
            </>
          ) : null}
          {receipt.currency && receipt.baseCurrency && receipt.currency !== receipt.baseCurrency ? (
            <>
              <label>
                Actual settlement rate
                <input
                  type="number"
                  step="0.00000001"
                  value={receipt.exchangeRate ?? ""}
                  onChange={(event) => setReceipt({
                    ...receipt,
                    exchangeRate: Number(event.target.value),
                    exchangeRateOverride: true,
                    exchangeRateProvider: "manual_settlement",
                  })}
                />
              </label>
              <label>
                Settlement note
                <input
                  value={receipt.exchangeRateNote ?? ""}
                  placeholder="Card statement or reimbursement reference"
                  onChange={(event) => setReceipt({ ...receipt, exchangeRateNote: event.target.value, exchangeRateOverride: true })}
                />
              </label>
            </>
          ) : null}
          <label>
            Due Date
            <input type="date" value={receipt.dueDate ?? ""} onChange={(event) => setReceipt({ ...receipt, dueDate: event.target.value })} />
          </label>
          <label>
            Workflow Status
            <select
              value={receipt.status}
              disabled={reimbursementPaymentLocked}
              onChange={(event) => setReceipt({ ...receipt, status: event.target.value as ReceiptRecord["status"] })}
            >
              <option value="Processing">Processing</option>
              <option value="Review">Review</option>
              <option value="Ready">Ready</option>
              <option value="Published">Published</option>
              {receipt.status === "Payment processing" ? <option value="Payment processing">Payment processing</option> : null}
              {receipt.status === "Paid" ? <option value="Paid">Paid</option> : null}
            </select>
          </label>
          {!isVaultRecord && !reimbursementPaymentLocked ? (
            <>
              <label>
                {vatTrackingEnabled ? "Net Amount" : "Total"}
                <input
                  type="number"
                  value={vatTrackingEnabled ? (receipt.netAmount ?? 0) : (receipt.totalAmount ?? 0)}
                  onChange={(event) =>
                    setReceipt(
                      vatTrackingEnabled
                        ? { ...receipt, netAmount: Number(event.target.value) }
                        : { ...receipt, totalAmount: Number(event.target.value) },
                    )
                  }
                />
              </label>
              {vatTrackingEnabled ? (
                <>
                  <label>
                    {foreignCurrencyDocument ? "UK VAT Amount" : "VAT Amount"}
                    <input type="number" value={receipt.vatAmount ?? 0} onChange={(event) => setReceipt({ ...receipt, vatAmount: Number(event.target.value) })} />
                  </label>
                  <label>
                    Gross Total
                    <input type="number" value={receiptGrossAmount(receipt)} onChange={(event) => setReceipt({ ...receipt, totalAmount: Number(event.target.value) })} />
                  </label>
                  <label>
                    {foreignCurrencyDocument ? "UK VAT Tier" : "HMRC Tax Tier"}
                    <select value={receipt.taxRateApplied ?? "No VAT"} onChange={(event) => setReceipt({ ...receipt, taxRateApplied: event.target.value })}>
                      {taxRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
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
              <input value="Vault document stored without expense review" readOnly />
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
              Expense claim and employee
              <select value={selectedClaimId} onChange={(event) => setSelectedClaimId(event.target.value)}>
                <option value="">Select employee claim</option>
                {eligibleClaims.map((claim) => (
                  <option key={claim.id} value={claim.id}>
                    {formatClaimOptionLabel(claim)}
                  </option>
                ))}
              </select>
              <span className="field-hint">Attach personal spend to the employee's claim before approving it for the master export.</span>
            </label>
          ) : null}
          {reimbursementPaymentLocked ? (
            <span className="field-hint">
              {receipt.status === "Paid"
                ? "This reimbursement has been marked as paid."
                : "This reimbursement is in the active payment batch."}
            </span>
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
                  onClick={async () => {
                    if (await downloadCsv(
                      `document-${receipt.id}-summary-${new Date().toISOString().slice(0, 10)}.csv`,
                      buildReceiptSummaryExportRows(receipt, props.settings ?? null),
                    )) {
                      setFeedback("Receipt summary CSV downloaded.");
                    }
                  }}
                >
                  Export summary CSV
                </button>
            </div>
          </div>
          <div className="summary-list">
            <div>
              <strong>Subtotal</strong>
              <span>{currency(vatTrackingEnabled ? (receipt.subtotalAmount ?? receipt.netAmount ?? 0) : (receipt.totalAmount ?? 0))}</span>
            </div>
            <div>
              <strong>{vatTrackingEnabled ? "Total tax" : "VAT"}</strong>
              <span>{currency(vatTrackingEnabled ? (receipt.totalTaxAmount ?? receipt.vatAmount ?? 0) : 0)}</span>
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
                  onClick={async () => {
                    if (await downloadCsv(
                      `document-${receipt.id}-line-items-${new Date().toISOString().slice(0, 10)}.csv`,
                      buildLineItemExportRows(receipt),
                    )) {
                      setFeedback("Line items CSV downloaded.");
                    }
                  }}
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
                  onClick={async () => {
                    if (await downloadCsv(
                      `document-${receipt.id}-tax-breakdown-${new Date().toISOString().slice(0, 10)}.csv`,
                      buildTaxBreakdownExportRows(receipt),
                    )) {
                      setFeedback("Tax breakdown CSV downloaded.");
                    }
                  }}
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
              <h2>Review notes</h2>
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
          {!isVaultRecord && !reimbursementPaymentLocked ? (
            <button
              className={receiptApproved && !receiptPublished ? "secondary-action" : "primary-action"}
              type="button"
              disabled={saving || receiptPublished}
              onClick={async () => {
                setSaving(true);
                setFeedback(null);
                setError(null);
                try {
                  const nextReceipt = receiptApproved && !receiptPublished
                    ? {
                        ...receipt,
                        status: "Review" as ReceiptRecord["status"],
                        needsReview: true,
                      }
                    : {
                        ...(receipt.invoiceDate || !inferredReceiptDate ? receipt : { ...receipt, invoiceDate: inferredReceiptDate }),
                        status: "Ready" as ReceiptRecord["status"],
                        needsReview: false,
                      };
                  setReceipt(nextReceipt);
                  await props.onSave(receipt.id, nextReceipt);
                  setFeedback(
                    receiptApproved && !receiptPublished
                      ? "Approval removed. The expense is back in review."
                      : props.mode === "cost"
                        ? "Expense approved and moved out of review."
                        : "Sales document approved and moved out of review.",
                  );
                  if (!receiptApproved && !isVaultRecord) {
                    setPostApprovePrompt({ nextReceiptId: nextReviewReceipt?.id ?? null });
                  }
                } catch (approveError) {
                  setError(
                    approveError instanceof Error
                      ? approveError.message
                      : receiptApproved && !receiptPublished
                        ? "Could not undo this approval."
                        : "Could not approve this document.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              {receiptPublished ? "Already Published" : receiptApproved ? "Undo Approval" : props.mode === "cost" ? "Approve Expense" : "Approve Sales Document"}
            </button>
          ) : null}
          <button
            className="secondary-action"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setFeedback(null);
              setError(null);
              try {
                const nextReceipt = receipt.invoiceDate || !inferredReceiptDate ? receipt : { ...receipt, invoiceDate: inferredReceiptDate };
                setReceipt(nextReceipt);
                await props.onSave(receipt.id, nextReceipt);
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
              if (!window.confirm("Delete this document? This action cannot be undone.")) {
                return;
              }
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
            disabled={saving || receiptPublished}
            onClick={async () => {
              setSaving(true);
              setFeedback(null);
                setError(null);
                try {
                  const nextReceipt = { ...receipt, status: "Published" as ReceiptRecord["status"] };
                  setReceipt(nextReceipt);
                  await props.onSave(receipt.id, nextReceipt);
                  setFeedback("Receipt marked as published in Exdox.");
                } catch (publishError) {
                  setError(publishError instanceof Error ? publishError.message : "Could not publish this receipt.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {receiptPublished ? "Already Published" : "Mark as Published"}
            </button>
          ) : null}
          {props.mode === "cost" ? (
            <>
              <button
                className="secondary-action"
                type="button"
                disabled={saving || !selectedClaimId || !claimAttachmentAllowed}
                title={claimAttachmentAllowed ? "Attach this receipt to the selected claim" : "Only personal spend receipts can be attached to an expense claim"}
                onClick={async () => {
                  if (!claimAttachmentAllowed) {
                    setError("Only personal spend receipts can be attached to an expense claim.");
                    setFeedback(null);
                    return;
                  }
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
              {!claimAttachmentAllowed ? (
                <span className="field-hint">Only personal spend receipts can be attached to expense claims.</span>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
    {postApprovePrompt ? (
      <div className="review-next-overlay" role="dialog" aria-modal="true" aria-label={`${reviewItemLabel} review prompt`}>
        <button className="review-next-backdrop" type="button" aria-label={`Close ${reviewItemLabel} review prompt`} onClick={() => setPostApprovePrompt(null)} />
        <div className="review-next-panel">
          <div className="panel-heading">
            <h2>{postApprovePrompt.nextReceiptId ? `Review the next ${reviewItemLabel}` : "All caught up"}</h2>
            <span>
              {postApprovePrompt.nextReceiptId
                ? `This ${reviewItemLabel} is approved. Move straight into the next one.`
                : `There are no more ${props.mode === "sales" ? "sales documents" : "expenses"} waiting for review right now.`}
            </span>
          </div>
          <div className="toolbar">
            {postApprovePrompt.nextReceiptId ? (
              <button
                className="primary-action"
                type="button"
                onClick={() => {
                  const nextId = postApprovePrompt.nextReceiptId;
                  setPostApprovePrompt(null);
                  navigate(`${props.mode === "sales" ? "/sales" : "/costs"}/${nextId}`);
                }}
              >
                Review the next {reviewItemLabel}
              </button>
            ) : (
              <>
                <button
                  className="primary-action"
                  type="button"
                  onClick={async () => {
                    if (await downloadCsv(
                      `${props.mode === "sales" ? "sales-documents" : "expenses"}-${new Date().toISOString().slice(0, 10)}.csv`,
                      buildInboxExportRows(reviewedRecordsForExport, props.settings ?? null),
                    )) {
                      setFeedback(`${props.mode === "sales" ? "Sales documents" : "Expenses"} CSV downloaded.`);
                    }
                    setPostApprovePrompt(null);
                  }}
                >
                  Download {props.mode === "sales" ? "sales" : "expense"} detail CSV
                </button>
                {props.mode === "cost" ? (
                  <div className="reimbursement-export-action">
                    {reimbursementExportError ? <div className="error-banner" role="alert">{reimbursementExportError}</div> : null}
                    <button
                      className="secondary-action"
                      type="button"
                      disabled={reimbursementExporting}
                      onClick={async () => {
                        setReimbursementExporting(true);
                        setReimbursementExportError(null);
                        setError(null);
                        setFeedback(null);
                        try {
                          const result = await exportEmployeeReimbursements(props.sessionToken);
                          const downloaded = await downloadCsv(
                            `employee-reimbursements-${new Date().toISOString().slice(0, 10)}.csv`,
                            buildEmployeeReimbursementPaymentRows(result.rows),
                          );
                          if (!downloaded) {
                            throw new Error("Your browser did not save the reimbursement payment summary. Allow downloads, then try again.");
                          }
                          setFeedback(
                            result.notifications.failed
                              ? `Employee reimbursement payment summary downloaded. ${result.notifications.sent} employee notification${result.notifications.sent === 1 ? " was" : "s were"} sent; ${result.notifications.failed} could not be delivered.`
                              : `Employee reimbursement payment summary downloaded and ${result.notifications.sent} employee notification${result.notifications.sent === 1 ? " was" : "s were"} sent.`,
                          );
                          await props.onReimbursementsExported?.();
                          setPostApprovePrompt(null);
                        } catch (exportError) {
                          setReimbursementExportError(
                            exportError instanceof Error
                              ? exportError.message
                              : "Could not prepare the employee reimbursement payment summary.",
                          );
                        } finally {
                          setReimbursementExporting(false);
                        }
                      }}
                    >
                      {reimbursementExporting ? "Preparing payment summary..." : "Download reimbursement payment summary"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
            <button className="secondary-action" type="button" onClick={() => setPostApprovePrompt(null)}>
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {assetUrl && previewAsImage && imageZoomOpen ? (
      <div className="image-zoom-overlay" role="dialog" aria-modal="true" aria-label="Receipt image preview">
        <button className="image-zoom-backdrop" type="button" aria-label="Close image preview" onClick={() => setImageZoomOpen(false)} />
        <div className="image-zoom-panel">
          <div className="toolbar">
            <strong>{receipt.sourceFilename}</strong>
            <button className="secondary-action" type="button" onClick={() => setImageZoomOpen(false)}>
              Close
            </button>
          </div>
          <div
            ref={imageZoomStageRef}
            className="image-zoom-stage"
            onPointerDown={(event) => {
              if (!imageZoomStageRef.current) {
                return;
              }
              event.preventDefault();
              imagePanStartRef.current = {
                x: event.clientX,
                y: event.clientY,
                left: imageZoomStageRef.current.scrollLeft,
                top: imageZoomStageRef.current.scrollTop,
              };
              imageZoomStageRef.current.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!imageZoomStageRef.current || !imagePanStartRef.current) {
                return;
              }
              event.preventDefault();
              const deltaX = event.clientX - imagePanStartRef.current.x;
              const deltaY = event.clientY - imagePanStartRef.current.y;
              imageZoomStageRef.current.scrollLeft = imagePanStartRef.current.left - deltaX;
              imageZoomStageRef.current.scrollTop = imagePanStartRef.current.top - deltaY;
            }}
            onPointerUp={(event) => {
              if (imageZoomStageRef.current?.hasPointerCapture(event.pointerId)) {
                imageZoomStageRef.current.releasePointerCapture(event.pointerId);
              }
              imagePanStartRef.current = null;
            }}
            onPointerCancel={(event) => {
              if (imageZoomStageRef.current?.hasPointerCapture(event.pointerId)) {
                imageZoomStageRef.current.releasePointerCapture(event.pointerId);
              }
              imagePanStartRef.current = null;
            }}
          >
            <img className="image-zoom-image" src={assetUrl} alt={receipt.sourceFilename} />
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function ClaimsPage({
  session,
  claims,
  onCreateClaim,
  employeeMode,
}: {
  session: SessionState;
  claims: ClaimRecord[];
  onCreateClaim: (payload: { name?: string; description?: string; currency?: string; claimType?: 'standard' | 'mileage'; startPostcode?: string; endPostcode?: string; totalMiles?: number; mileageRate?: number }) => Promise<ClaimRecord>;
  employeeMode?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    currency: "GBP",
  });
  const [mileageDraft, setMileageDraft] = useState({ startPostcode: "", endPostcode: "", totalMiles: "", mileageRate: "0.45" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClaimRecord["status"] | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_total" | "lowest_total">("newest");
  const [filtersReady, setFiltersReady] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [exportBusy, setExportBusy] = useState(false);
  const queueExportsEnabled = hasSessionFeature(session, "queue_exports");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextStatus = params.get("status");
    const nextSort = params.get("sort");
    const nextStart = params.get("from") ?? "";
    const nextEnd = params.get("to") ?? "";

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
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setFiltersReady(true);
  }, [location.search]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }

    syncPageSearchParams(location.pathname, location.search, navigate, {
      status: statusFilter !== "all" ? statusFilter : null,
      from: startDate || null,
      to: endDate || null,
      sort: sortOrder !== "newest" ? sortOrder : null,
    });
  }, [endDate, filtersReady, location.pathname, location.search, navigate, sortOrder, startDate, statusFilter]);

  const filteredClaims = claims
    .filter((claim) => {
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "pending" ? claim.status === "pending" && (claim.documentCount > 0 || claim.claimType === "mileage") : claim.status === statusFilter);
      return matchesStatus
        && (!startDate || claim.createdAt.slice(0, 10) >= startDate)
        && (!endDate || claim.createdAt.slice(0, 10) <= endDate);
    })
    .sort((left, right) => compareClaimRecords(left, right, sortOrder));
  const exportEmployees = Array.from(
    new Map(
      claims
        .filter((claim) => (claim.status === "approved" || claim.status === "paid") && Boolean(claim.createdByUserId))
        .map((claim) => [
          claim.createdByUserId as number,
          {
            id: claim.createdByUserId as number,
            name: claim.claimantName || claim.claimantEmail || "Workspace user",
            email: claim.claimantEmail || "",
          },
        ]),
    ).values(),
  );

  useEffect(() => {
    setSelectedEmployeeIds((current) => {
      const availableIds = new Set(exportEmployees.map((employee) => employee.id));
      const retained = current.filter((id) => availableIds.has(id));
      return retained.length ? retained : exportEmployees.map((employee) => employee.id);
    });
  }, [claims]);

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
          <label className="compact-date-filter">
            From
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="compact-date-filter">
            To
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredClaims.length}
            title={filteredClaims.length ? "Download the current claims view as CSV" : "No claims match the current filters yet"}
            onClick={async () => {
              if (await downloadCsv(
                `claims-${new Date().toISOString().slice(0, 10)}.csv`,
                buildClaimsListExportRows(filteredClaims),
              )) {
                setFeedback("Claims CSV downloaded.");
              }
              setError(null);
            }}
          >
            Export claims CSV
          </button>
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading"><h2>Create mileage claim</h2><span>Enter your requested rate. Your business admin approves the claim and its rate.</span></div>
        <div className="form-grid">
          <label>Start postcode<input value={mileageDraft.startPostcode} onChange={(event) => setMileageDraft({ ...mileageDraft, startPostcode: event.target.value })} /></label>
          <label>End postcode<input value={mileageDraft.endPostcode} onChange={(event) => setMileageDraft({ ...mileageDraft, endPostcode: event.target.value })} /></label>
          <label>Total miles<input type="number" min="0.1" step="0.1" value={mileageDraft.totalMiles} onChange={(event) => setMileageDraft({ ...mileageDraft, totalMiles: event.target.value })} /></label>
          <label>Rate per mile<input type="number" min="0.01" step="0.01" value={mileageDraft.mileageRate} onChange={(event) => setMileageDraft({ ...mileageDraft, mileageRate: event.target.value })} /></label>
        </div>
        <div className="toolbar"><button className="primary-action" type="button" disabled={busy} onClick={async () => {
          const miles = Number(mileageDraft.totalMiles); const rate = Number(mileageDraft.mileageRate);
          if (!mileageDraft.startPostcode.trim() || !mileageDraft.endPostcode.trim() || !Number.isFinite(miles) || miles <= 0 || !Number.isFinite(rate) || rate <= 0) { setError("Enter both postcodes, total miles, and a positive rate per mile."); return; }
          setBusy(true); setError(null); setFeedback(null);
          try { const claim = await onCreateClaim({ name: `Mileage claim ${new Date().toLocaleDateString("en-GB")}`, description: `${mileageDraft.startPostcode.trim()} to ${mileageDraft.endPostcode.trim()}`, currency: "GBP", claimType: "mileage", startPostcode: mileageDraft.startPostcode.trim(), endPostcode: mileageDraft.endPostcode.trim(), totalMiles: miles, mileageRate: rate }); setMileageDraft({ startPostcode: "", endPostcode: "", totalMiles: "", mileageRate: "0.45" }); navigate(`/claims/${claim.id}`); } catch (createError) { setError(createError instanceof Error ? createError.message : "Could not create this mileage claim."); } finally { setBusy(false); }
        }}>{busy ? "Creating..." : "Submit mileage claim"}</button></div>
      </section>
      {!employeeMode && queueExportsEnabled ? (
        <section className="panel settings-panel master-expense-export">
          <div className="panel-heading">
            <div>
              <h2>Master approved expense export</h2>
              <span>One accounting row per employee. Individual receipts are not included.</span>
            </div>
            <span>{exportEmployees.length} employee{exportEmployees.length === 1 ? "" : "s"} with approved expenses</span>
          </div>
          <div className="employee-export-list" aria-label="Employees included in master expense export">
            {exportEmployees.length ? exportEmployees.map((employee) => (
              <label className="employee-export-option" key={employee.id}>
                <input
                  type="checkbox"
                  checked={selectedEmployeeIds.includes(employee.id)}
                  onChange={(event) => {
                    setSelectedEmployeeIds((current) => event.target.checked
                      ? [...new Set([...current, employee.id])]
                      : current.filter((id) => id !== employee.id));
                  }}
                />
                <span>
                  <strong>{employee.name}</strong>
                  {employee.email ? <small>{employee.email}</small> : null}
                </span>
              </label>
            )) : <span className="field-hint">Approved employee expense claims will appear here once they are reviewed.</span>}
          </div>
          <div className="toolbar">
            <button
              className="primary-action"
              type="button"
              disabled={exportBusy || !selectedEmployeeIds.length}
              onClick={async () => {
                setExportBusy(true);
                setError(null);
                setFeedback(null);
                try {
                  const result = await exportMasterExpenses(session.token, selectedEmployeeIds);
                  const downloaded = await downloadCsv(
                    `master-approved-expenses-${new Date().toISOString().slice(0, 10)}.csv`,
                    buildMasterExpenseExportRows(result.rows),
                  );
                  if (!downloaded) {
                    throw new Error("Could not download the master expense CSV.");
                  }
                  setFeedback(
                    result.notifications.failed
                      ? `Master expense CSV downloaded. ${result.notifications.sent} employee summary email${result.notifications.sent === 1 ? " was" : "s were"} sent; ${result.notifications.failed} could not be delivered.`
                      : `Master expense CSV downloaded and ${result.notifications.sent} employee summary email${result.notifications.sent === 1 ? " was" : "s were"} sent.`,
                  );
                } catch (exportError) {
                  setError(exportError instanceof Error ? exportError.message : "Could not create the master expense export.");
                } finally {
                  setExportBusy(false);
                }
              }}
            >
              {exportBusy ? "Preparing export..." : "Download master expense CSV"}
            </button>
          </div>
        </section>
      ) : null}
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
              if (!draft.name.trim()) {
                setError("Enter a claim name before creating the claim.");
                setFeedback(null);
                return;
              }
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
            <Link className="claim-card" key={claim.id} to={`/claims/${claim.id}`}>
              <strong>{formatClaimHeading(claim)}</strong>
              <span>Reference: {formatClaimReference(claim)}</span>
              <span>Total value: {currency(claim.totalAmount)}</span>
              <span>Claiming employee: {claimEmployeeLabel(claim)}</span>
              <span>Submission date: {claim.createdAt.slice(0, 10)}</span>
              <span>Approval status: {claimStatusSummary(claim)}</span>
              <span>{claim.claimType === "mileage" ? `${Number(claim.mileageTotalMiles ?? 0).toFixed(1)} miles` : `${claim.documentCount} receipt lines`}</span>
              <StatusPill status={claimStatusToPill(claim.status)} />
            </Link>
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

function EmployeeDocumentsPage(props: {
  title: string;
  description: string;
  records: ReceiptRecord[];
  workspaceContext: "cost" | "sales" | "vault";
  settings: OrganisationSettings | null;
  uploadBusy: boolean;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest_total" | "lowest_total">("newest");
  const [filtersReady, setFiltersReady] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const vatTrackingEnabled = isVatTrackingEnabled(props.settings);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? "";
    const nextStatus = params.get("status");
    const nextSort = params.get("sort");
    const nextStart = params.get("from") ?? "";
    const nextEnd = params.get("to") ?? "";

    setQuery(nextSearch);
    setStatusFilter(nextStatus === "Processing" || nextStatus === "Review" || nextStatus === "Ready" || nextStatus === "Published" || nextStatus === "Payment processing" || nextStatus === "Paid" ? nextStatus : "All");
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setSortOrder(
      nextSort === "oldest" || nextSort === "highest_total" || nextSort === "lowest_total"
        ? nextSort
        : "newest",
    );
    setFiltersReady(true);
  }, [location.search]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }

    syncPageSearchParams(location.pathname, location.search, navigate, {
      search: query.trim() || null,
      status: statusFilter !== "All" ? statusFilter : null,
      from: startDate || null,
      to: endDate || null,
      sort: sortOrder !== "newest" ? sortOrder : null,
    });
  }, [endDate, filtersReady, location.pathname, location.search, navigate, query, sortOrder, startDate, statusFilter]);

  const search = deferredQuery.trim().toLowerCase();
  const filteredReceipts = props.records.filter((receipt) => {
    const matchesSearch =
      !search ||
      `${receipt.vendorName ?? ""} ${receipt.sourceFilename} ${receipt.category ?? ""} ${receipt.rawTextSummary ?? ""}`
        .toLowerCase()
        .includes(search);
    const matchesStatus = statusFilter === "All" || receipt.status === statusFilter;
    const documentDate = receiptDocumentDate(receipt);
    const matchesStart = !startDate || documentDate >= startDate;
    const matchesEnd = !endDate || documentDate <= endDate;
    return matchesSearch && matchesStatus && matchesStart && matchesEnd;
  }).sort((left, right) => compareInboxRecords(left, right, sortOrder === "highest_total" ? "highest_total" : sortOrder === "lowest_total" ? "lowest_total" : sortOrder));

  const documentLabel = props.workspaceContext === "sales" ? "sales documents" : props.workspaceContext === "vault" ? "vault documents" : "expenses";

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{props.title}</h2>
          <p>
            {props.description} Only you and authorised business admins can access these records.
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
            <option value="Payment processing">Payment processing</option>
            <option value="Paid">Paid</option>
          </select>
          <label className="compact-date-filter">
            From
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="compact-date-filter">
            To
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
          </label>
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
            title={filteredReceipts.length ? `Download your personal ${documentLabel} as CSV` : `There are no ${documentLabel} in the current view to export`}
            onClick={async () => {
              if (await downloadCsv(
                `my-${props.workspaceContext}-${new Date().toISOString().slice(0, 10)}.csv`,
                buildInboxExportRows(filteredReceipts, props.settings),
              )) {
                setFeedback(`Your personal ${documentLabel} CSV was downloaded.`);
              }
            }}
          >
            Export my {documentLabel} CSV
          </button>
          <UploadButton
            busy={props.uploadBusy}
            label={`Upload ${props.workspaceContext === "cost" ? "costs" : props.workspaceContext === "sales" ? "sales" : "vault files"}`}
            onFiles={props.onUpload}
          />
        </div>
      </section>
      {feedback ? <div className="success-banner" role="status">{feedback}</div> : null}
      <section className="panel table-panel">
        {filteredReceipts.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Document date</th>
                <th>Supplier</th>
                {vatTrackingEnabled ? <th>Net</th> : null}
                {vatTrackingEnabled ? <th>VAT</th> : null}
                <th>{vatTrackingEnabled ? "Gross" : "Total"}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td><StatusPill status={receipt.status} /></td>
                  <td>{receiptDocumentDate(receipt) || receipt.createdAt.slice(0, 10)}</td>
                  <td>{receipt.vendorName ?? receipt.sourceFilename}</td>
                  {vatTrackingEnabled ? <td>{currency(receipt.netAmount)}</td> : null}
                  {vatTrackingEnabled ? <td>{currency(receipt.vatAmount)}</td> : null}
                  <td>{currency(receiptGrossAmount(receipt))}</td>
                  <td><Link className="secondary-action link-action" to={employeeReceiptPath(receipt)}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-inline-state">
            <strong>{query.trim() || statusFilter !== "All" || startDate || endDate ? `No ${documentLabel} match the current filters.` : `No ${documentLabel} uploaded yet.`}</strong>
            <p>{query.trim() || statusFilter !== "All" || startDate || endDate ? "Change the search, status, or date range to see more records." : "Files submitted through Exdox will appear here."}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function employeeReceiptPath(receipt: ReceiptRecord) {
  if (receipt.workspaceContext === "sales") {
    return `/employee/sales/${receipt.id}`;
  }
  if (receipt.workspaceContext === "vault") {
    return `/employee/vault/${receipt.id}`;
  }
  return `/dropbox/${receipt.id}`;
}

function EmployeeReceiptDetailPage(props: {
  fallbackRecords: ReceiptRecord[];
  loadReceipt: (id: number) => Promise<{ receipt: ReceiptRecord; assetUrl: string | null; downloadUrl: string | null }>;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(props.fallbackRecords.find((item) => item.id === Number(id)) ?? null);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    props.loadReceipt(Number(id))
      .then((payload) => {
        setReceipt(payload.receipt);
        setAssetUrl(payload.assetUrl);
        setDownloadUrl(payload.downloadUrl);
        setError(null);
      })
      .catch((loadError: Error) => {
        setReceipt(null);
        setError(loadError.message || "This receipt is not available.");
      });
  }, [id, props]);

  if (!receipt) {
    return (
      <div className="empty-state">
        <strong>{error ?? "Loading receipt..."}</strong>
        <button className="secondary-action" type="button" onClick={() => navigate(-1)}>Back to my records</button>
      </div>
    );
  }

  const previewAsImage = canPreviewReceiptAsImage(receipt);
  const fields = [
    ["Status", receipt.status],
    ["Document type", documentTypeLabel(receipt.documentType)],
    ["Supplier", receipt.vendorName ?? "Not available"],
    ["Document date", receiptDocumentDate(receipt) || "Not available"],
    ["Category", receipt.category ?? "Not available"],
    ["Reference", receipt.invoiceNumber ?? "Not available"],
    ["Currency", receiptCurrency(receipt)],
    ["Total", currency(receiptGrossAmount(receipt), receiptCurrency(receipt))],
    ["Payment method", analyticsPaymentMethodLabel(receipt.paymentMethod)],
    ["Claim", receipt.claimId ? `Attached to claim #${receipt.claimId}` : "Not attached to a claim"],
  ];

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>{receipt.vendorName ?? receipt.sourceFilename}</h2>
          <p>Your personal document detail. This page is read-only; approvals and company controls remain with authorised business admins.</p>
        </div>
        <div className="toolbar">
          <button className="secondary-action" type="button" onClick={() => navigate(-1)}>Back</button>
          {assetUrl ? <a className="secondary-action link-action" href={assetUrl} target="_blank" rel="noreferrer">Open source file</a> : null}
          {downloadUrl ? (
            <button
              className="secondary-action"
              type="button"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadFileFromUrl(downloadUrl, receipt.sourceFilename);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? "Downloading..." : "Download file"}
            </button>
          ) : null}
        </div>
      </section>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="workspace-split">
        <section className="panel viewer-panel">
          <div className="panel-heading"><h2>Receipt image</h2><span>{receipt.sourceFilename}</span></div>
          {assetUrl ? (
            previewAsImage ? <img className="document-image" src={assetUrl} alt={receipt.sourceFilename} /> : <iframe className="document-frame" src={assetUrl} title={receipt.sourceFilename} />
          ) : (
            <div className="document-placeholder"><strong>Document preview unavailable</strong><p>The record is available, but its stored file cannot currently be previewed.</p></div>
          )}
        </section>
        <section className="panel editor-panel">
          <div className="panel-heading"><h2>Item details</h2><span>Personal record</span></div>
          <dl className="detail-list">
            {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          {receipt.description ? <section className="workspace-detail-section"><h2>Description</h2><p>{receipt.description}</p></section> : null}
          {receipt.rawTextSummary ? <section className="workspace-detail-section"><h2>Extraction notes</h2><p>{receipt.rawTextSummary}</p></section> : null}
        </section>
      </div>
    </div>
  );
}

function EmployeeVaultLockedPage() {
  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>My vault</h2>
          <p>Securely store your own supporting documents when your organisation has Vault included in its Exdox plan.</p>
        </div>
      </section>
      <section className="panel empty-inline-state">
        <strong>Vault is not included in your organisation's current plan.</strong>
        <p>Ask a business admin if your organisation needs Vault access. Your existing costs, sales, claims, and reports remain available.</p>
        <Link className="secondary-action link-action" to="/contact">Contact Exdox</Link>
      </section>
    </div>
  );
}

function EmployeeReportsPage(props: {
  costs: ReceiptRecord[];
  sales: ReceiptRecord[];
  vault: ReceiptRecord[];
  claims: ClaimRecord[];
  settings: OrganisationSettings | null;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<"all" | ReceiptRecord["workspaceContext"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | InboxStatus>("all");
  const records = [...props.costs, ...props.sales, ...props.vault].filter((record) => {
    const documentDate = receiptDocumentDate(record);
    return (workspaceFilter === "all" || record.workspaceContext === workspaceFilter)
      && (statusFilter === "all" || record.status === statusFilter)
      && (!startDate || documentDate >= startDate)
      && (!endDate || documentDate <= endDate);
  }).sort((left, right) => compareInboxRecords(left, right, "newest"));
  const paidClaims = props.claims.filter((claim) => claim.status === "paid");

  return (
    <div className="stack-page">
      <section className="page-hero">
        <div>
          <h2>My reports</h2>
          <p>Review your own uploaded documents and reimbursement history. Company reporting and financial analytics are not shown here.</p>
        </div>
        <div className="filter-row">
          <select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value as typeof workspaceFilter)}>
            <option value="all">All document areas</option><option value="cost">Costs</option><option value="sales">Sales</option><option value="vault">Vault</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All statuses</option><option value="Processing">Processing</option><option value="Review">Review</option><option value="Ready">Approved</option><option value="Published">Published</option><option value="Payment processing">Payment processing</option><option value="Paid">Paid</option>
          </select>
          <label className="compact-date-filter">From<input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="compact-date-filter">To<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
          <button className="secondary-action" type="button" disabled={!records.length} onClick={() => downloadCsv(`my-reports-${new Date().toISOString().slice(0, 10)}.csv`, buildInboxExportRows(records, props.settings))}>Download CSV</button>
        </div>
      </section>
      <section className="metrics-grid">
        <article className="metric-card"><span>Documents in view</span><strong>{records.length}</strong></article>
        <article className="metric-card"><span>Personal spend in view</span><strong>{currency(sumGross(records.filter((record) => record.workspaceContext === "cost" && record.paymentMethod === "cash_personal")))}</strong></article>
        <article className="metric-card"><span>Paid reimbursement claims</span><strong>{paidClaims.length}</strong></article>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading"><h2>Document history</h2><span>{records.length} records</span></div>
        {records.length ? <table className="data-table"><thead><tr><th>Area</th><th>Document date</th><th>Supplier</th><th>Status</th><th>Total</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={`${record.workspaceContext}-${record.id}`}><td>{record.workspaceContext === "cost" ? "Costs" : record.workspaceContext === "sales" ? "Sales" : "Vault"}</td><td>{receiptDocumentDate(record) || record.createdAt.slice(0, 10)}</td><td>{record.vendorName ?? record.sourceFilename}</td><td><StatusPill status={record.status} /></td><td>{currency(receiptGrossAmount(record), receiptCurrency(record))}</td><td><Link className="secondary-action link-action" to={employeeReceiptPath(record)}>Open</Link></td></tr>)}</tbody></table> : <div className="empty-inline-state"><strong>No personal documents match this report.</strong><p>Change the document area, status, or date range to see more records.</p></div>}
      </section>
    </div>
  );
}

function ClaimDetailPage(props: {
  loadClaim: (id: number) => Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }>;
  onStatusChange: (id: number, status: ClaimRecord["status"]) => Promise<void>;
  settings?: OrganisationSettings | null;
  employeeMode?: boolean;
  canUseApprovalWorkflows?: boolean;
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
          <h2>{formatClaimHeading(claim)}</h2>
          <p>{claim.description ?? "Employee reimbursement folder"}</p>
        </div>
        <div className="filter-row">
          <button
            className="secondary-action"
            type="button"
            disabled={!filteredReceipts.length}
            title={filteredReceipts.length ? "Download the current claim receipt view as CSV" : "This claim has no receipts in the current view yet"}
            onClick={async () => {
              if (await downloadCsv(
                `claim-${claim.id}-${new Date().toISOString().slice(0, 10)}.csv`,
                buildClaimExportRows(claim, filteredReceipts, props.settings ?? null),
              )) {
                setFeedback("Claim CSV downloaded.");
              }
              setError(null);
            }}
          >
            Export claim CSV
          </button>
        {!props.employeeMode && props.canUseApprovalWorkflows ? (
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
        <MetricCard
          label={claim.claimType === "mileage" ? "Mileage claim total" : "Claim total"}
          value={currency(claim.totalAmount)}
          detail={claim.claimType === "mileage" ? `${Number(claim.mileageTotalMiles ?? 0).toFixed(1)} miles at ${currency(Number(claim.mileageRate ?? 0))} per mile` : `${receipts.length} linked receipts`}
        />
        <MetricCard label="Claiming employee" value={claimEmployeeLabel(claim)} detail="Claim owner" />
        <MetricCard label="Approval status" value={claimStatusLabel(claim.status)} detail="Current review state" />
        <MetricCard label="Submitted" value={claim.createdAt.slice(0, 10)} detail="Folder submission date" />
      </section>

      {claim.claimType === "mileage" ? (
        <section className="panel table-panel">
          <h2>Mileage journey</h2>
          <div className="metrics-grid">
            <MetricCard label="Start postcode" value={claim.mileageStartPostcode ?? "Not provided"} detail="Journey start" />
            <MetricCard label="End postcode" value={claim.mileageEndPostcode ?? "Not provided"} detail="Journey end" />
            <MetricCard label="Total miles" value={Number(claim.mileageTotalMiles ?? 0).toFixed(1)} detail="Submitted distance" />
            <MetricCard label="Mileage rate" value={`${currency(Number(claim.mileageRate ?? 0))} per mile`} detail="Current business rate" />
          </div>
        </section>
      ) : (
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
                  <td>{receiptDocumentDate(receipt)}</td>
                  <td>{receipt.category ?? "Uncategorised"}</td>
                  <td>{currency(receiptGrossAmount(receipt))}</td>
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
      )}
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
  const navigate = useNavigate();
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
  const [filtersReady, setFiltersReady] = useState(false);
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
    setFiltersReady(true);
  }, [location.search]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }

    syncPageSearchParams(location.pathname, location.search, navigate, {
      search: query.trim() || null,
      status: statusFilter !== "all" ? statusFilter : null,
      sort: sortOrder !== "a_z" ? sortOrder : null,
    });
  }, [filtersReady, location.pathname, location.search, navigate, query, sortOrder, statusFilter]);

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
        <p className="panel-copy">
          Supplier Rules standardise supplier category and tax defaults. Manage card last-four matching and employee collision exceptions in Company Cards.
        </p>
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
                setError("Match text and category are required.");
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
            title={filteredRules.length ? "Download the current supplier rules view as CSV" : "No supplier rules match the current filters yet"}
            onClick={async () => {
              if (await downloadCsv(
                `supplier-rules-${new Date().toISOString().slice(0, 10)}.csv`,
                buildRuleExportRows(filteredRules),
              )) {
                setFeedback("Rules CSV downloaded.");
              }
              setError(null);
            }}
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

function CompanyCardsPage(props: { token: string }) {
  const [cards, setCards] = useState<CompanyCard[]>([]);
  const [exceptions, setExceptions] = useState<CompanyCardEmployeeException[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState({ id: undefined as number | undefined, label: "", cardNetwork: "", cardIssuer: "", lastFour: "", isActive: true });
  const [exceptionDraft, setExceptionDraft] = useState({ companyCardId: "", employeeUserId: "", isActive: true });

  const load = async () => {
    setLoading(true);
    try {
      const [cardData, team] = await Promise.all([listCompanyCards(props.token), getTeam(props.token)]);
      setCards(cardData.cards);
      setExceptions(cardData.exceptions);
      setMembers(team.members.filter((member) => member.role === "Standard_Employee"));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load company card controls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  const cardName = (cardId: number) => cards.find((card) => card.id === cardId)?.label ?? "Removed card";
  const employeeName = (employeeId: number) => {
    const member = members.find((candidate) => candidate.id === employeeId);
    return member?.fullName || member?.email || "Removed employee";
  };

  return (
    <div className="stack-page rules-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>Company cards</h2>
          <span>Business-paid purchases</span>
        </div>
        <p className="panel-copy">
          Add every business card that may appear on receipts. Exdox stores only the last four digits and visible card details, never a full card number. A matching owner upload is marked company-paid and stays out of expense claims.
        </p>
        {error ? <div className="error-banner">{error}</div> : null}
        {feedback ? <div className="success-banner">{feedback}</div> : null}
        <div className="form-grid">
          <label>Card label<input value={cardDraft.label} placeholder="Operations Visa" onChange={(event) => setCardDraft({ ...cardDraft, label: event.target.value })} /></label>
          <label>Last four digits<input inputMode="numeric" maxLength={4} value={cardDraft.lastFour} placeholder="1175" onChange={(event) => setCardDraft({ ...cardDraft, lastFour: event.target.value.replace(/\D/g, "") })} /></label>
          <label>Card network<select value={cardDraft.cardNetwork} onChange={(event) => setCardDraft({ ...cardDraft, cardNetwork: event.target.value })}><option value="">Not specified</option>{["Visa", "Mastercard", "Amex", "Maestro", "Discover", "Diners Club", "JCB", "UnionPay", "Other"].map((network) => <option key={network} value={network}>{network}</option>)}</select></label>
          <label>Issuer / brand (optional)<input value={cardDraft.cardIssuer} placeholder="Monzo" onChange={(event) => setCardDraft({ ...cardDraft, cardIssuer: event.target.value })} /></label>
          <label className="toggle-field">Card active<button className={`toggle-button${cardDraft.isActive ? " on" : ""}`} type="button" onClick={() => setCardDraft({ ...cardDraft, isActive: !cardDraft.isActive })}>{cardDraft.isActive ? "Active" : "Inactive"}</button></label>
        </div>
        <div className="toolbar">
          <button className="primary-action" type="button" disabled={saving} onClick={async () => {
            if (!cardDraft.label.trim() || !/^\d{4}$/.test(cardDraft.lastFour)) { setError("Enter a label and exactly four card digits."); return; }
            setSaving(true); setError(null); setFeedback(null);
            try {
              await saveCompanyCard(props.token, cardDraft);
              setCardDraft({ id: undefined, label: "", cardNetwork: "", cardIssuer: "", lastFour: "", isActive: true });
              await load(); setFeedback("Company card saved.");
            } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save company card."); }
            finally { setSaving(false); }
          }}>{saving ? "Saving..." : cardDraft.id ? "Save card" : "Add company card"}</button>
          {cardDraft.id ? <button className="secondary-action" type="button" onClick={() => setCardDraft({ id: undefined, label: "", cardNetwork: "", cardIssuer: "", lastFour: "", isActive: true })}>Cancel edit</button> : null}
        </div>
        <div className="rules-list">
          {loading ? <p className="panel-copy">Loading company cards...</p> : cards.length ? cards.map((card) => <article className="rule-card" key={card.id}><div><strong>{card.label}</strong><span>{[card.cardNetwork, card.cardIssuer].filter(Boolean).join(" | ") || "Card details not specified"} | ending {card.lastFour}</span><span>{card.isActive ? "Active" : "Inactive"}</span></div><div className="rule-card-actions"><button className="secondary-action" type="button" onClick={() => setCardDraft({ id: card.id, label: card.label, cardNetwork: card.cardNetwork ?? "", cardIssuer: card.cardIssuer ?? "", lastFour: card.lastFour, isActive: card.isActive })}>Edit</button><button className="danger-action" type="button" onClick={async () => { if (!window.confirm(`Remove ${card.label}? Its employee exceptions will also be removed.`)) return; await removeCompanyCard(props.token, card.id); await load(); setFeedback("Company card removed."); }}>Remove</button></div></article>) : <p className="panel-copy">No company cards have been added.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Employee card exceptions</h2><span>Last-four collision handling</span></div>
        <p className="panel-copy">Use this only when an employee’s personal card shares the same visible last four digits as a company card. Their matching uploads will remain personal spend instead of being flagged each time.</p>
        <div className="form-grid">
          <label>Company card<select value={exceptionDraft.companyCardId} onChange={(event) => setExceptionDraft({ ...exceptionDraft, companyCardId: event.target.value })}><option value="">Choose card</option>{cards.filter((card) => card.isActive).map((card) => <option key={card.id} value={card.id}>{card.label} ending {card.lastFour}</option>)}</select></label>
          <label>Employee<select value={exceptionDraft.employeeUserId} onChange={(event) => setExceptionDraft({ ...exceptionDraft, employeeUserId: event.target.value })}><option value="">Choose employee</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName || member.email}</option>)}</select></label>
          <label className="toggle-field">Exception active<button className={`toggle-button${exceptionDraft.isActive ? " on" : ""}`} type="button" onClick={() => setExceptionDraft({ ...exceptionDraft, isActive: !exceptionDraft.isActive })}>{exceptionDraft.isActive ? "Active" : "Inactive"}</button></label>
        </div>
        <div className="toolbar"><button className="primary-action" type="button" disabled={saving} onClick={async () => { if (!exceptionDraft.companyCardId || !exceptionDraft.employeeUserId) { setError("Choose both a company card and employee."); return; } setSaving(true); try { await saveCompanyCardException(props.token, { companyCardId: Number(exceptionDraft.companyCardId), employeeUserId: Number(exceptionDraft.employeeUserId), isActive: exceptionDraft.isActive }); setExceptionDraft({ companyCardId: "", employeeUserId: "", isActive: true }); await load(); setFeedback("Employee exception saved."); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save employee exception."); } finally { setSaving(false); } }}>Add employee exception</button></div>
        <div className="rules-list">{exceptions.length ? exceptions.map((exception) => <article className="rule-card" key={exception.id}><div><strong>{employeeName(exception.employeeUserId)}</strong><span>Personal-card exception for {cardName(exception.companyCardId)}</span><span>{exception.isActive ? "Active" : "Inactive"}</span></div><div className="rule-card-actions"><button className="danger-action" type="button" onClick={async () => { await removeCompanyCardException(props.token, exception.id); await load(); setFeedback("Employee exception removed."); }}>Remove</button></div></article>) : <p className="panel-copy">No employee exceptions have been added.</p>}</div>
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
  const [filtersReady, setFiltersReady] = useState(false);
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
    setFiltersReady(true);
  }, [location.search]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }

    syncPageSearchParams(location.pathname, location.search, navigate, {
      search: query.trim() || null,
      status: statusFilter !== "All" ? statusFilter : null,
      candidates: candidateFilter !== "All" ? candidateFilter : null,
      sort: sortOrder !== "newest" ? sortOrder : null,
    });
  }, [candidateFilter, filtersReady, location.pathname, location.search, navigate, query, sortOrder, statusFilter]);

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
            title={filteredLines.length ? "Download the current reconciliation view as CSV" : "No bank lines match the current filters yet"}
            onClick={async () => {
              if (await downloadCsv(
                `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`,
                buildReconciliationExportRows(filteredLines),
              )) {
                setFeedback("Reconciliation CSV downloaded.");
              }
              setError(null);
            }}
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
                            <td>{receiptDocumentDate(candidate)}</td>
                            <td>{currency(receiptGrossAmount(candidate))}</td>
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
          <input value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="Enter your bank institution ID" />
        </label>
      </div>
      <div className="toolbar">
        <button
          className="primary-action"
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!institutionId.trim()) {
              setError("Enter an institution id before starting bank OAuth.");
              setFeedback(null);
              return;
            }
            setBusy(true);
            setError(null);
            setFeedback(null);
            try {
              const requisition = await props.onCreateRequisition({ provider, institutionId: institutionId.trim() });
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
          onClick={async () => {
            if (await downloadCsv(
              `requisition-draft-${new Date().toISOString().slice(0, 10)}.csv`,
              buildRequisitionDraftExportRows(provider, institutionId),
            )) {
              setFeedback("Setup CSV downloaded.");
            }
          }}
        >
          Export setup CSV
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={async () => {
            if (!institutionId.trim()) {
              setError("Enter an institution id before copying it.");
              setFeedback(null);
              return;
            }
            setError(null);
            const copied = await copyText(institutionId.trim());
            if (copied) {
              setFeedback("Institution id copied.");
            } else {
              setError("Could not copy the institution id.");
              setFeedback(null);
            }
          }}
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
  session: SessionState;
  settings: OrganisationSettings | null;
  onSave: (payload: Pick<OrganisationSettings, "baseCurrency" | "isVatRegistered" | "defaultTaxRate" | "mileageRate">) => Promise<void>;
  onInviteEmployee: (payload: {
    email: string;
    fullName?: string;
    role?: "Business_Admin" | "Standard_Employee";
    departmentId?: number | null;
  }) => Promise<InviteResult>;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const openContactRoute = (subject: string) => {
    navigate(`${contactPagePath}?subject=${encodeURIComponent(subject)}`);
  };
  const openForgotPasswordRoute = () => {
    navigate(`${forgotPasswordPagePath}?email=${encodeURIComponent(props.session.user.email)}`);
  };
  const [draft, setDraft] = useState<OrganisationSettings | null>(props.settings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Business_Admin" | "Standard_Employee">("Standard_Employee");
  const [inviteDepartmentId, setInviteDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(() => loadProfileSettingsDraft(props.session));
  const [preferencesFeedback, setPreferencesFeedback] = useState<string | null>(null);
  const [billingPortalBusy, setBillingPortalBusy] = useState(false);
  const [billingPortalError, setBillingPortalError] = useState<string | null>(null);

  const openBillingPortal = async () => {
    const billing = props.session.billing;
    if (!billing?.stripeConfigured || !billing.stripeCustomerId) {
      openContactRoute("Billing support");
      return;
    }

    setBillingPortalBusy(true);
    setBillingPortalError(null);
    try {
      const response = await createBillingPortalSession(props.session.token);
      if (!response.portalUrl) {
        setBillingPortalError("The billing portal is not available for this workspace yet.");
        return;
      }
      window.location.href = response.portalUrl;
    } catch (portalError) {
      setBillingPortalError(portalError instanceof Error ? portalError.message : "Could not open the billing portal.");
    } finally {
      setBillingPortalBusy(false);
    }
  };

  useEffect(() => {
    setDraft(props.settings);
  }, [props.settings]);

  useEffect(() => {
    setPreferences(loadProfileSettingsDraft(props.session));
  }, [props.session]);

  const refreshTeam = async () => {
    const team = await getTeam(props.session.token);
    setDepartments(team.departments);
    setTeamMembers(team.members);
  };

  useEffect(() => {
    void refreshTeam().catch((teamError) => {
      setInviteError(teamError instanceof Error ? teamError.message : "Could not load team settings.");
    });
  }, [props.session.token]);

  if (!draft) {
    return <div className="empty-state">Settings unavailable.</div>;
  }

  return (
    <section className="panel-stack settings-shell">
      <div className="panel settings-hero-panel">
        <div className="panel-heading">
          <h2>Profile/Settings</h2>
          <span>Personal preferences, workspace controls, security, and team access</span>
        </div>
        <div className="settings-overview-grid">
          <div className="settings-overview-item">
            <strong>Signed in as</strong>
            <span>{props.session.user.fullName?.trim() || "Workspace user"}</span>
          </div>
          <div className="settings-overview-item">
            <strong>Email</strong>
            <span>{props.session.user.email}</span>
          </div>
          <div className="settings-overview-item">
            <strong>Role</strong>
            <span>{props.session.user.role === "Business_Admin" ? "Business admin" : "Standard employee"}</span>
          </div>
          <div className="settings-overview-item">
            <strong>Organisation</strong>
            <span>{draft.organisationName}</span>
          </div>
          <div className="settings-overview-item">
            <strong>Plan</strong>
            <span>{props.session.billing?.planLabel ?? props.session.billing?.planId ?? "Workspace access"}</span>
          </div>
          <div className="settings-overview-item">
            <strong>Current access</strong>
            <span>{props.session.billing ? props.session.billing.status.replace(/_/g, " ") : "Active in workspace"}</span>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Profile</h2>
            <span>Personal identity and session controls</span>
          </div>
          <div className="summary-list">
            <div>
              <strong>Full name</strong>
              <span>{props.session.user.fullName?.trim() || "Workspace user"}</span>
            </div>
            <div>
              <strong>Email address</strong>
              <span>{props.session.user.email}</span>
            </div>
            <div>
              <strong>Default access route</strong>
              <span>{routeTitle(getDefaultRoute(props.session))}</span>
            </div>
            <div>
              <strong>Authentication</strong>
              <span>{props.session.user.status === "active" ? "Active account" : props.session.user.status.replace(/_/g, " ")}</span>
            </div>
          </div>
          <div className="toolbar">
            <button className="secondary-action" type="button" onClick={openForgotPasswordRoute}>
              Open password reset
            </button>
            <button className="secondary-action" type="button" onClick={() => openContactRoute("Change account email")}>
              Open email change request
            </button>
            <button className="danger-action" type="button" onClick={props.onSignOut}>
              Sign out
            </button>
          </div>
        </div>

        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Browser preferences</h2>
            <span>How this browser behaves for your day-to-day work</span>
          </div>
          {preferencesFeedback ? <div className="success-banner">{preferencesFeedback}</div> : null}
          <div className="form-grid">
            <label>
              Start page after sign-in
              <select
                value={preferences.defaultLandingRoute}
                onChange={(event) => {
                  setPreferences((current) => ({ ...current, defaultLandingRoute: event.target.value }));
                }}
              >
                {profileLandingOptions(props.session).map((option) => (
                  <option key={option.route} value={option.route}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date format
              <select
                value={preferences.dateFormat}
                onChange={(event) => {
                  setPreferences((current) => ({ ...current, dateFormat: event.target.value as ProfileSettingsDraft["dateFormat"] }));
                }}
              >
                <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                <option value="month-day-year">Month Day, Year</option>
              </select>
            </label>
            <label className="toggle-field">
              Compact table density
              <button
                className={`toggle-button${preferences.compactTables ? " on" : ""}`}
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, compactTables: !current.compactTables }))}
              >
                {preferences.compactTables ? "On" : "Off"}
              </button>
            </label>
            <label className="toggle-field">
              Upload completion alerts on this browser
              <button
                className={`toggle-button${preferences.vaultUploadEmails ? " on" : ""}`}
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, vaultUploadEmails: !current.vaultUploadEmails }))}
              >
                {preferences.vaultUploadEmails ? "On" : "Off"}
              </button>
            </label>
            <label className="toggle-field">
              Review queue alerts on this browser
              <button
                className={`toggle-button${preferences.reviewAlerts ? " on" : ""}`}
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, reviewAlerts: !current.reviewAlerts }))}
              >
                {preferences.reviewAlerts ? "On" : "Off"}
              </button>
            </label>
            <label className="toggle-field">
              Claim approval alerts on this browser
              <button
                className={`toggle-button${preferences.claimAlerts ? " on" : ""}`}
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, claimAlerts: !current.claimAlerts }))}
              >
                {preferences.claimAlerts ? "On" : "Off"}
              </button>
            </label>
          </div>
          <div className="toolbar">
            <button
              className="primary-action"
              type="button"
              onClick={() => {
                saveProfileSettingsDraft(preferences);
                setPreferencesFeedback("Browser preferences saved on this device.");
              }}
            >
              Save preferences
            </button>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-panel">
      <div className="panel-heading">
        <h2>Workspace controls</h2>
        <span>Organisation tax defaults and shared processing posture</span>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {feedback ? <div className="success-banner">{feedback}</div> : null}
      <div className="summary-list">
        <div>
          <strong>Organisation settings</strong>
          <span>Organisation #{draft.organisationId}</span>
        </div>
        <div>
          <strong>Workspace currency</strong>
          <span>{draft.baseCurrency}</span>
        </div>
        <div>
          <strong>VAT posture</strong>
          <span>{draft.isVatRegistered ? "VAT registered" : "No VAT registration"}</span>
        </div>
        <div>
          <strong>Default fallback tax</strong>
          <span>{draft.defaultTaxRate}</span>
        </div>
        <div><strong>Approved mileage rate</strong><span>{currency(draft.mileageRate)} per mile</span></div>
        <div>
          <strong>Parity impact</strong>
          <span>Saved changes feed both the desktop dashboard and the mobile extraction workflow.</span>
        </div>
      </div>
      {copyFeedback ? <div className="success-banner">{copyFeedback}</div> : null}
      <div className="form-grid">
        <label>
          Choose your currency
          <select value={draft.baseCurrency} disabled={saving} onChange={(event) => setDraft({ ...draft, baseCurrency: event.target.value })}>
            <option value="GBP">GBP - Pound sterling</option>
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - US dollar</option>
            <option value="CAD">CAD - Canadian dollar</option>
            <option value="AUD">AUD - Australian dollar</option>
          </select>
        </label>
        <label className="toggle-field">
          Company is VAT Registered
          <button
            className={`toggle-button${draft.isVatRegistered ? " on" : ""}`}
            type="button"
            disabled={saving}
            onClick={() => setDraft({ ...draft, isVatRegistered: !draft.isVatRegistered })}
          >
            {draft.isVatRegistered ? "On" : "Off"}
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
        <label>Approved mileage rate per mile<input type="number" min="0.01" step="0.01" value={draft.mileageRate} disabled={saving} onChange={(event) => setDraft({ ...draft, mileageRate: Number(event.target.value) })} /></label>
      </div>
      <p>
        This is the reporting currency for the whole workspace. New and existing workspaces use GBP unless a business admin changes it here. Receipt OCR preserves an uploaded document's original currency and records its equivalent in the workspace currency.
      </p>
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
                baseCurrency: draft.baseCurrency,
                isVatRegistered: draft.isVatRegistered,
                defaultTaxRate: draft.defaultTaxRate,
                mileageRate: draft.mileageRate,
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
          onClick={async () => {
            if (await downloadCsv(
              `organisation-settings-${new Date().toISOString().slice(0, 10)}.csv`,
              buildOrganisationSettingsExportRows(draft),
            )) {
              setCopyFeedback("Settings CSV downloaded.");
            }
          }}
        >
          Export settings CSV
        </button>
      </div>
        </div>

        <div className="panel settings-panel">
      <div className="panel-heading">
        <h2>Team & access</h2>
        <span>Add managers, organise departments, and assign employees to the right team</span>
      </div>
      {inviteError ? <div className="error-banner">{inviteError}</div> : null}
      {inviteFeedback ? <div className="success-banner">{inviteFeedback}</div> : null}
      <div className="form-grid">
        <label>
          Team member name
          <input
            value={inviteName}
            disabled={inviteBusy}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Optional full name"
          />
        </label>
        <label>
          Team member email
          <input
            type="email"
            value={inviteEmail}
            disabled={inviteBusy}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="employee@company.co.uk"
          />
        </label>
        <label>
          Access level
          <select value={inviteRole} disabled={inviteBusy} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}>
            <option value="Standard_Employee">Employee - submit their own expenses</option>
            <option value="Business_Admin">Manager - review claims and export CSVs</option>
          </select>
        </label>
        <label>
          Department
          <select value={inviteDepartmentId} disabled={inviteBusy} onChange={(event) => setInviteDepartmentId(event.target.value)}>
            <option value="">No department yet</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
      </div>
      <p>
        Managers can review expenses, claims, and download company CSV exports. Employees retain their personal expense view only.
      </p>
      <div className="toolbar">
        <button
          className="primary-action"
          type="button"
          disabled={inviteBusy}
          onClick={async () => {
            setInviteError(null);
            setInviteFeedback(null);
            if (!inviteEmail.trim()) {
              setInviteError("Enter an employee email before creating the invite.");
              return;
            }
            setInviteBusy(true);
            try {
              const invite = await props.onInviteEmployee({
                email: inviteEmail.trim(),
                fullName: inviteName.trim() || undefined,
                role: inviteRole,
                departmentId: inviteDepartmentId ? Number(inviteDepartmentId) : null,
              });
              setLastInvite(invite);
              setInviteFeedback(
                invite.delivery?.delivered
                  ? `Invite created for ${invite.email}.`
                  : `Invite created for ${invite.email}. Email delivery did not complete, so use the invite link below.`,
              );
              setInviteName("");
              setInviteEmail("");
              setInviteRole("Standard_Employee");
              setInviteDepartmentId("");
              await refreshTeam();
            } catch (saveError) {
              setInviteError(saveError instanceof Error ? saveError.message : "Could not create the invite.");
            } finally {
              setInviteBusy(false);
            }
          }}
        >
          {inviteBusy ? "Creating..." : "Create invite"}
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
            onClick={async () => {
              if (await downloadCsv(
                `latest-invite-${new Date().toISOString().slice(0, 10)}.csv`,
                buildInviteExportRows(lastInvite),
              )) {
                setCopyFeedback("Invite CSV downloaded.");
              }
            }}
          >
            Export invite CSV
          </button>
        </div>
      ) : null}
      <div className="team-management-section">
        <div className="panel-heading">
          <h3>Departments</h3>
          <span>Use your own structure, such as drivers, office staff, or depot teams.</span>
        </div>
        <div className="toolbar">
          <input
            value={newDepartmentName}
            disabled={teamBusy}
            placeholder="New department name"
            onChange={(event) => setNewDepartmentName(event.target.value)}
          />
          <button
            className="secondary-action"
            type="button"
            disabled={teamBusy || !newDepartmentName.trim()}
            onClick={async () => {
              setTeamBusy(true);
              setInviteError(null);
              try {
                await createDepartment(props.session.token, newDepartmentName.trim());
                setNewDepartmentName("");
                await refreshTeam();
                setInviteFeedback("Department added.");
              } catch (departmentError) {
                setInviteError(departmentError instanceof Error ? departmentError.message : "Could not add the department.");
              } finally {
                setTeamBusy(false);
              }
            }}
          >
            Add department
          </button>
        </div>
      </div>
      <div className="team-management-section">
        <div className="panel-heading">
          <h3>Team members</h3>
          <span>Move employees between departments whenever the structure changes.</span>
        </div>
        <div className="team-member-list">
          {teamMembers.map((member) => (
            <div className="team-member-row" key={member.id}>
              <div>
                <strong>{member.fullName?.trim() || member.email}</strong>
                <small>{member.email} · {member.role === "Business_Admin" ? "Manager" : "Employee"}</small>
              </div>
              <select
                value={member.departmentId ?? ""}
                disabled={teamBusy}
                aria-label={`Department for ${member.fullName?.trim() || member.email}`}
                onChange={async (event) => {
                  setTeamBusy(true);
                  setInviteError(null);
                  try {
                    await assignTeamMemberDepartment(props.session.token, member.id, event.target.value ? Number(event.target.value) : null);
                    await refreshTeam();
                    setInviteFeedback("Team member department updated.");
                  } catch (assignmentError) {
                    setInviteError(assignmentError instanceof Error ? assignmentError.message : "Could not update the department.");
                  } finally {
                    setTeamBusy(false);
                  }
                }}
              >
                <option value="">No department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Security</h2>
            <span>Account protection and operational safeguards</span>
          </div>
          <div className="summary-list">
            <div>
              <strong>Session state</strong>
              <span>Signed in on this browser</span>
            </div>
            <div>
              <strong>Two-factor authentication</strong>
              <span>Available on request during the next security rollout</span>
            </div>
            <div>
              <strong>Security contact</strong>
              <span>contact@exdox.co.uk</span>
            </div>
            <div>
              <strong>Audit posture</strong>
              <span>Document review, billing access, and workspace administration stay inside the signed-in account scope.</span>
            </div>
          </div>
          <div className="toolbar">
            <button className="secondary-action" type="button" onClick={() => openContactRoute("Security request")}>
              Open security contact
            </button>
            <button className="secondary-action" type="button" onClick={() => openContactRoute("Two-factor authentication request")}>
              Open 2FA request
            </button>
          </div>
        </div>

        {props.session.user.isOwner ? (
        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Billing & subscription</h2>
            <span>Manage your trial, payment details, plan, or cancellation</span>
          </div>
          {billingPortalError ? <div className="error-banner">{billingPortalError}</div> : null}
          <div className="summary-list">
            <div>
              <strong>Current plan</strong>
              <span>{props.session.billing?.planLabel ?? props.session.billing?.planId ?? "Workspace access"}</span>
            </div>
            <div>
              <strong>Subscription status</strong>
              <span>{props.session.billing ? props.session.billing.status.replace(/_/g, " ") : "Not available"}</span>
            </div>
            <div>
              <strong>Cancellation</strong>
              <span>
                {props.session.billing?.cancellationScheduledFor
                  ? `Scheduled for ${formatLongDate(props.session.billing.cancellationScheduledFor)}`
                  : "Not scheduled"}
              </span>
            </div>
          </div>
          <p>
            {props.session.billing?.stripeConfigured && props.session.billing.stripeCustomerId
              ? "Open the secure billing portal to update payment details, change your plan, or cancel before renewal."
              : "Online billing is not available for this workspace yet. Billing support can help with plan and cancellation requests."}
          </p>
          <div className="toolbar">
            <button className="secondary-action" type="button" disabled={billingPortalBusy} onClick={() => void openBillingPortal()}>
              {billingPortalBusy
                ? "Opening billing portal..."
                : props.session.billing?.stripeConfigured && props.session.billing.stripeCustomerId
                  ? "Manage or cancel subscription"
                  : "Open billing support"}
            </button>
          </div>
        </div>
        ) : null}

        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Workflow shortcuts</h2>
            <span>Shortcuts to available Exdox features</span>
          </div>
          <div className="settings-link-grid">
            <button className="settings-link-card" type="button" onClick={() => navigate("/rules")}>
              <strong>Supplier rules</strong>
              <span>Control automatic category, tax, and payment defaults.</span>
            </button>
            {props.session.user.isOwner ? (
              <button className="settings-link-card" type="button" onClick={() => navigate("/billing")}>
                <strong>Billing</strong>
                <span>Review plan status, trial dates, and subscription actions.</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Data & privacy</h2>
            <span>Export, retention, and account-management routes</span>
          </div>
          <div className="summary-list">
            <div>
              <strong>Settings export</strong>
              <span>Download a CSV copy of the current organisation settings.</span>
            </div>
            <div>
              <strong>Account deletion</strong>
              <span>Use the managed deletion route for account-level requests.</span>
            </div>
            <div>
              <strong>Privacy policy</strong>
              <span>Review the current website privacy and cookie commitments.</span>
            </div>
          </div>
          <div className="toolbar">
            <button
              className="secondary-action"
              type="button"
              onClick={async () => {
                if (await downloadCsv(
                  `organisation-settings-${new Date().toISOString().slice(0, 10)}.csv`,
                  buildOrganisationSettingsExportRows(draft),
                )) {
                  setCopyFeedback("Settings CSV downloaded.");
                }
              }}
            >
              Export settings CSV
            </button>
            <button className="danger-action" type="button" onClick={() => navigate('/settings/delete-account')}>
              Account deletion
            </button>
            <button className="secondary-action" type="button" onClick={() => window.location.assign("/privacy")}>
              Privacy policy
            </button>
          </div>
        </div>

        <div className="panel settings-panel">
          <div className="panel-heading">
            <h2>Support</h2>
            <span>Commercial product support routes</span>
          </div>
          <div className="summary-list">
            <div>
              <strong>Access support</strong>
              <span>Login help, password resets, and invite issues.</span>
            </div>
            <div>
              <strong>Billing support</strong>
              <span>Plan changes, renewal questions, and workspace unlock requests.</span>
            </div>
            <div>
              <strong>Security contact</strong>
              <span>Responsible disclosure and document-handling concerns.</span>
            </div>
          </div>
          <div className="toolbar">
            <button className="secondary-action" type="button" onClick={() => openContactRoute("Access support")}>
              Open access support
            </button>
            <button className="secondary-action" type="button" onClick={() => openContactRoute("Billing support")}>
              Open billing support
            </button>
            <button className="secondary-action" type="button" onClick={() => openContactRoute("Security request")}>
              Open security contact
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeleteAccountPage({ session }: { session: SessionState }) {
  const navigate = useNavigate();
  const organisation = session.organisations.find((item) => item.id === session.activeOrganisationId);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = password.length > 0 && confirmation === 'DELETE' && !busy;

  return (
    <section className="stack-page account-deletion-workspace-page">
      <div className="panel account-deletion-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Permanent account closure</span>
            <h2>Delete this Exdox workspace</h2>
          </div>
          <span>Business owner or sole trader only</span>
        </div>

        <div className="account-deletion-warning" role="alert">
          <strong>This cannot be undone</strong>
          <p>
            Deleting {organisation?.name ?? 'this workspace'} immediately cancels its Stripe trial or subscription,
            removes its saved Stripe customer and payment details, and permanently deletes every user, receipt,
            invoice, claim, vault file, supplier rule, and workspace setting.
          </p>
        </div>

        <div className="summary-list account-deletion-summary">
          <div><strong>Subscription</strong><span>Cancelled immediately with no future renewal</span></div>
          <div><strong>Payment profile</strong><span>Removed from Stripe</span></div>
          <div><strong>Workspace data</strong><span>Permanently deleted for all users</span></div>
          <div><strong>Access</strong><span>All users are signed out and cannot recover this workspace</span></div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <form
          className="account-deletion-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canDelete) return;
            setBusy(true);
            setError(null);
            try {
              await deleteAccount(session.token, { password, confirmation });
              clearStoredSession();
              window.location.assign('/login?accountDeleted=1');
            } catch (deleteError) {
              setError(deleteError instanceof Error ? deleteError.message : 'Account deletion could not be completed.');
              setBusy(false);
            }
          }}
        >
          <label>
            Account password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <label>
            Type DELETE to confirm
            <input
              type="text"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
              required
            />
          </label>
          <div className="toolbar">
            <button className="secondary-action" type="button" disabled={busy} onClick={() => navigate('/settings')}>
              Keep my account
            </button>
            <button className="danger-action account-delete-submit" type="submit" disabled={!canDelete}>
              {busy ? 'Cancelling and deleting...' : 'Permanently delete account'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function UploadButton(props: { busy: boolean; label: string; onFiles: (files: File[]) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <button
        className="upload-button"
        type="button"
        disabled={props.busy}
        aria-label={props.label}
        onClick={() => inputRef.current?.click()}
      >
        {props.busy ? "Uploading..." : props.label}
      </button>
      <input
        ref={inputRef}
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
    </>
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

function MetricCard(props: { label: string; value: string; detail: string; onClick?: () => void; to?: string }) {
  const content = (
    <>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </>
  );

  return props.to ? (
    <Link className="metric-card metric-card-button" to={props.to}>
      {content}
    </Link>
  ) : props.onClick ? (
    <button className="metric-card metric-card-button" type="button" onClick={props.onClick}>
      {content}
    </button>
  ) : (
    <article className="metric-card">
      {content}
    </article>
  );
}

function UsageAllowanceCard(props: {
  usage: number;
  limit: number | null;
  remaining: number | null;
  percentage: number;
  userCount: number;
  userLimit: number | null;
}) {
  const lowAllowance = props.remaining !== null && props.limit !== null
    && props.remaining <= Math.max(10, Math.ceil(props.limit * 0.1));
  const allowanceUsed = props.remaining === 0;
  const detail = props.limit === null
    ? `${props.usage.toLocaleString()} documents used this month`
    : allowanceUsed
      ? `Monthly allowance used: ${props.usage.toLocaleString()} of ${props.limit.toLocaleString()}`
      : `${props.usage.toLocaleString()} of ${props.limit.toLocaleString()} documents used this month`;
  const userDetail = props.userLimit === null
    ? `${props.userCount.toLocaleString()} workspace user${props.userCount === 1 ? "" : "s"}`
    : `${props.userCount.toLocaleString()} of ${props.userLimit.toLocaleString()} users in workspace`;

  return (
    <Link
      className={`metric-card metric-card-button usage-allowance-card${lowAllowance ? " usage-allowance-low" : ""}`}
      to="/billing"
      aria-label={`Monthly document allowance: ${props.remaining === null ? "unlimited" : `${props.remaining} remaining`}`}
    >
      <span>Usage allowance left</span>
      <strong>{props.remaining === null ? "Unlimited" : props.remaining.toLocaleString()}</strong>
      <p>{detail}</p>
      <small className="usage-user-count">{userDetail}</small>
      {props.limit !== null ? (
        <div className="usage-allowance-track" aria-hidden="true">
          <span style={{ width: `${props.percentage}%` }} />
        </div>
      ) : null}
      {lowAllowance ? (
        <small>{allowanceUsed ? "No document allowance remaining" : "Allowance is running low"}</small>
      ) : null}
    </Link>
  );
}

function normalizeInboxStatusLabel(status: "pending" | "approved" | "paid" | "rejected" | InboxStatus | string | null | undefined) {
  const trimmed = typeof status === "string" ? status.trim() : "";
  if (trimmed === "pending") {
    return "Review";
  }
  if (trimmed === "approved") {
    return "Ready";
  }
  if (trimmed === "paid") {
    return "Published";
  }
  if (trimmed === "rejected") {
    return "Processing";
  }
  if (trimmed === "Processing" || trimmed === "Ready" || trimmed === "Review" || trimmed === "Published" || trimmed === "Payment processing" || trimmed === "Paid") {
    return trimmed;
  }
  return "Review";
}

function StatusPill({
  status,
  label,
}: {
  status: "pending" | "approved" | "paid" | "rejected" | InboxStatus | string;
  label?: string;
}) {
  const normalized = normalizeInboxStatusLabel(status);
  return <span className={`status-pill status-${normalized.toLowerCase().replace(/\s+/g, "-")}`}>{label ?? normalized}</span>;
}

function SignalPill({ tone, children }: { tone: "warning" | "info"; children: string }) {
  return <span className={`signal-pill ${tone}`}>{children}</span>;
}

function LoginState(props: {
  busy: boolean;
  error: string | null;
  initialEmail: string;
  confirmationComplete?: boolean;
  confirmationStatus?: string | null;
  checkoutStatus?: string | null;
  accountDeleted?: boolean;
  embeddedInPublicShell?: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(props.initialEmail);
  const [password, setPassword] = useState("");
  const loginStateClassName = props.embeddedInPublicShell ? "login-state login-state-embedded" : "login-state";
  const loginShellClassName = props.embeddedInPublicShell ? "login-shell login-shell-embedded" : "login-shell";
  const needsEmailConfirmation =
    (props.error ?? "").toLowerCase().includes("confirm your email")
    || ["required", "invalid", "used"].includes(props.confirmationStatus ?? "");

  useEffect(() => {
    setEmail(props.initialEmail);
  }, [props.initialEmail]);

  return (
    <div className={loginStateClassName}>
      <div className={loginShellClassName}>
        {props.embeddedInPublicShell ? null : (
          <header className="login-header">
            <div className="login-brand">
              <img src={publicBrandMarkSrc} alt="" />
              <strong>Exdox</strong>
            </div>
          </header>
        )}
        <main className="login-main">
          <section className="login-visual" aria-label="Secure receipt capture">
            <img src="/branding/exdox-login-hero.webp" alt="Cafe owner capturing a receipt with exdox" />
            <span className="login-callout callout-snap">Snap &amp; Sync</span>
            <span className="login-callout callout-total">Total Expense View</span>
          </section>
          <div className="login-panel">
            <h1>Log in to Exdox</h1>
            <p>Secure access for finance teams, approvers, and employee expense users.</p>
            {props.confirmationComplete ? (
              <div className="success-banner">
                Email confirmed. Log in to continue with your selected trial.
              </div>
            ) : null}
            {props.accountDeleted ? (
              <div className="success-banner">Your Exdox account and subscription have been deleted.</div>
            ) : null}
            {props.confirmationStatus === "invalid" || props.confirmationStatus === "used" ? (
              <div className="error-banner">
                This confirmation link is old or invalid. Open the latest Exdox email, or request a new confirmation message below.
              </div>
            ) : null}
            {props.confirmationStatus === "failed" ? (
              <div className="error-banner">
                We could not confirm this email link. Request a new confirmation email and try again.
              </div>
            ) : null}
            {props.checkoutStatus === "success" ? (
              <div className="success-banner">
                Card setup complete. Log in now to open your workspace, then confirm your email within three days to keep access.
              </div>
            ) : null}
            {props.checkoutStatus === "cancelled" ? (
              <div className="error-banner">
                Card setup was cancelled. Confirm your email and log in when you are ready to restart it.
              </div>
            ) : null}
            <form
              className="login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await props.onLogin(email, password);
              }}
            >
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address"
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
              <Link to={`${forgotPasswordPagePath}?email=${encodeURIComponent(email)}`}>Forgot Password?</Link>
              <Link to="/register">Register</Link>
              {needsEmailConfirmation ? <Link to={`/confirm-email?email=${encodeURIComponent(email)}`}>Open confirmation resend</Link> : null}
            </div>
          </div>
        </main>
        {props.embeddedInPublicShell ? null : <SiteFooterBlock />}
      </div>
    </div>
  );
}

function ForgotPasswordState(props: {
  busy: boolean;
  error: string | null;
  initialEmail: string;
  embeddedInPublicShell?: boolean;
  onRequest: (email: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState(props.initialEmail);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const loginStateClassName = props.embeddedInPublicShell ? "login-state login-state-embedded" : "login-state";
  const loginShellClassName = props.embeddedInPublicShell ? "login-shell login-shell-embedded" : "login-shell";

  useEffect(() => {
    setEmail(props.initialEmail);
  }, [props.initialEmail]);

  useEffect(() => {
    if (props.error) {
      setSuccessMessage(null);
    }
  }, [props.error]);

  return (
    <div className={loginStateClassName}>
      <div className={loginShellClassName}>
        <main className="login-main">
          <section className="login-visual" aria-label="Password reset request">
            <img src="/branding/exdox-login-hero.webp" alt="Cafe owner capturing a receipt with exdox" />
            <span className="login-callout callout-snap">Password Reset</span>
            <span className="login-callout callout-hmrc">Secure Account Recovery</span>
            <span className="login-callout callout-total">Email Link Delivery</span>
          </section>
          <div className="login-panel">
            <h1>Reset your Exdox password</h1>
            <p>Enter the email address linked to your account and we will send a secure password reset link.</p>
            <form
              className="login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const nextMessage = await props.onRequest(email);
                if (nextMessage) {
                  setSuccessMessage(nextMessage);
                }
              }}
            >
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </label>
              {successMessage ? <div className="success-banner">{successMessage}</div> : null}
              {props.error ? <div className="error-banner">{props.error}</div> : null}
              <button className="primary-action login-submit" type="submit" disabled={props.busy}>
                {props.busy ? "Sending reset link..." : "Send reset link"}
              </button>
            </form>
            <div className="login-links">
              <Link to="/login">Back to login</Link>
              <Link to={contactPagePath}>Need more help?</Link>
            </div>
          </div>
        </main>
        {props.embeddedInPublicShell ? null : <SiteFooterBlock />}
      </div>
    </div>
  );
}

function ResetPasswordState(props: {
  busy: boolean;
  error: string | null;
  email: string;
  token: string;
  embeddedInPublicShell?: boolean;
  onReset: (email: string, token: string, password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const loginStateClassName = props.embeddedInPublicShell ? "login-state login-state-embedded" : "login-state";
  const loginShellClassName = props.embeddedInPublicShell ? "login-shell login-shell-embedded" : "login-shell";
  const missingDetails = !props.email || !props.token;

  useEffect(() => {
    if (props.error) {
      setSuccessMessage(null);
    }
  }, [props.error]);

  return (
    <div className={loginStateClassName}>
      <div className={loginShellClassName}>
        <main className="login-main">
          <section className="login-visual" aria-label="Choose a new Exdox password">
            <img src="/branding/exdox-platform-hero.webp" alt="Exdox finance workspace with synced receipt controls" />
            <span className="login-callout callout-snap">Set New Password</span>
            <span className="login-callout callout-hmrc">Secure Link Check</span>
            <span className="login-callout callout-total">Account Update</span>
          </section>
          <div className="login-panel">
            <h1>Choose a new password</h1>
            <p>
              {missingDetails
                ? "This password reset link is incomplete. Request a fresh password reset email."
                : `Create a new password for ${props.email}.`}
            </p>
            <form
              className="login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setLocalError(null);
                if (missingDetails) {
                  setLocalError("This reset link is incomplete. Request a new one.");
                  return;
                }
                if (password.length < 8) {
                  setLocalError("Use a password with at least 8 characters.");
                  return;
                }
                if (password !== confirmPassword) {
                  setLocalError("The password confirmation does not match.");
                  return;
                }
                const nextMessage = await props.onReset(props.email, props.token, password);
                if (nextMessage) {
                  setSuccessMessage(nextMessage);
                  setPassword("");
                  setConfirmPassword("");
                }
              }}
            >
              <label>
                New password
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
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your new password"
                  minLength={8}
                  required
                />
              </label>
              {successMessage ? <div className="success-banner">{successMessage}</div> : null}
              {localError ? <div className="error-banner">{localError}</div> : null}
              {props.error ? <div className="error-banner">{props.error}</div> : null}
              <button className="primary-action login-submit" type="submit" disabled={props.busy || missingDetails}>
                {props.busy ? "Updating password..." : "Save new password"}
              </button>
            </form>
            <div className="login-links">
              <Link to="/login">Back to login</Link>
              <Link to={`${forgotPasswordPagePath}?email=${encodeURIComponent(props.email)}`}>Open reset link request</Link>
            </div>
          </div>
        </main>
        {props.embeddedInPublicShell ? null : <SiteFooterBlock />}
      </div>
    </div>
  );
}

function RegisterState(props: {
  busy: boolean;
  error: string | null;
  initialEmail: string;
  inviteToken: string;
  initialAudience: "business" | "sole_trader" | "employee" | null;
  initialPlan: BillingPlanId;
  initialBillingCycle: BillingCycle;
  initialMonthlyDocumentLimit?: number;
  initialIncludedUsers?: number;
  embeddedInPublicShell?: boolean;
  onRegister: (input: {
    accountType?: "owner" | "sole_trader" | "employee";
    email: string;
    password: string;
    confirmPassword: string;
    fullName?: string;
    organisationName?: string;
    inviteToken?: string;
    billingPlan?: BillingPlanId;
    billingCycle?: BillingCycle;
    monthlyDocumentLimit?: number;
    includedUsers?: number;
    termsAccepted?: boolean;
    termsVersion?: string;
  }) => Promise<string | null>;
  onResendConfirmation: (email: string) => Promise<string>;
}) {
  const [fullName, setFullName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState(props.initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [audience, setAudience] = useState<"business" | "sole_trader" | "employee" | null>(props.initialAudience);
  const billingCycle: BillingCycle = "monthly";
  const invitedFlow = Boolean(props.inviteToken);
  const employeeFlow = audience === "employee";
  const soleTraderFlow = audience === "sole_trader";
  const selectedSignupStep = resolvePricingSliderStep(
    normalizeRegisterPlan(props.initialPlan),
    props.initialMonthlyDocumentLimit,
    props.initialIncludedUsers,
  );
  const selectedSignupPrice = priceWithVat(selectedSignupStep.monthlyPrice);
  const enterpriseSignupRequested = !invitedFlow && selectedSignupStep.planId === "enterprise";
  const selfServeSignupBlocked = false;

  useEffect(() => {
    setEmail(props.initialEmail);
  }, [props.initialEmail]);

  useEffect(() => {
    if (props.error) {
      setSuccessMessage(null);
    }
  }, [props.error]);

  const loginStateClassName = props.embeddedInPublicShell ? "login-state login-state-embedded" : "login-state";
  const loginShellClassName = props.embeddedInPublicShell ? "login-shell login-shell-embedded" : "login-shell";

  return (
    <div className={loginStateClassName}>
      <div className={loginShellClassName}>
        {props.embeddedInPublicShell ? null : (
          <header className="login-header">
            <div className="login-brand">
              <img src={brandMarkSrc} alt="" />
              <strong>Exdox</strong>
            </div>
          </header>
        )}
        <main className="login-main">
          <section className="login-visual" aria-label="Receipt capture and finance review">
            <img src="/branding/exdox-platform-hero.webp" alt="Exdox finance workspace with synced receipt controls" />
            <span className="login-callout callout-snap">Invite &amp; Onboard</span>
            <span className="login-callout callout-hmrc">Web + Mobile Sync</span>
            <span className="login-callout callout-total">Receipt Review Ready</span>
          </section>
          <div className="login-panel">
            <h1>
              {invitedFlow
                ? "Activate Exdox Access"
                : audience === null
                  ? "How Will You Use Exdox?"
                  : employeeFlow
                    ? "Join Your Company"
                    : soleTraderFlow
                      ? "Create Your Sole Trader Workspace"
                      : "Create a Business Workspace"}
            </h1>
            <p>
              {invitedFlow
                ? "Set a password to activate access to the invited workspace."
                : audience === null
                  ? "Choose the account type that matches how you will submit or manage expenses."
                : employeeFlow
                  ? "Use your company email address to join its existing Exdox workspace. No card setup is required."
                  : soleTraderFlow
                    ? "Set up your own workspace and subscription using either a personal or business email address."
                    : "Create your company workspace, choose its plan, and complete secure card setup as the business owner."}
            </p>
            {!invitedFlow && audience === null ? (
              <div className="registration-audience-grid" role="group" aria-label="Choose account type">
                <Link className="registration-audience-option" to="/pricing">
                  <strong>A business</strong>
                  <span>Choose a package, then create the company workspace as its owner.</span>
                </Link>
                <Link className="registration-audience-option" to="/pricing?audience=sole_trader">
                  <strong>A sole trader</strong>
                  <span>Choose a package, then create your sole trader workspace.</span>
                </Link>
                <button type="button" onClick={() => setAudience("employee")}>
                  <strong>An employee of a business</strong>
                  <span>I submit expenses for a company that already uses Exdox.</span>
                </button>
              </div>
            ) : null}
            {enterpriseSignupRequested ? (
              <div className="success-banner">
                Enterprise rollout is coming soon. Capture, Control, and Operations can be started online today.
              </div>
            ) : null}
            {audience !== null ? <form
              className="login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setPasswordError(null);
                if (password !== confirmPassword) {
                  setPasswordError("The passwords do not match. Enter the same password in both fields.");
                  return;
                }
                const nextSuccessMessage = await props.onRegister({
                  accountType: invitedFlow ? undefined : employeeFlow ? "employee" : soleTraderFlow ? "sole_trader" : "owner",
                  email,
                  password,
                  confirmPassword,
                  fullName: fullName || undefined,
                  organisationName: invitedFlow || employeeFlow ? undefined : organisationName || undefined,
                  inviteToken: props.inviteToken || undefined,
                  billingPlan: invitedFlow || employeeFlow ? undefined : selectedSignupStep.planId,
                  billingCycle: invitedFlow || employeeFlow ? undefined : billingCycle,
                  monthlyDocumentLimit: invitedFlow || employeeFlow ? undefined : selectedSignupStep.documents,
                  includedUsers: invitedFlow || employeeFlow ? undefined : selectedSignupStep.users,
                  termsAccepted: invitedFlow || employeeFlow ? undefined : acceptedTerms,
                  termsVersion: invitedFlow || employeeFlow ? undefined : termsVersion,
                });
                if (nextSuccessMessage) {
                  setSuccessMessage(nextSuccessMessage);
                  setResendMessage(null);
                  setPassword("");
                  setConfirmPassword("");
                }
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
              {!invitedFlow && !employeeFlow ? (
                <>
                  <label>
                    {soleTraderFlow ? "Trading name (optional)" : "Organisation name"}
                    <input
                      type="text"
                      autoComplete="organization"
                      value={organisationName}
                      onChange={(event) => setOrganisationName(event.target.value)}
                      placeholder={soleTraderFlow ? "Your trading name" : "Your business or organisation"}
                      required={!soleTraderFlow}
                    />
                  </label>
                  <section className="registration-plan-summary" aria-label="Selected plan summary">
                    <div>
                      <span>Selected package</span>
                      <strong>{selectedSignupStep.accessBand} · {selectedSignupStep.users} users</strong>
                    </div>
                    <strong>{currency(selectedSignupPrice)} / month</strong>
                    <p>{selectedSignupStep.documents.toLocaleString()} documents per month · VAT included</p>
                    <Link to="/pricing">Change selection</Link>
                  </section>
                </>
              ) : null}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address"
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
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter the same password again"
                  minLength={8}
                  required
                />
              </label>
              {!invitedFlow && !employeeFlow ? (
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    required
                  />
                  <span>
                    I agree to the <Link to={termsPagePath}>Terms and Conditions</Link> and understand that my card will be charged automatically when the free trial ends unless I cancel before renewal.
                  </span>
                </label>
              ) : null}
              {!invitedFlow && !employeeFlow ? (
                <div className="muted-copy">
                  Secure card setup is the next step. We will send your confirmation email at the same time. Once card setup is complete, you can use the workspace immediately and have three days to confirm your email. Your selected {currency(selectedSignupPrice)} monthly package starts as a free trial and can be cancelled from Billing before renewal.
                </div>
              ) : null}
              {successMessage ? <div className="success-banner">{successMessage}</div> : null}
              {passwordError ? <div className="error-banner">{passwordError}</div> : null}
              {props.error ? <div className="error-banner">{props.error}</div> : null}
              {successMessage && !invitedFlow ? (
                <button
                  className="primary-action login-submit"
                  type="button"
                  disabled={resendBusy}
                  onClick={async () => {
                    setResendBusy(true);
                    setResendMessage(null);
                    try {
                      const message = await props.onResendConfirmation(email);
                      setResendMessage(message);
                    } finally {
                      setResendBusy(false);
                    }
                  }}
                >
                  {resendBusy ? "Sending confirmation..." : "Resend confirmation email"}
                </button>
              ) : (
                <button className="primary-action login-submit" type="submit" disabled={props.busy || (!invitedFlow && !employeeFlow && !acceptedTerms)}>
                  {props.busy ? "Creating access..." : invitedFlow ? "Activate access" : employeeFlow ? "Join company" : "Create workspace"}
                </button>
              )}
              {resendMessage ? <div className="success-banner">{resendMessage}</div> : null}
              {!invitedFlow && props.initialAudience === null ? (
                <button className="registration-back-button" type="button" onClick={() => setAudience(null)}>
                  Choose a different account type
                </button>
              ) : null}
            </form> : null}
            <div className="login-links">
              <Link to="/login">Already have an account? Log in</Link>
              <Link to={`${supportPagePath}?subject=${encodeURIComponent("Onboarding help")}`}>Need help activating?</Link>
            </div>
          </div>
        </main>
        {props.embeddedInPublicShell ? null : <SiteFooterBlock />}
      </div>
    </div>
  );
}

function ConfirmEmailState(props: {
  busy: boolean;
  error: string | null;
  email: string;
  token: string;
  embeddedInPublicShell?: boolean;
  onConfirm: (email: string, token: string) => Promise<void>;
  onResend: (email: string) => Promise<string>;
}) {
  const [attempted, setAttempted] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (attempted || !props.email || !props.token) {
      return;
    }

    setAttempted(true);
    void props.onConfirm(props.email, props.token);
  }, [attempted, props]);

  const loginStateClassName = props.embeddedInPublicShell ? "login-state login-state-embedded" : "login-state";
  const loginShellClassName = props.embeddedInPublicShell ? "login-shell login-shell-embedded" : "login-shell";
  const missingDetails = !props.email || !props.token;
  const canResend = Boolean(props.email);

  return (
    <div className={loginStateClassName}>
      <div className={loginShellClassName}>
        <main className="login-main">
          <section className="login-visual" aria-label="Email confirmation and workspace activation">
            <img src="/branding/exdox-platform-hero.webp" alt="Exdox finance workspace with synced receipt controls" />
            <span className="login-callout callout-snap">Email Confirmation</span>
            <span className="login-callout callout-hmrc">Workspace Activation</span>
            <span className="login-callout callout-total">Secure Sign-Up</span>
          </section>
          <div className="login-panel">
            <h1>Confirm Your Email</h1>
            <p>
              {missingDetails
                ? "This confirmation link is incomplete. Open the latest email from Exdox or register again."
                : props.busy
                  ? "Activating your workspace now."
                  : props.error
                    ? "We could not confirm this email link."
                    : "Your email is confirmed. Taking you into Exdox now."}
            </p>
            {missingDetails ? <div className="error-banner">This confirmation link is missing the required details.</div> : null}
            {!missingDetails && props.busy ? <div className="success-banner">Checking your confirmation link...</div> : null}
            {!missingDetails && props.error ? <div className="error-banner">{props.error}</div> : null}
            {resendMessage ? <div className="success-banner">{resendMessage}</div> : null}
            <div className="login-links">
              <Link to="/login">Go to login</Link>
              <Link to="/register">Create another workspace</Link>
              {canResend ? (
                <button
                  className="link-button"
                  type="button"
                  disabled={resendBusy}
                  onClick={async () => {
                    setResendBusy(true);
                    setResendMessage(null);
                    try {
                      const message = await props.onResend(props.email);
                      setResendMessage(message);
                    } finally {
                      setResendBusy(false);
                    }
                  }}
                >
                  {resendBusy ? "Sending confirmation..." : "Send a new confirmation email"}
                </button>
              ) : null}
            </div>
          </div>
        </main>
        {props.embeddedInPublicShell ? null : <SiteFooterBlock />}
      </div>
    </div>
  );
}

function PublicSite({ session = null }: { session?: SessionState | null }) {
  const location = useLocation();

  if (location.pathname === "/platform") {
    return (
      <PublicLayout activePath="/platform" session={session}>
        <PublicPageIntro
          kicker="Platform"
          title="A finance workspace built for operational review."
          body="Receipt capture, invoice review, claims, vault storage, supplier rules, approvals, and data health sit inside one connected Exdox platform."
        />
        <PlatformCapabilitiesSection session={session} linkTarget={null} />
        <CoverageSection session={session} linkTarget={null} />
        <FlowSection session={session} linkTarget={null} />
        <WorkflowCoverageSection session={session} linkTarget={null} />
      </PublicLayout>
    );
  }

  if (location.pathname === "/integrations") {
    return (
      <PublicLayout activePath="/integrations" session={session}>
        <PublicPageIntro
          kicker="Workflows"
          title="Keep evidence, review queues, and exports in one operational flow."
          body="Exdox connects mobile capture, web review, approvals, protected source evidence, and export-ready queues."
        />
        <IntegrationSection session={session} linkTarget={null} />
        <FlowSection session={session} />
        <WorkflowCoverageSection session={session} />
      </PublicLayout>
    );
  }

  if (location.pathname === "/pricing") {
    return (
      <PublicLayout activePath="/pricing" session={session}>
        <PricingSection session={session} />
      </PublicLayout>
    );
  }

  if (location.pathname === "/faq") {
    return (
      <PublicLayout activePath="/faq" session={session}>
        <PublicPageIntro
          kicker="FAQs"
          title="Help for using Exdox across the app and website."
          body="Find quick answers for capture, review, duplicate uploads, sync questions, claims, login access, and common day-to-day workflow issues."
        />
        <FaqSection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/company") {
    return (
      <PublicLayout activePath="/company" session={session}>
        <PublicPageIntro
          kicker="About"
          title="Built to keep capture, review, and source evidence aligned."
          body="Organisation-scoped records flow across mobile capture, web review, archive retrieval, and finance controls."
        />
        <CompanySection session={session} />
      </PublicLayout>
    );
  }

  if (location.pathname === "/contact") {
    return (
      <PublicLayout activePath={contactPagePath} session={session}>
        <PublicPageIntro
          kicker="Contact Us"
          title="Talk to Exdox about access, billing, or product questions."
          body="Send a message to the Exdox team and we will route it to the right place through contact@exdox.co.uk."
        />
        <ContactSection session={session} />
      </PublicLayout>
    );
  }

  if (location.pathname === "/terms") {
    return (
      <PublicLayout activePath="" session={session}>
        <PublicPageIntro
          kicker="Terms"
          title="Terms and Conditions for Exdox."
          body="These terms cover your use of Exdox, including free trials, subscription billing, cancellation rights, acceptable use, and service access."
        />
        <TermsSection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/privacy") {
    return (
      <PublicLayout activePath="" session={session}>
        <PublicPageIntro
          kicker="Privacy"
          title="Privacy policy for Exdox website and marketing pages."
          body="This page explains what information we collect on the Exdox public website, how we use it, and how advertising and consent tools may operate on the site."
        />
        <PrivacyPolicySection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/account-deletion") {
    return (
      <PublicLayout activePath="" session={session}>
        <PublicPageIntro
          kicker="Account deletion"
          title="Delete an Exdox account and workspace."
          body="Business administrators can permanently close their workspace from Profile/Settings. This cancels the linked Stripe subscription and removes the workspace data."
        />
        <AccountDeletionSection />
      </PublicLayout>
    );
  }

  if (location.pathname === "/cookies") {
    return (
      <PublicLayout activePath="" session={session}>
        <PublicPageIntro
          kicker="Cookies"
          title="Cookie policy for Exdox website and advertising services."
          body="This page explains what cookies and similar technologies may be used on the Exdox public website, including analytics, consent, and Google advertising cookies."
        />
        <CookiePolicySection />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout activePath="/" session={session}>
      <section className="public-hero">
        <div className="public-hero-copy">
          <h1>Capture, review and publish business spend without chasing paper.</h1>
          <p>
            Exdox gives businesses one synced workspace across mobile and web for receipt capture,
            invoice review, document vault storage, expense claims, supplier rules and approval workflows.
          </p>
          <div className="hero-actions">
            {session ? (
              <>
                <Link className="public-primary" to={signedInPublicPrimaryRoute(session)}>
                  {signedInPublicPrimaryHeroLabel(session)}
                </Link>
                <Link className="secondary-inline-link" to={signedInPublicSecondaryRoute(session)}>
                  {isRouteAllowed(session, "/settings") ? "Manage account" : "Back to Workspace"}
                </Link>
              </>
            ) : (
              <>
                <Link className="public-primary" to="/register?plan=control&billingCycle=monthly">Open Free Trial Signup</Link>
                <Link className="secondary-inline-link" to="/pricing">See pricing structure</Link>
              </>
            )}
          </div>
          <div className="store-badges" aria-label="Download the Exdox mobile app">
            <a
              className="store-badge store-badge-image"
              href="https://play.google.com/store/apps/details?id=uk.co.exdox.mobile"
              target="_blank"
              rel="noreferrer"
              aria-label="Download Exdox on Google Play"
            >
              <img src="/branding/google-play-store-badge.jpg" alt="Get it on Google Play" />
            </a>
            <span className="store-badge store-badge-disabled" aria-disabled="true">
              <span className="store-badge-caption">iPhone app</span>
              <strong>Launching shortly</strong>
            </span>
          </div>
          <span>Card details are collected up front and the first charge is taken when the trial ends unless you cancel before renewal.</span>
        </div>
        <img src="/branding/exdox-platform-hero.webp" alt="Connected exdox accounting workspace" />
      </section>
      <PlatformCapabilitiesSection session={session} />
      <FlowSection session={session} />
      <PricingTeaserSection session={session} />
    </PublicLayout>
  );
}

function PublicLayout(props: { activePath: string; children: React.ReactNode; session?: SessionState | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const signedIn = Boolean(props.session);

  return (
    <div className="public-home">
      <header className="public-header">
        <Link className="public-brand" to="/" aria-label="exdox home">
          <img className="public-brand-mark" src={publicBrandMarkSrc} alt="" />
          <strong>Exdox</strong>
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
        <button
          className="public-menu-button"
          type="button"
          aria-label="Open website menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="public-actions">
          {signedIn && props.session ? (
            <>
              <Link to={signedInPublicSecondaryRoute(props.session)}>{signedInPublicSecondaryLabel(props.session)}</Link>
              <Link className="public-button" to={signedInPublicPrimaryRoute(props.session)}>{signedInPublicPrimaryNavLabel(props.session)}</Link>
            </>
          ) : (
            <>
              <Link to="/login">Log In</Link>
              <Link className="public-button" to="/register">Register</Link>
            </>
          )}
        </div>
        {mobileMenuOpen ? (
          <div className="public-mobile-menu">
            <nav className="public-mobile-nav" aria-label="Mobile website">
              {publicNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) => `public-mobile-nav-link${isActive || props.activePath === item.to ? " active" : ""}`}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="public-mobile-actions">
              {signedIn && props.session ? (
                <>
                  <Link to={signedInPublicSecondaryRoute(props.session)} onClick={() => setMobileMenuOpen(false)}>
                    {signedInPublicSecondaryLabel(props.session)}
                  </Link>
                  <Link className="public-button" to={signedInPublicPrimaryRoute(props.session)} onClick={() => setMobileMenuOpen(false)}>
                    {signedInPublicPrimaryNavLabel(props.session)}
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                  <Link className="public-button" to="/register" onClick={() => setMobileMenuOpen(false)}>Register</Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main>{props.children}</main>
      <SiteFooterBlock />
      <HelpChatWidget />
    </div>
  );
}

function SiteFooterBlock() {
  const [cookieConsent, setCookieConsent] = useState<CookieConsentChoice | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const saved = window.localStorage.getItem(cookieConsentStorageKey);
    return saved === "essential_only" || saved === "all_cookies" ? saved : null;
  });
  const [cookieBannerOpen, setCookieBannerOpen] = useState(() => cookieConsent === null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (cookieConsent) {
      window.localStorage.setItem(cookieConsentStorageKey, cookieConsent);
    } else {
      window.localStorage.removeItem(cookieConsentStorageKey);
    }
  }, [cookieConsent]);

  const setConsent = (value: CookieConsentChoice) => {
    setCookieConsent(value);
    setCookieBannerOpen(false);
  };

  return (
    <>
      <footer className="site-footer-shell">
        <div className="site-footer">
          <div className="site-footer-brand">
            <strong>Exdox</strong>
            <p>Receipt capture, review, claims, archive, and finance controls in one connected workflow.</p>
            <span>Mobile capture, web review, approvals, and CSV exports</span>
          </div>
          <div className="site-footer-links">
            <div>
              <strong>Product</strong>
              <Link to="/">Home</Link>
              <Link to="/platform">Platform</Link>
              <Link to="/integrations">Integrations</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div>
              <strong>Support</strong>
              <Link to="/faq">FAQs</Link>
              <Link to="/company">About</Link>
              <Link to={contactPagePath}>Contact</Link>
              <button className="link-button site-footer-button" type="button" onClick={() => setCookieBannerOpen(true)}>
                Cookie preferences
              </button>
            </div>
            <div>
              <strong>Legal</strong>
              <Link to={termsPagePath}>Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/cookies">Cookies</Link>
              <Link to={accountDeletionPagePath}>Account deletion</Link>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>Copyright {new Date().getFullYear()} exdox.co.uk</span>
          <span>
            {cookieConsent === "all_cookies"
              ? "Cookie preference: all cookies accepted"
              : cookieConsent === "essential_only"
                ? "Cookie preference: essential cookies only"
                : "Cookie preference: not set"}
          </span>
        </div>
      </footer>
      {cookieBannerOpen ? (
        <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie preferences">
          <div className="cookie-banner-copy">
            <strong>Cookie preferences</strong>
            <p>
              Exdox uses essential cookies to keep the site secure and working. We may also use analytics and advertising cookies
              on public pages. Choose your preference, or read the full <Link to="/cookies">Cookie Policy</Link>.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button className="secondary-action" type="button" onClick={() => setConsent("essential_only")}>
              Essential only
            </button>
            <button className="primary-action" type="button" onClick={() => setConsent("all_cookies")}>
              Accept all cookies
            </button>
          </div>
        </div>
      ) : null}
    </>
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

function FaqSection() {
  const [query, setQuery] = useState("");
  const faqGroups: Array<{
    title: string;
    description: string;
    items: Array<{ question: string; answer: React.ReactNode; searchText: string }>;
  }> = [
    {
      title: "Getting started",
      description: "The basics for signing in, choosing where to work, and understanding what you are seeing first.",
      items: [
        {
          question: "How do I log in to Exdox?",
          answer: (
            <p>
              Use the same account email address and password on both the website and the mobile app. If you cannot sign in,
              first confirm you are using the correct workspace email, then use the access support route on the About or Contact Us page if you
              still need help.
            </p>
          ),
          searchText: "log in login sign in email password workspace email access support",
        },
        {
          question: "What is the difference between the app and the website?",
          answer: (
            <p>
              The app is mainly for capturing receipts and checking documents on the move. The website gives a broader review
              workspace for finance tasks such as inbox review, supplier rules, claims, vault access, exports, and settings.
            </p>
          ),
          searchText: "difference between app and website mobile capture review workspace supplier rules claims vault exports settings",
        },
        {
          question: "Why do I see Costs, Sales, Vault, Claims, or other areas?",
          answer: (
            <p>
              These are different work areas inside the same organisation. Costs is for receipts and purchase documents, Sales is
              for outbound sales evidence, Vault is for stored source documents, and Claims is for employee expense claims.
            </p>
          ),
          searchText: "costs sales vault claims different work areas organisation receipts purchase documents outbound sales employee expense claims",
        },
      ],
    },
    {
      title: "Using the mobile app",
      description: "The most common questions for uploading and checking receipts from your phone.",
      items: [
        {
          question: "How do I upload a receipt in the app?",
          answer: (
            <p>
              Use the camera button in the bottom navigation to take a photo or choose a file, then wait for the receipt to upload
              and extract. Once it appears in the list, tap it to review the values if needed.
            </p>
          ),
          searchText: "upload receipt app camera bottom navigation take photo choose file review values",
        },
        {
          question: "What does 'To be reviewed' mean?",
          answer: (
            <p>
              It means the document is in the review stage and may still need a person to confirm fields such as supplier, date,
              amount, category, or VAT before it is treated as complete.
            </p>
          ),
          searchText: "to be reviewed review stage supplier date amount category vat complete",
        },
        {
          question: "Why does a merchant name show in the app before it shows on the website?",
          answer: (
            <p>
              In some cases the app can show a stronger local supplier name while the cloud record is still catching up. The website
              only shows the saved cloud value, so there can be a short delay before both surfaces match.
            </p>
          ),
          searchText: "merchant name app website stronger local supplier cloud value sync delay unknown supplier",
        },
        {
          question: "What happens if I upload the same receipt twice?",
          answer: (
            <p>
              Exact duplicate uploads are meant to be treated as duplicates automatically, especially when the same file name is
              reused. If a duplicate is blocked, it should not become a normal new record in the review queue.
            </p>
          ),
          searchText: "duplicate upload same receipt twice file name blocked review queue",
        },
      ],
    },
    {
      title: "Using the website",
      description: "Common questions for the main review workspace in the browser.",
      items: [
        {
          question: "What is the Costs Inbox for?",
          answer: (
            <p>
              The Costs Inbox is where uploaded receipts, supplier bills, and invoices land for review. You can search, filter,
              open a document, check extracted values, and move work toward ready or published states.
            </p>
          ),
          searchText: "costs inbox receipts supplier bills invoices search filter ready published states",
        },
        {
          question: "Why does a row say 'Unknown supplier'?",
          answer: (
            <p>
              That means the saved supplier value is still blank on the website record. The document usually needs review, or the
              cloud version has not yet caught up with a stronger supplier name seen earlier in the app.
            </p>
          ),
          searchText: "unknown supplier blank saved supplier website record review cloud stronger supplier app",
        },
        {
          question: "What does 'Missing details' mean in Data Health?",
          answer: (
            <p>
              It means the document is missing a key review field, usually the supplier name or category. It is a bookkeeping-review
              prompt, not a software error.
            </p>
          ),
          searchText: "missing details data health supplier category bookkeeping review prompt software error",
        },
        {
          question: "How do I find a document quickly on the website?",
          answer: (
            <p>
              Use search plus the status and issue filters in the inbox. Search works best with supplier names, filenames,
              categories, notes, and related document text.
            </p>
          ),
          searchText: "find document quickly website search status issue filters supplier names filenames categories notes",
        },
      ],
    },
    {
      title: "Review, sync, and troubleshooting",
      description: "Quick answers for documents that do not look right first time.",
      items: [
        {
          question: "What should I do if the values look wrong?",
          answer: (
            <p>
              Open the document, correct the key fields, and save the review. Exdox is designed so human review can finish the job
              when a document needs help with supplier, date, totals, tax, or category.
            </p>
          ),
          searchText: "values wrong correct fields save review supplier date totals tax category",
        },
        {
          question: "Why is a document still processing?",
          answer: (
            <p>
              Some uploads take longer to settle into a final review state. If it stays processing longer than expected, refresh the
              queue and check again before treating it as failed.
            </p>
          ),
          searchText: "document still processing upload refresh queue failed pending",
        },
        {
          question: "Why can I see something in one place but not another?",
          answer: (
            <p>
              App and website views are meant to stay in sync, but a record can briefly appear differently while upload, extraction,
              or review updates are still syncing. If it does not settle, reopen the record and check the latest saved fields.
            </p>
          ),
          searchText: "see something in one place not another sync app website upload extraction review updates latest saved fields",
        },
        {
          question: "Where do I go for account, billing, or security help?",
          answer: (
            <p>
              Use the support options on the About or Contact Us page. There are separate contact routes for access support, billing support,
              and security requests so the issue reaches the right place quickly.
            </p>
          ),
          searchText: "account billing security help support about page contact us page access support billing support security requests",
        },
      ],
    },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = faqGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        const haystack = `${group.title} ${group.description} ${item.question} ${item.searchText}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      }),
    }))
    .filter((group) => group.items.length > 0);
  const totalMatches = filteredGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="faq-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Help Centre</p>
          <h2>Answers for everyday Exdox workflow questions</h2>
        </div>
        <p>
          This page covers the most common questions for using Exdox across the mobile app and website, including uploads,
          review queues, duplicate checks, claims, and sync behaviour.
        </p>
      </div>

      <div className="faq-search-shell">
        <label className="faq-search-label" htmlFor="faq-search">
          Search the FAQs
        </label>
        <input
          id="faq-search"
          className="faq-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search FAQs"
          aria-label="Search FAQs"
        />
        <p className="faq-search-meta">
          {normalizedQuery
            ? `${totalMatches} answer${totalMatches === 1 ? "" : "s"} found for "${query.trim()}".`
            : "Search by issue, page name, or wording from the app or website."}
        </p>
      </div>

      <div className="faq-summary-grid">
        <article className="company-card">
          <strong>Use the app for capture</strong>
          <p>Take photos, upload receipts, and check review status while away from the desk.</p>
        </article>
        <article className="company-card">
          <strong>Use the website for review</strong>
          <p>Open inboxes, correct details, manage workflow status, and handle broader finance controls.</p>
        </article>
        <article className="company-card">
          <strong>Use support when it does not settle</strong>
          <p>If a login, sync, or security issue still looks wrong after refresh and review, use the support routes on the About or Contact Us page.</p>
        </article>
      </div>

      <div className="faq-group-list">
        {filteredGroups.map((group) => (
          <section key={group.title} className="faq-group">
            <div className="section-heading faq-group-heading">
              <div>
                <p className="section-kicker">FAQ Section</p>
                <h2>{group.title}</h2>
              </div>
              <p>{group.description}</p>
            </div>
            <div className="faq-items">
              {group.items.map((item) => (
                <details key={item.question} className="faq-item">
                  <summary>{item.question}</summary>
                  <div className="faq-answer">{item.answer}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
        {!filteredGroups.length ? (
          <article className="company-card faq-empty-state">
            <strong>No answers matched that search</strong>
            <p>Try simpler terms like login, receipt, review, duplicate, billing, or supplier.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function TermsSection() {
  return (
    <PolicyLayout
      title="Exdox Terms and Conditions"
      updatedOn="31 August 2026"
      sections={[
        {
          heading: "Who these terms apply to",
          body: (
            <>
              <p>These terms apply to anyone who signs up for, accesses, or uses Exdox through the website, mobile app, or related services.</p>
              <p>By creating an Exdox workspace, starting a free trial, or using a paid subscription, you agree to these terms on behalf of yourself and, where applicable, your organisation.</p>
            </>
          ),
        },
        {
          heading: "Free trial and card authorisation",
          body: (
            <>
              <p>Eligible self-serve plans may include a free trial period. When you start a trial, you must provide valid payment details.</p>
              <p>Your card is not charged immediately for the trial itself unless stated otherwise at checkout. By starting the trial, you authorise Exdox and its payment processor to charge the selected subscription price automatically when the trial ends unless you cancel before renewal.</p>
            </>
          ),
        },
        {
          heading: "Billing, renewal, and cancellation",
          body: (
            <>
              <p>Paid subscriptions renew automatically on the billing cycle shown at checkout unless cancelled before the next renewal date.</p>
              <p>You can manage or cancel your trial or subscription from the billing area of the Exdox website, including the linked billing portal where available. If you cancel during the trial, the subscription should not renew into a paid billing period.</p>
              <p>Cancellation stops future renewal charges. Unless we tell you otherwise, access continues until the end of the current trial or paid billing period.</p>
            </>
          ),
        },
        {
          heading: "Accidental renewal and refunds",
          body: (
            <>
              <p>If you believe your first paid charge after a free trial was accidental, contact us within 14 calendar days of that charge. We will review the request and will normally provide a refund where the workspace has had no material use after the trial converted.</p>
              <p>For later renewals or where the service has been materially used, refunds are considered case by case. Cancelling a subscription does not automatically refund charges already taken.</p>
              <p>Nothing in this policy limits any cancellation or refund right you have under applicable law. If you are signing up as a consumer, your statutory rights apply in addition to these terms.</p>
            </>
          ),
        },
        {
          heading: "Using the service",
          body: (
            <>
              <p>You must use Exdox lawfully and must not misuse the service, interfere with platform security, upload harmful content, or attempt unauthorised access to data, accounts, or systems.</p>
              <p>You are responsible for the accuracy, legality, and authority of the documents, business information, and user access you submit into your workspace.</p>
            </>
          ),
        },
        {
          heading: "Accounts and security",
          body: (
            <>
              <p>You are responsible for keeping account credentials confidential and for activity that takes place through your workspace under your control.</p>
              <p>Exdox may suspend or restrict access where needed for security, fraud prevention, payment failure, legal compliance, or material breach of these terms.</p>
            </>
          ),
        },
        {
          heading: "Service availability and changes",
          body: (
            <>
              <p>Exdox may update, improve, limit, or retire features from time to time. We aim to keep the service available, but uninterrupted access is not guaranteed.</p>
              <p>We may change pricing, plans, or commercial packaging in the future. Material billing changes would apply prospectively rather than rewriting charges that have already been accepted.</p>
            </>
          ),
        },
        {
          heading: "Liability and contact",
          body: (
            <>
              <p>To the extent permitted by law, Exdox is not liable for indirect, incidental, special, or consequential loss. Nothing in these terms limits liability where it cannot legally be excluded.</p>
              <p>For billing, cancellation, legal, or account questions, use the <Link to={`${contactPagePath}?subject=${encodeURIComponent("Terms request")}`}>contact form</Link>.</p>
            </>
          ),
        },
      ]}
    />
  );
}

function PolicyLayout(props: { title: string; updatedOn: string; sections: Array<{ heading: string; body: React.ReactNode }> }) {
  return (
    <section className="company-band policy-band">
      <div className="policy-meta">
        <strong>{props.title}</strong>
        <span>Last updated {props.updatedOn}</span>
      </div>
      <div className="policy-grid">
        {props.sections.map((section) => (
          <article key={section.heading} className="company-card policy-card">
            <strong>{section.heading}</strong>
            <div className="policy-copy">{section.body}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PrivacyPolicySection() {
  return (
    <PolicyLayout
      title="Exdox Privacy Policy"
      updatedOn="17 July 2026"
      sections={[
        {
          heading: "Who this policy applies to",
          body: (
            <>
              <p>This policy applies to the public Exdox website at <strong>exdox.co.uk</strong>, including marketing pages, contact routes, login, registration, and related public information pages.</p>
              <p>If you use an authenticated Exdox product workspace, additional operational data may be processed as part of the service you sign up for.</p>
            </>
          ),
        },
        {
          heading: "Information we may collect",
          body: (
            <>
              <p>We may collect information that you provide directly, such as your name, business name, email address, and any details you submit through registration, demo requests, or support contact.</p>
              <p>We may also collect technical information such as IP address, browser type, device information, page views, referring pages, and interactions with consent tools, site analytics, or advertising components.</p>
            </>
          ),
        },
        {
          heading: "How we use information",
          body: (
            <>
              <p>We use information to operate the website, respond to enquiries, create and manage trial accounts, protect the site, measure performance, and improve content, routing, and commercial messaging.</p>
              <p>Where advertising services are enabled, information may also be used to support ad delivery, frequency management, measurement, fraud prevention, and, where permitted, personalised advertising.</p>
            </>
          ),
        },
        {
          heading: "Google AdSense and advertising disclosures",
          body: (
            <>
              <p>Exdox may use Google AdSense or other Google advertising products on public pages. Third-party vendors, including Google, may use cookies to serve ads based on a user&apos;s prior visits to this site or other websites.</p>
              <p>Google&apos;s use of advertising cookies enables Google and its partners to serve ads based on visits to this site and other sites on the internet. Users can learn more about how Google uses data in advertising and manage ad personalisation through Google&apos;s Ad Settings.</p>
              <p>If additional third-party ad networks or providers are used, their cookies or similar technologies may also be used for ad delivery and measurement. Where legally required, we ask for consent before non-essential advertising cookies are used.</p>
            </>
          ),
        },
        {
          heading: "EEA, UK, and Switzerland consent",
          body: (
            <>
              <p>For users in the EEA, the UK, and Switzerland, we may use a consent management platform to request consent for cookies or similar storage and for the collection, sharing, and use of personal data for advertising or measurement where required by law.</p>
              <p>You can withdraw or update your choices through the consent options made available on the site or through your browser settings, subject to the limitations of browser-based controls.</p>
            </>
          ),
        },
        {
          heading: "Sharing information",
          body: (
            <>
              <p>We may share information with service providers that support hosting, analytics, consent management, communications, security, or advertising. We may also share information where required for legal compliance, fraud prevention, or business protection.</p>
              <p>We do not sell customer account data in the ordinary meaning of that term. Advertising and analytics providers may, however, process data as independent controllers for their own platform operations where their services are used.</p>
            </>
          ),
        },
        {
          heading: "Retention and security",
          body: (
            <>
              <p>We keep information for as long as reasonably necessary for the purposes described in this policy, including account setup, support, security, legal compliance, and commercial record keeping.</p>
              <p>We use technical and organisational measures intended to protect information against unauthorised access, loss, misuse, or disclosure, but no internet transmission or storage system is completely secure.</p>
            </>
          ),
        },
        {
          heading: "Your choices and contact",
          body: (
            <>
              <p>You may be able to control cookies through our consent tools, your browser settings, and Google&apos;s advertising controls. You may also contact us to ask about access, correction, or deletion requests relating to information you have provided directly.</p>
              <p>For privacy enquiries, use the <Link to={`${contactPagePath}?subject=${encodeURIComponent("Privacy request")}`}>contact form</Link>.</p>
            </>
          ),
        },
      ]}
    />
  );
}

function CookiePolicySection() {
  return (
    <PolicyLayout
      title="Exdox Cookie Policy"
      updatedOn="17 July 2026"
      sections={[
        {
          heading: "What cookies are",
          body: (
            <>
              <p>Cookies are small text files stored on a device when you visit a website. Similar technologies may include local storage, pixels, tags, SDK storage, or identifiers used to recognise a browser or device.</p>
            </>
          ),
        },
        {
          heading: "How Exdox may use cookies",
          body: (
            <>
              <p>We may use cookies and similar technologies to keep the site secure, remember preferences, support login and registration flows, measure site usage, manage consent choices, and support advertising or remarketing where enabled.</p>
            </>
          ),
        },
        {
          heading: "Essential cookies",
          body: (
            <>
              <p>These are used for core site functions such as page delivery, load balancing, fraud prevention, security, session integrity, and form or authentication flows. These cookies are generally required for the site to function properly.</p>
            </>
          ),
        },
        {
          heading: "Analytics cookies",
          body: (
            <>
              <p>Analytics tools may use cookies to measure visits, traffic sources, on-page behaviour, device patterns, and site performance. This helps us understand which pages are useful and where the public site needs improvement.</p>
            </>
          ),
        },
        {
          heading: "Advertising cookies",
          body: (
            <>
              <p>If Google AdSense or related Google ad services are used, Google and its partners may use cookies to serve ads, limit how often a user sees the same ad, measure campaign performance, and, where allowed, support personalised advertising based on prior visits.</p>
              <p>Users can find more information about Google&apos;s advertising technologies and controls through Google&apos;s ads and privacy resources. Where required by law, advertising cookies are only used after consent.</p>
            </>
          ),
        },
        {
          heading: "Consent and withdrawal",
          body: (
            <>
              <p>For users in the EEA, the UK, and Switzerland, we may present a consent interface that allows acceptance, rejection, or configuration of non-essential cookies. You can change your choices later through available consent settings or browser controls.</p>
            </>
          ),
        },
        {
          heading: "Managing cookies in your browser",
          body: (
            <>
              <p>Most browsers allow you to block, delete, or restrict cookies. Doing so may affect how some pages or features work, especially account, preference, consent, or embedded third-party functionality.</p>
            </>
          ),
        },
        {
          heading: "Contact",
          body: (
            <>
              <p>If you have questions about cookies or tracking technologies on Exdox, use the <Link to={`${contactPagePath}?subject=${encodeURIComponent("Cookie policy request")}`}>contact form</Link>.</p>
            </>
          ),
        },
      ]}
    />
  );
}

function AccountDeletionSection() {
  return (
    <PolicyLayout
      title="Exdox Account Deletion"
      updatedOn="27 July 2026"
      sections={[
        {
          heading: "Who can request deletion",
          body: (
            <>
              <p>An Exdox user can request deletion of their own account. Where an account belongs to a business workspace, we may also require confirmation from the relevant workspace administrator before removing access tied to that organisation.</p>
              <p>If you are an organisation owner or administrator and want a whole workspace closed, include that clearly in your request so we can review the impact on linked users and finance records.</p>
            </>
          ),
        },
        {
          heading: "How to request deletion",
          body: (
            <>
              <p>The business owner or sole trader can sign in and use <Link to="/settings/delete-account">Profile/Settings &gt; Account deletion</Link> to close the whole workspace immediately.</p>
              <p>The secure deletion screen requires the owner&apos;s current password and an explicit deletion confirmation.</p>
              <p>If you cannot sign in, use the <Link to={`${contactPagePath}?subject=${encodeURIComponent("Account deletion request")}`}>contact form</Link> for account recovery or deletion support.</p>
            </>
          ),
        },
        {
          heading: "What is deleted",
          body: (
            <>
              <p>When an account deletion request is approved, we aim to remove or disable the user&apos;s login access, profile-level account details, and app access associated with that user.</p>
              <p>Where deletion applies to an entire workspace, we also aim to remove active workspace access and operational records that no longer need to be retained.</p>
            </>
          ),
        },
        {
          heading: "What may be retained",
          body: (
            <>
              <p>Some records may need to be retained for a limited period where required for legal compliance, fraud prevention, dispute handling, security investigations, backup recovery, or bookkeeping and tax record obligations.</p>
              <p>This may include finance evidence such as receipts, invoices, claim history, billing events, audit logs, and support correspondence where retention is reasonably required to protect the service or comply with applicable obligations.</p>
            </>
          ),
        },
        {
          heading: "Deletion timing",
          body: (
            <>
              <p>We aim to begin handling verified deletion requests promptly. In normal cases, active account access is removed first and the remaining deletion work is usually completed within 30 days.</p>
              <p>Backups or legally required retained records may remain for longer where necessary, but are kept only for the limited retention purpose that applies to them.</p>
            </>
          ),
        },
        {
          heading: "Partial deletion requests",
          body: (
            <>
              <p>If you want some data removed without closing the entire account, tell us exactly what should be deleted. For example, you may request review of specific uploaded documents or support records.</p>
              <p>We will confirm whether the requested data can be removed immediately or whether any retention requirement applies.</p>
            </>
          ),
        },
      ]}
    />
  );
}

function PlatformCapabilitiesSection({ session = null, linkTarget = "/platform" }: { session?: SessionState | null; linkTarget?: string | null }) {
  const CapabilityCard = ({ icon, title, detail }: { icon: string; title: string; detail: string }) =>
    linkTarget ? (
      <Link className="capability-card" to={linkTarget}><NavIcon name={icon} /><strong>{title}</strong><span>{detail}</span></Link>
    ) : (
      <article className="capability-card"><NavIcon name={icon} /><strong>{title}</strong><span>{detail}</span></article>
    );

  return (
    <section className="capabilities-band">
      <h2>Key Platform Capabilities</h2>
      <div className="capabilities-grid">
        <CapabilityCard icon="costs" title="Receipt & Invoice Capture" detail="Mobile and web submission" />
        <CapabilityCard icon="workflow" title="Approval Workflows" detail="Review, approve and publish in one place" />
        <CapabilityCard icon="rules" title="Supplier Rules" detail="Consistent categorisation and tax defaults" />
        <CapabilityCard icon="claims" title="Mileage & Expense Claims" detail="Staff submission, mileage entry and approval" />
        <CapabilityCard icon="health" title="Client Data Health" detail="Unreadable, duplicate and low-confidence follow-up" />
        <CapabilityCard icon="claims" title="Document Vault" detail="Archive and retrieve source evidence fast" />
        <CapabilityCard icon="integrations" title="Mobile & Web Sync" detail="Keep submission and review status aligned" />
        <CapabilityCard icon="open-banking" title="Queue Exports" detail="CSV exports across inboxes and claims" />
        <Link className="capability-card" to="/pricing"><NavIcon name="overview" /><strong>Pricing & Plans</strong><span>Compare plan tiers, document volumes, and included users</span></Link>
      </div>
    </section>
  );
}

function CoverageSection({ session = null, linkTarget = "/platform" }: { session?: SessionState | null; linkTarget?: string | null }) {
  const DocumentCard = ({ title, detail }: { title: string; detail: string }) =>
    linkTarget ? (
      <Link className="document-card" to={linkTarget}><strong>{title}</strong><span>{detail}</span></Link>
    ) : (
      <article className="document-card"><strong>{title}</strong><span>{detail}</span></article>
    );

  return (
    <section className="workflow-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Coverage Today</p>
          <h2>Built for the documents your finance team already works with</h2>
        </div>
        <p>
          Exdox keeps the submission mix visible in one place across mobile and web, from
          receipt capture and invoice handling to mileage claims and archived support files.
        </p>
      </div>
      <div className="document-grid">
        <DocumentCard title="Receipts" detail="Mobile capture, employee submission, and web upload" />
        <DocumentCard title="Purchase invoices" detail="Structured totals, tax fields, and review-ready categorisation" />
        <DocumentCard title="Sales documents" detail="Separate sales workspace with the same synced review flow" />
        <DocumentCard title="Mileage claims" detail="Staff mileage entry and approval-ready claim handling" />
        <DocumentCard title="Supporting documents" detail="Reference evidence stored alongside review workflows" />
        <DocumentCard title="Vault files" detail="Stored reference documents with protected retrieval" />
      </div>
    </section>
  );
}

function FlowSection({ session = null, linkTarget = "/platform" }: { session?: SessionState | null; linkTarget?: string | null }) {
  const ProcessCard = ({ step, title, detail }: { step: string; title: string; detail: string }) =>
    linkTarget ? (
      <Link className="process-card" to={linkTarget}><span>{step}</span><strong>{title}</strong><p>{detail}</p></Link>
    ) : (
      <article className="process-card"><span>{step}</span><strong>{title}</strong><p>{detail}</p></article>
    );

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
        <ProcessCard step="1. Capture" title="Collect receipts, invoices, and supporting files" detail="Use mobile capture, web upload, and employee submission flows." />
        <ProcessCard step="2. Extract" title="Pull out totals, tax, supplier, and line detail" detail="Structured extraction, VAT-aware fields, and document detail all stay visible for review." />
        <ProcessCard step="3. Review" title="Work the exceptions instead of retyping everything" detail="Needs-review, duplicate, unreadable, and low-confidence signals surface the items that need attention." />
        <ProcessCard step="4. Store" title="Keep the original evidence easy to retrieve" detail="Vault storage, protected document access, and searchable archive views keep source files close at hand." />
        <ProcessCard step="5. Approve & Publish" title="Move claims, reviews, and handoff queues forward" detail="Approval-ready claims, ready queues, and export routes keep the downstream workflow moving." />
      </div>
    </section>
  );
}

function WorkflowCoverageSection({ session = null, linkTarget = "/platform" }: { session?: SessionState | null; linkTarget?: string | null }) {
  const WorkflowCard = ({ title, items }: { title: string; items: string[] }) =>
    linkTarget ? (
      <Link className="workflow-card workflow-link" to={linkTarget}>
        <strong>{title}</strong>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Link>
    ) : (
      <article className="workflow-card">
        <strong>{title}</strong>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    );

  return (
    <section className="workflow-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Feature Coverage</p>
          <h2>Built around the same workflow finance teams expect from Dext</h2>
        </div>
        <p>
          Capture, review, rules, approvals, vault storage, and exports are all available inside the
          same Exdox web workspace that syncs with the mobile app.
        </p>
      </div>
      <div className="workflow-grid">
        <WorkflowCard
          title="Capture across every submission route"
          items={[
            "Mobile receipt capture in the app",
            "Drag-and-drop uploads in costs and sales inboxes",
            "Dedicated employee drop box for non-admin users",
            "Mileage entry and expense-claim capture for staff",
            "Clear status tracking for every submitted document",
            "Separate workspaces for purchase and sales documents",
          ]}
        />
        <WorkflowCard
          title="Automate the review layer"
          items={[
            "Supplier rules for category, tax rate and payment method",
            "VAT-aware editable totals, net and tax fields",
            "Needs-review queues across costs, sales and claims",
            "Low-confidence and unreadable-document follow-up",
            "Duplicate upload checks before final publish",
            "Audit-friendly document detail editing before publish",
          ]}
        />
        <WorkflowCard
          title="Close the loop with finance controls"
          items={[
            "Dedicated vault workspace for searchable archived evidence",
            "Approval-ready claims and document review handoff",
            "Filtered CSV exports across queues and document views",
            "Organisation-level VAT settings and tax defaults",
            "Live sync with the same receipt records used in mobile",
          ]}
        />
      </div>
    </section>
  );
}

function IntegrationSection({ session = null, linkTarget = "/integrations" }: { session?: SessionState | null; linkTarget?: string | null }) {
  return (
    <section className="integration-band">
      <div>
        <h2>Connected Capture &amp; Review Workflows</h2>
        <p>
          Keep capture and review moving together with synced web and mobile workflows,
          organisation switching, approval queues, CSV exports, and archive-safe evidence retrieval.
        </p>
      </div>
      <div className="integration-names" aria-label="Connected Exdox workflows">
        <span>Mobile capture</span>
        <span>Web review</span>
        <span>Expense approvals</span>
        <span>CSV exports</span>
      </div>
    </section>
  );
}

function PricingTeaserSection({ session = null }: { session?: SessionState | null }) {
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
            className="pricing-card pricing-link"
            to="/pricing"
          >
            <span>{plan.name}</span>
            <strong>{plan.tagline}</strong>
            <p>{plan.monthlyPrice != null ? `${currency(priceWithVat(plan.monthlyPrice))} per month` : "Custom pricing"}</p>
            <p>{plan.monthlyDocuments} · {plan.users}</p>
          </Link>
        ))}
      </div>
      <div className="section-actions">
        <Link className="public-button" to="/pricing">View pricing page</Link>
        {session ? (
          <Link className="secondary-inline-link" to={signedInPublicPrimaryRoute(session)}>{signedInPublicPrimaryHeroLabel(session)}</Link>
        ) : (
          <Link
            className="secondary-inline-link"
            to={buildRegisterLink("control", "monthly", {
              monthlyDocumentLimit: 1500,
              includedUsers: 30,
            })}
          >
            Open Trial Signup
          </Link>
        )}
      </div>
    </section>
  );
}

function PricingSection({ session = null }: { session?: SessionState | null }) {
  const pricingAudience = new URLSearchParams(useLocation().search).get("audience") === "sole_trader"
    ? "sole_trader"
    : "business";
  const [sliderIndex, setSliderIndex] = useState(0);
  const signedIn = Boolean(session);
  const signedInBillingRoute = session && isRouteAllowed(session, "/billing") ? "/billing" : session ? signedInPublicPrimaryRoute(session) : null;
  const selectedStep = pricingSliderSteps[sliderIndex] ?? pricingSliderSteps[0]!;
  const selectedPlan = pricingPlans.find((plan) => plan.id === selectedStep.planId) ?? pricingPlans[0]!;
  const selectedPrice = priceWithVat(selectedStep.monthlyPrice);
  const selectedCapacity = [
    { label: "documents processed per month", value: selectedStep.documents.toLocaleString() },
    { label: "users included", value: selectedStep.users.toLocaleString() },
    { label: "workspace areas unlocked", value: selectedStep.unlockedWorkspaces.length.toLocaleString() },
  ];
  const sliderBands: Array<{ id: BillingPlanId; label: string }> = [
    { id: "capture", label: "Capture" },
    { id: "control", label: "Control" },
    { id: "operations", label: "Operations" },
  ];

  return (
    <section className="pricing-band pricing-page-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Pricing</p>
          {signedIn ? <h2>Choose the workflow depth that fits the business.</h2> : <h1>Choose the workflow depth that fits the business.</h1>}
        </div>
        <p>
          Exdox plans are structured around document volume, users, control depth, and operational workflow coverage.
        </p>
      </div>
      <div className="pricing-page-layout">
        <div className="pricing-page-main">
          <article className="slider-pricing-card">
            <div className="slider-price-row">
              <strong>{currency(selectedPrice)}</strong>
              <span>Per Month</span>
            </div>
            <span className="slider-vat-note">
              GBP, includes VAT
            </span>
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
            {signedIn && signedInBillingRoute ? (
              <Link className="public-button" to={signedInBillingRoute}>
                {signedInBillingRoute === "/billing" ? "Open Billing" : "Back to Workspace"}
              </Link>
            ) : (
              <Link
                className="public-button"
                to={buildRegisterLink(selectedStep.planId, "monthly", {
                  monthlyDocumentLimit:
                    selectedStep.planId === "capture" ||
                    selectedStep.planId === "control" ||
                    selectedStep.planId === "operations"
                      ? selectedStep.documents
                      : undefined,
                  includedUsers:
                    selectedStep.planId === "capture" ||
                    selectedStep.planId === "control" ||
                    selectedStep.planId === "operations"
                      ? selectedStep.users
                      : undefined,
                  audience: pricingAudience,
                })}
              >
                {selectedPlan.cta}
              </Link>
            )}
          </article>
          <div className="pricing-grid pricing-grid-expanded pricing-grid-detailed">
            {pricingPlans.map((plan) => (
              <article
                key={plan.id}
                className={`pricing-card${selectedStep.planId === plan.id ? " current-plan" : ""}`}
              >
                <span>{plan.name}</span>
                <strong>{plan.tagline}</strong>
                <p>{plan.trialLabel}</p>
                <p>
                  {plan.id === "enterprise"
                    ? "Custom rollout via sales"
                    : plan.monthlyPrice != null
                      ? `${currency(priceWithVat(plan.monthlyPrice))} per month`
                      : "Custom pricing"}
                </p>
                <p>{plan.monthlyDocuments}</p>
                <p>{plan.users}</p>
                <ul className="pricing-feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {plan.id === "enterprise" ? (
                  <span className="public-button public-button-disabled" aria-disabled="true">Coming soon</span>
                ) : signedIn && signedInBillingRoute ? (
                  <Link className="public-button" to={signedInBillingRoute}>
                    {signedInBillingRoute === "/billing" ? "Open Billing" : "Back to Workspace"}
                  </Link>
                ) : (
                  <Link
                    className="public-button"
                    to={buildRegisterLink(plan.id, "monthly", {
                      monthlyDocumentLimit: plan.monthlyDocumentLimit,
                      includedUsers: plan.includedUsers,
                      audience: pricingAudience,
                    })}
                  >
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
              <strong>Monthly pricing</strong>
              <p>Self-serve plans are currently shown as monthly pricing while annual billing stays hidden.</p>
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
                <li>Card details are collected before the trial begins</li>
                <li>Cancel from Billing before renewal if you do not want the paid subscription to start</li>
              </ul>
            </article>
            <article className="workflow-card">
              <strong>Workflow coverage</strong>
              <ul>
                <li>Capture focuses on receipt and invoice intake</li>
                <li>All tiers include Sales; Control adds broader approval workflow coverage</li>
                <li>Operations adds rules, vault, and expanded workflow controls</li>
              </ul>
            </article>
          <article className="workflow-card">
              <strong>Future enterprise rollout</strong>
              <ul>
                <li>Not currently available for purchase</li>
                <li>Capacity and multi-entity capability will be announced after validation</li>
                <li>Contact Exdox for future enterprise enquiries</li>
              </ul>
            </article>
          </div>
        </div>
        <div className="pricing-page-side">
          <div className="slider-side-stack">
            <article className="slider-info-card">
              <h2>Included plan capacity</h2>
              <ul className="slider-credit-list">
                {selectedCapacity.map((capacity) => (
                  <li key={capacity.label}>
                    <strong>{capacity.value}</strong>
                    <span>{capacity.label}</span>
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
                Route access, users, and document allowance scale with the selected package band.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompanySection({ session = null }: { session?: SessionState | null }) {
  return (
    <section className="company-band">
      <div className="section-heading">
        <div>
          <p className="section-kicker">About</p>
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
          <Link className="secondary-inline-link company-card-link-row" to={session ? signedInPublicPrimaryRoute(session) : "/register?plan=control&billingCycle=monthly"}>{session ? signedInPublicPrimaryHeroLabel(session) : "Open Control trial signup"}</Link>
        </article>
        <article className="company-card">
          <strong>Review-ready audit trail</strong>
          <p>Receipts, vault files, sales evidence, claims, supplier rules and reconciliation status live in one workspace.</p>
          <Link className="secondary-inline-link company-card-link-row" to={session ? signedInPublicPrimaryRoute(session) : "/register?plan=operations&billingCycle=monthly"}>{session ? signedInPublicPrimaryHeroLabel(session) : "Open Operations trial signup"}</Link>
        </article>
        <article className="company-card">
          <strong>Built for finance teams</strong>
          <p>Business admins get the full control surface, employees can still submit directly, and the active organisation context stays visible across the workspace.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/pricing">Review pricing</Link>
        </article>
      </div>
      <div className="section-heading" id="support">
        <div>
          <p className="section-kicker">Support</p>
          <h2>Access, billing and security contact points in one place</h2>
        </div>
        <p>
          Use the right route for workspace activation, billing coordination, password support, and security requests
          without bouncing between unrelated pages.
        </p>
      </div>
      <div className="company-grid">
        <article className="company-card">
          <strong>Help and FAQs</strong>
          <p>Use this for everyday guidance on mobile capture, website review, duplicate receipts, claims, and document sync.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/faq">Open FAQs</Link>
        </article>
        <article className="company-card">
          <strong>Contact Exdox</strong>
          <p>Use the contact form for general product questions, demos, onboarding, and customer support requests.</p>
          <Link className="secondary-inline-link company-card-link-row" to={contactPagePath}>Open contact page</Link>
        </article>
        <article className="company-card">
          <strong>Access support</strong>
          <p>Use this for login help, password resets, invite issues, and activation support.</p>
          <Link className="secondary-inline-link company-card-link-row" to={`${contactPagePath}?subject=${encodeURIComponent("Access support")}`}>
            Open access support form
          </Link>
        </article>
        <article className="company-card">
          <strong>Billing support</strong>
          <p>Use this for plan questions, workspace unlock requests, and commercial billing changes.</p>
          <Link className="secondary-inline-link company-card-link-row" to={`${contactPagePath}?subject=${encodeURIComponent("Billing support")}`}>
            Open billing support form
          </Link>
        </article>
      </div>
    </section>
  );
}

function ContactSection({ embedded = false, session = null }: { embedded?: boolean; session?: SessionState | null }) {
  const location = useLocation();
  const requestedSubject = new URLSearchParams(location.search).get("subject")?.trim();
  const subjectOptions = [
    "General enquiry",
    "Access support",
    "Billing support",
    "Product demo",
    "Onboarding help",
    "Security request",
    "Terms request",
    "Privacy request",
    "Cookie policy request",
    "Account deletion request",
  ];
  const [name, setName] = useState(session?.user.fullName?.trim() || "");
  const [email, setEmail] = useState(session?.user.email || "");
  const [company, setCompany] = useState(
    session?.organisations.find((organisation) => organisation.id === session.activeOrganisationId)?.name?.trim() || "",
  );
  const [subject, setSubject] = useState(requestedSubject || "General enquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (requestedSubject) {
      setSubject(requestedSubject);
    }
  }, [requestedSubject]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const activeOrganisation = session.organisations.find((organisation) => organisation.id === session.activeOrganisationId);
    setName((current) => current || session.user.fullName?.trim() || "");
    setEmail((current) => current || session.user.email || "");
    setCompany((current) => current || activeOrganisation?.name?.trim() || "");
  }, [session]);

  const canSubmit = Boolean(name.trim() && email.trim() && subject.trim() && message.trim() && !submitting);

  return (
    <section className={embedded ? "contact-section-embedded" : "company-band contact-band"}>
      <div className="section-heading">
        <div>
          <p className="section-kicker">Contact Us</p>
          <h2>Send your message to the Exdox team</h2>
        </div>
        <p>
          Send your message here and we will route it through the main Exdox inbox at{" "}
          <a href={`mailto:${contactEmailAddress}`}>{contactEmailAddress}</a>.
        </p>
      </div>

      <div className="contact-layout">
        <div className="contact-form-card">
          <div className="panel-heading">
            <h2>Contact form</h2>
            <span>Use this form for support, billing, onboarding, demos, or general questions.</span>
          </div>
          <form
            className="contact-form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canSubmit) {
                return;
              }
              setSubmitting(true);
              setSubmitMessage(null);
              setSubmitError(null);
              try {
                const response = await submitContactForm({
                  fullName: name.trim(),
                  email: email.trim(),
                  organisationName: company.trim(),
                  subject: subject.trim(),
                  message: message.trim(),
                });
                setSubmitMessage(response.message || "Your message has been sent to the Exdox team.");
                setMessage("");
              } catch (error) {
                setSubmitError(error instanceof Error ? error.message : "Could not send your message right now.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required />
            </label>
            <label>
              Email address
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.co.uk" required />
            </label>
            <label>
              Organisation
              <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Your business name" />
            </label>
            <label>
              Subject
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                {requestedSubject && !subjectOptions.includes(requestedSubject) ? <option>{requestedSubject}</option> : null}
                {subjectOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="contact-form-message">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us what you need help with."
                rows={8}
                required
              />
            </label>
            <div className="toolbar">
              <button className="primary-action" type="submit" disabled={!canSubmit}>
                {submitting ? "Sending..." : "Send message"}
              </button>
            </div>
            {submitMessage ? <p className="form-status success">{submitMessage}</p> : null}
            {submitError ? <p className="form-status error">{submitError}</p> : null}
          </form>
        </div>

        <div className="contact-side-grid">
          <article className="company-card">
            <strong>Main contact email</strong>
            <p>All customer-facing enquiries should go through the main Exdox inbox.</p>
            <a className="secondary-inline-link company-card-link-row" href={`mailto:${contactEmailAddress}`}>{contactEmailAddress}</a>
          </article>
          <article className="company-card">
            <strong>Best reasons to use this page</strong>
            <p>Product questions, onboarding, pricing follow-up, access support, billing queries, and security contact.</p>
          </article>
          <article className="company-card">
            <strong>Need quick answers first?</strong>
            <p>If your question is about logging in, uploading receipts, or review flow, the FAQ page may answer it straight away.</p>
            <Link className="secondary-inline-link company-card-link-row" to="/faq">Open FAQs</Link>
          </article>
        </div>
      </div>
    </section>
  );
}

function WorkspaceContactPage({ session }: { session: SessionState }) {
  return (
    <div className="stack-page">
      <section className="panel">
        <div className="panel-heading">
          <h2>Contact Exdox</h2>
          <span>Use the website form for access, billing, onboarding, policy, and product questions.</span>
        </div>
        <p>
          Messages sent here go through the main Exdox contact route so you do not need to leave the dashboard to ask for help.
        </p>
      </section>
      <ContactSection embedded session={session} />
    </div>
  );
}

function BillingPage(props: { session: SessionState }) {
  const navigate = useNavigate();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const search = new URLSearchParams(useLocation().search);
  const lockedRoute = search.get("locked");
  const lockedRouteLabel = lockedRoute ? routeTitle(lockedRoute) : null;
  const billing = props.session.billing;
  const trialSetupRequired = billing?.status === "inactive" && !billing?.stripeSubscriptionId;
  const selectedBillingStep = billing
    ? resolvePricingSliderStep(billing.planId, billing.monthlyDocumentLimit ?? undefined, billing.includedUsers ?? undefined)
    : null;
  const trialDateLabel = billing?.trialEndsAt ? formatLongDate(billing.trialEndsAt) : null;
  const cancellationDateLabel = billing?.cancellationScheduledFor ? formatLongDate(billing.cancellationScheduledFor) : null;

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
        {lockedRouteLabel ? <p className="locked-explainer">That workspace area is locked on your current plan: {lockedRouteLabel}</p> : null}
        <div className="billing-metrics">
          <div className="metric-card">
            <span>Billing cycle</span>
            <strong>{billing.billingCycle}</strong>
          </div>
          <div className="metric-card">
            <span>{billing.status === "trialing" ? "Trial ends" : "Next billing event"}</span>
            <strong>{trialSetupRequired ? "Awaiting card setup" : trialDateLabel ?? "Managed in portal"}</strong>
          </div>
          <div className="metric-card">
            <span>Cancellation</span>
            <strong>{cancellationDateLabel ?? "Not scheduled"}</strong>
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
          {cancellationDateLabel
            ? `Cancellation is scheduled for ${cancellationDateLabel}. Access remains available until then unless the billing portal shows a different end date.`
            : billing.stripeConfigured
            ? trialSetupRequired
              ? "Add your card to begin the free trial. The first charge is taken automatically when the trial ends unless you cancel before renewal."
              : "Use Billing to manage your subscription, update payment details, or cancel before the next renewal."
            : "Online billing is not live in this workspace yet. Use billing support to coordinate trial setup, cancellation, or plan changes."}
        </p>
        <div className="section-actions">
          {trialSetupRequired && selectedBillingStep ? (
            <button
              className="primary-action"
              type="button"
              disabled={busyPlan !== null || !billing.stripeConfigured}
              onClick={async () => {
                setBusyPlan("checkout");
                setMessage(null);
                try {
                  const response = await createBillingCheckoutSession(props.session.token, {
                    planId: selectedBillingStep.planId,
                    billingCycle: "monthly",
                  });
                  if (response.checkoutUrl) {
                    window.location.href = response.checkoutUrl;
                  } else {
                    setMessage("Online checkout is not available for this workspace yet.");
                  }
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Could not start checkout.");
                } finally {
                  setBusyPlan(null);
                }
              }}
            >
              {busyPlan === "checkout" ? "Opening checkout..." : "Start free trial"}
            </button>
          ) : billing.stripeSubscriptionId ? (
            <button className="primary-action" type="button" onClick={() => navigate("/billing/upgrade")}>
              Upgrade plan
            </button>
          ) : null}
          <button className="secondary-action" type="button" onClick={() => navigate("/pricing")}>
            Compare plans
          </button>
          {billing.stripeConfigured ? (
            <button
              className="secondary-action"
              type="button"
              disabled={!billing.stripeCustomerId || busyPlan !== null}
              onClick={async () => {
                setBusyPlan("portal");
                setMessage(null);
                try {
                  const response = await createBillingPortalSession(props.session.token);
                  if (response.portalUrl) {
                    window.location.href = response.portalUrl;
                  } else {
                    setMessage("The billing portal is not available for this workspace yet.");
                  }
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Could not open billing portal.");
                } finally {
                  setBusyPlan(null);
                }
              }}
            >
              Manage or cancel in billing portal
            </button>
          ) : (
            <button className="secondary-action" type="button" onClick={() => navigate(`${supportPagePath}?subject=${encodeURIComponent("Billing support")}`)}>
              Open billing support
            </button>
          )}
        </div>
        {message ? <div className="error-banner">{message}</div> : null}
        {search.get("upgraded") === "1" ? <div className="success-banner">Plan upgraded. Your new allowance is now active.</div> : null}
      </div>
    </section>
  );
}

function BillingUpgradePage(props: { session: SessionState }) {
  const navigate = useNavigate();
  const billing = props.session.billing;
  const currentIndex = billing
    ? Math.max(0, pricingSliderSteps.findIndex((step) => step.planId === billing.planId && step.documents === billing.monthlyDocumentLimit && step.users === billing.includedUsers))
    : 0;
  const maxIndex = Math.max(0, pricingSliderSteps.length - 1);
  const [sliderIndex, setSliderIndex] = useState(currentIndex);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmedChange, setConfirmedChange] = useState(false);
  const selectedStep = pricingSliderSteps[Math.min(sliderIndex, maxIndex)] ?? pricingSliderSteps[0]!;
  const currentDocuments = billing?.monthlyDocumentLimit ?? 0;
  const currentUsers = billing?.includedUsers ?? 0;
  const isHigherAllowance =
    (selectedStep.documents > currentDocuments || selectedStep.users > currentUsers) &&
    selectedStep.documents >= currentDocuments &&
    selectedStep.users >= currentUsers;
  const staysOnCurrentPlan = selectedStep.planId === billing?.planId;
  const changeActionLabel = staysOnCurrentPlan
    ? "Increase allowance"
    : `Upgrade to ${selectedStep.accessBand}`;
  const selectedAccessTitle = staysOnCurrentPlan
    ? `${selectedStep.accessBand} plan allowance`
    : `${selectedStep.accessBand} access included`;

  if (!billing || !billing.stripeSubscriptionId || !billing.stripeConfigured) {
    return (
      <section className="panel-stack">
        <div className="panel">
          <h2>Upgrade plan</h2>
          <p>Complete billing setup before changing your plan.</p>
          <div className="section-actions">
            <button className="primary-action" type="button" onClick={() => navigate("/billing")}>Back to billing</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-stack upgrade-plan-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Plan change</p>
            <h2>Increase your Exdox allowance</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => navigate("/billing")}>Back to billing</button>
        </div>
        <p className="muted-copy">Choose more users and documents, or move to a higher workflow package when you need additional features. Exdox updates your existing Stripe subscription and applies the new limits immediately. It does not create a second subscription.</p>
      </div>

      <div className="pricing-page-layout upgrade-plan-layout">
        <article className="slider-pricing-card">
          <div className="slider-price-row">
            <strong>{currency(selectedStep.monthlyPrice)}</strong>
            <span>per month</span>
          </div>
          <span className="slider-vat-note">GBP, includes VAT</span>
          <div className="slider-capacity-copy">
            <strong>{selectedStep.documents.toLocaleString()}</strong>
            <span>documents per month</span>
          </div>
          <div className="slider-capacity-copy">
            <strong>{selectedStep.users}</strong>
            <span>users included</span>
          </div>
          <input
            className="pricing-slider"
            type="range"
            min={0}
            max={maxIndex}
            step={1}
            value={Math.min(sliderIndex, maxIndex)}
            onChange={(event) => {
              setSliderIndex(Number(event.target.value));
              setConfirmedChange(false);
            }}
            aria-label="Upgrade allowance slider"
          />
          <div className="slider-bands" aria-hidden="true">
            {["Capture", "Control", "Operations"].map((label) => <span key={label} className={selectedStep.accessBand === label ? "active" : ""}>{label}</span>)}
          </div>
          <p className="slider-helper">Drag the slider to choose your new allowance.</p>
          {isHigherAllowance ? (
            <label className="upgrade-change-confirmation">
              <input
                type="checkbox"
                checked={confirmedChange}
                onChange={(event) => setConfirmedChange(event.target.checked)}
              />
              <span>
                I confirm the subscription will change to {currency(selectedStep.monthlyPrice)} per month. Stripe will calculate and collect any prorated difference for the current billing period. The next full monthly payment will use this new price.
              </span>
            </label>
          ) : null}
          <button
            className="primary-action"
            type="button"
            disabled={!isHigherAllowance || !confirmedChange || busy}
            onClick={async () => {
              setBusy(true);
              setMessage(null);
              try {
                await upgradeBillingPlan(props.session.token, {
                  planId: selectedStep.planId,
                  monthlyDocumentLimit: selectedStep.documents,
                  includedUsers: selectedStep.users,
                });
                window.location.assign("/billing?upgraded=1");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Could not upgrade the plan.");
                setBusy(false);
              }
            }}
          >
            {busy ? "Updating plan..." : !isHigherAllowance ? "Choose a higher allowance" : !confirmedChange ? "Confirm plan change" : changeActionLabel}
          </button>
          {message ? <div className="error-banner">{message}</div> : null}
        </article>
        <aside className="slider-side-stack">
          <article className="slider-info-card">
            <h2>Current allowance</h2>
            <ul className="slider-credit-list">
              <li><strong>{currentDocuments.toLocaleString()}</strong><span>documents per month</span></li>
              <li><strong>{currentUsers}</strong><span>users included</span></li>
              <li><strong>{billing.planLabel ?? billing.planId}</strong><span>current workflow plan</span></li>
            </ul>
          </article>
          <article className="slider-info-card slider-access-card">
            <h2>{selectedAccessTitle}</h2>
            <p>{selectedStep.tagline}</p>
            <div className="slider-access-group">
              <strong>Included workspace areas</strong>
              <div className="slider-access-tags">
                {selectedStep.unlockedWorkspaces.map((workspace) => <span key={workspace}>{workspace}</span>)}
              </div>
            </div>
            <p>Stripe applies this change to the existing subscription, calculates any prorated adjustment now, and keeps the current allowance if payment cannot be completed.</p>
          </article>
        </aside>
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
    analytics: <><path d="M12 3v9h9" /><path d="M20.5 15.5A8.5 8.5 0 1 1 8.5 3.5" /><path d="M14.5 5.5A7.5 7.5 0 0 1 20.5 11.5h-6Z" /></>,
    automation: <><path d="M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.9l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.1l2.8-2.8" /><circle cx="12" cy="12" r="3" /></>,
    costs: <><path d="M6 3h12l2 5-2 5H6L4 8l2-5Z" /><path d="M8 17h8M9 21h6" /></>,
    sales: <><path d="M4 6h16v12H4z" /><path d="m4 9 8 5 8-5" /></>,
    claims: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 13h6M10 17h6" /></>,
    rules: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><path d="M10.5 10.5 13.5 13.5M16 3v4M3 16h4" /></>,
    bank: <><path d="m3 9 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 21h16" /></>,
    contact: <><path d="M4 6h16v12H4z" /><path d="m4 8 8 6 8-6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    billing: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M8 15h4" /></>,
    "open-banking": <><path d="M4 7h16v13H4zM8 4h8l2 3H6l2-3Z" /><path d="M8 11h8M8 15h5" /></>,
  };

  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name] ?? paths.overview}</svg>;
}

function currency(value: number | null, currencyCode = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode,
  }).format(value ?? 0);
}

function receiptCurrency(record: { currency?: string | null }) {
  return record.currency?.trim().toUpperCase() || "GBP";
}

function receiptBaseCurrency(record: { baseCurrency?: string | null }) {
  return record.baseCurrency?.trim().toUpperCase() || "GBP";
}

function hasForeignCurrencyConversion(record: {
  currency?: string | null;
  baseCurrency?: string | null;
  baseTotalAmount?: number | null;
}) {
  return record.baseTotalAmount != null && receiptCurrency(record) !== receiptBaseCurrency(record);
}

function formatLongDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function priceWithVat(value: number) {
  return Number(value.toFixed(2));
}

function sumGross(records: ReceiptRecord[]) {
  return records.reduce((sum, record) => sum + receiptGrossAmount(record), 0);
}

function hasMeaningfulAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 0.0001;
}

function receiptGrossAmount(
  record: {
    totalAmount: number | null;
    subtotalAmount?: number | null;
    totalTaxAmount?: number | null;
    netAmount?: number | null;
    vatAmount?: number | null;
  },
) {
  if (hasMeaningfulAmount(record.totalAmount)) {
    return record.totalAmount ?? 0;
  }
  const subtotal = record.subtotalAmount ?? record.netAmount;
  const tax = record.totalTaxAmount ?? record.vatAmount;
  if (hasMeaningfulAmount(subtotal) || hasMeaningfulAmount(tax)) {
    return Number(((subtotal ?? 0) + (tax ?? 0)).toFixed(2));
  }
  return record.totalAmount ?? 0;
}

function receiptDocumentDate(record: {
  invoiceDate?: string | null;
  createdAt?: string | null;
  description?: string | null;
  rawTextSummary?: string | null;
}) {
  return normalizeSavedDate(record.invoiceDate) ?? inferredReceiptTextDate(record) ?? record.createdAt?.slice(0, 10) ?? "";
}

function inferredReceiptTextDate(record: { description?: string | null; rawTextSummary?: string | null }) {
  const text = `${record.description ?? ""}\n${record.rawTextSummary ?? ""}`;
  const isoMatch = text.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return normalizeParsedDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
  }
  const ukMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-\/.](0?[1-9]|1[0-2])[-\/.](20\d{2})\b/);
  if (ukMatch) {
    return normalizeParsedDateParts(ukMatch[3], ukMatch[2], ukMatch[1]);
  }
  const shortUkMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-\/.](0?[1-9]|1[0-2])[-\/.](\d{2})\b/);
  if (shortUkMatch) {
    return normalizeParsedDateParts(`20${shortUkMatch[3]}`, shortUkMatch[2], shortUkMatch[1]);
  }
  return null;
}

function normalizeSavedDate(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeParsedDateParts(year: string, month: string, day: string) {
  const normalized = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized ? null : normalized;
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

function buildWorkspaceHealthIssues(store: AppStore, limit = 4, includeQualitySignals = true) {
  const allRecords = [...store.costs, ...store.sales, ...store.vault];
  const unreadableCount = allRecords.filter((record) => looksUnreadable(record)).length;
  const processingCount = allRecords.filter((record) => record.status === "Processing").length;
  const duplicateGroups = includeQualitySignals ? buildDuplicateInsights([...store.costs, ...store.sales]).groups.length : 0;
  const pendingReviewCount = allRecords.filter((record) => countsAsManualReview(record)).length;
  const lowConfidenceCount = includeQualitySignals ? allRecords.filter((record) => isLowConfidence(record)).length : 0;
  const issues: Array<{ label: string; detail: string; route: string }> = [];

  if (unreadableCount) {
    issues.push({
      label: `${unreadableCount} unreadable document${unreadableCount === 1 ? "" : "s"}`,
      detail: "These records likely need manual review, re-upload, or a manual entry fallback before publish.",
      route: attentionRouteForIssue("Unreadable"),
    });
  }

  if (processingCount) {
    issues.push({
      label: `${processingCount} document${processingCount === 1 ? "" : "s"} still processing`,
      detail: "Keep an eye on uploads that have not settled into Review, Ready, or Published yet.",
      route: attentionRouteForIssue("Processing"),
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
      route: attentionRouteForIssue("Low confidence"),
    });
  }

  if (pendingReviewCount) {
    issues.push({
      label: `${pendingReviewCount} document${pendingReviewCount === 1 ? " needs" : "s need"} review`,
      detail: "Review-required items are still waiting on tax, review, claim, or publish decisions.",
      route: attentionRouteForIssue("Needs review"),
    });
  }

  return issues.slice(0, limit);
}

function buildCodingGapRecords(store: AppStore) {
  return [...store.costs, ...store.sales]
    .filter((record) => needsCodingAttention(record))
    .sort((left, right) => compareIsoDate(right.updatedAt, left.updatedAt));
}

function buildAttentionRecords(store: AppStore, includeQualitySignals = true) {
  const duplicateGroupsByReceiptId = includeQualitySignals
    ? buildDuplicateInsights([...store.costs, ...store.sales]).byReceiptId
    : null;
  return [...store.costs, ...store.sales, ...store.vault]
    .map((record) => {
      const reasons: string[] = [];
      if (looksUnreadable(record)) reasons.push("Unreadable");
      if (record.status === "Processing") reasons.push("Processing");
      if (duplicateGroupsByReceiptId?.has(record.id)) reasons.push("Possible duplicate");
      if (includeQualitySignals && isLowConfidence(record)) reasons.push("Low confidence");
      if (countsAsManualReview(record)) reasons.push("Needs review");
      if (needsCodingAttention(record)) reasons.push("Missing details");
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

function countsAsManualReview(record: ReceiptRecord) {
  // The workflow status shown in the inbox is the source of truth for review queues.
  // `needsReview` is extraction metadata and can be false even while a record remains in Review.
  return record.workspaceContext !== "vault" && normalizeInboxStatusLabel(record.status) === "Review";
}

function hasInboxStatus(record: ReceiptRecord, status: InboxStatus) {
  return normalizeInboxStatusLabel(record.status) === status;
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
  const hasComponentAmount =
    record.netAmount != null || record.vatAmount != null || record.subtotalAmount != null || record.totalTaxAmount != null;
  const gross = hasComponentAmount || record.totalAmount != null ? receiptGrossAmount(record) : null;
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
  const matchingWorkspaces = [
    store.costs.some(predicate),
    store.sales.some(predicate),
    store.vault.some(predicate),
  ].filter(Boolean).length;
  if (matchingWorkspaces > 1) {
    return `/overview/attention?issue=${encodeURIComponent(issue)}`;
  }
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

function attentionRouteForIssue(issue: "Unreadable" | "Processing" | "Low confidence" | "Needs review") {
  return `/overview/attention?issue=${encodeURIComponent(issue)}`;
}

function parseAttentionIssueFilter(value: string | null): "Unreadable" | "Processing" | "Low confidence" | "Needs review" | null {
  if (value === "Unreadable" || value === "Processing" || value === "Low confidence" || value === "Needs review") {
    return value;
  }
  return null;
}

function buildAttentionItemsForIssue(
  store: AppStore,
  issue: "Unreadable" | "Processing" | "Low confidence" | "Needs review",
) {
  const issueMatches = (records: ReceiptRecord[]) => {
    if (issue === "Unreadable") {
      return records.filter((record) => looksUnreadable(record));
    }
    if (issue === "Processing") {
      return records.filter((record) => record.status === "Processing");
    }
    if (issue === "Low confidence") {
      return records.filter((record) => isLowConfidence(record));
    }
    return records.filter((record) => countsAsManualReview(record));
  };

  const workspaceGroups = [
    { label: "Costs", route: `/costs?issue=${encodeURIComponent(issue)}`, records: issueMatches(store.costs) },
    { label: "Sales", route: `/sales?issue=${encodeURIComponent(issue)}`, records: issueMatches(store.sales) },
    { label: "Vault", route: `/vault?issue=${encodeURIComponent(issue)}`, records: issueMatches(store.vault) },
  ];

  return workspaceGroups
    .filter((group) => group.records.length > 0)
    .map((group) => ({
      title:
        issue === "Processing"
          ? `${group.label} still processing`
          : issue === "Low confidence"
            ? `${group.label} have low-confidence records`
            : issue === "Unreadable"
              ? `${group.label} have unreadable records`
              : `${group.label} need review`,
      detail:
        issue === "Processing"
          ? `${group.records.length} ${group.label.toLowerCase()} document${group.records.length === 1 ? " is" : "s are"} still settling into review.`
          : issue === "Low confidence"
            ? `${group.records.length} ${group.label.toLowerCase()} document${group.records.length === 1 ? " still needs" : " still need"} a closer extraction check.`
            : issue === "Unreadable"
              ? `${group.records.length} ${group.label.toLowerCase()} document${group.records.length === 1 ? " needs" : "s need"} manual fallback or re-upload.`
              : `${group.records.length} ${group.label.toLowerCase()} document${group.records.length === 1 ? " still needs" : "s still need"} review or a publish decision.`,
      route: group.route,
      count: group.records.length,
      countLabel: `${group.records.length} ${group.label.toLowerCase()} ${issue === "Processing" ? "upload" : "review"}${group.records.length === 1 ? "" : "s"}`,
    }));
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
  return "/costs";
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
    return receiptGrossAmount(right) - receiptGrossAmount(left) || compareIsoDate(right.createdAt, left.createdAt);
  }
  if (sortOrder === "lowest_total") {
    return receiptGrossAmount(left) - receiptGrossAmount(right) || compareIsoDate(right.createdAt, left.createdAt);
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

function isVatTrackingEnabled(settings: OrganisationSettings | null | undefined) {
  return settings?.isVatRegistered !== false;
}

function normalizeReceiptForVatExport(receipt: ReceiptRecord, settings: OrganisationSettings | null | undefined) {
  if (isVatTrackingEnabled(settings)) {
    return {
      netAmount: receipt.netAmount,
      vatAmount: receipt.vatAmount,
      totalAmount: receiptGrossAmount(receipt),
      subtotalAmount: receipt.subtotalAmount ?? receipt.netAmount ?? null,
      totalTaxAmount: receipt.totalTaxAmount ?? receipt.vatAmount ?? null,
      taxRateApplied: receipt.taxRateApplied ?? "",
    };
  }

  const grossTotal = receiptGrossAmount(receipt);

  return {
    netAmount: grossTotal,
    vatAmount: 0,
    totalAmount: grossTotal,
    subtotalAmount: grossTotal,
    totalTaxAmount: 0,
    taxRateApplied: "No VAT",
  };
}

function buildInboxExportRows(records: ReceiptRecord[], settings?: OrganisationSettings | null) {
  return records.map((record) => ({
    id: String(record.id),
    workspace: record.workspaceContext,
    status: record.status,
    source: sourceLabel(record.receiptSource),
    document_type: documentTypeLabel(record.documentType),
    supplier: record.vendorName ?? "",
    category: record.category ?? "",
    customer: record.customer ?? "",
    invoice_date: receiptDocumentDate(record),
    due_date: record.dueDate ?? "",
    invoice_number: record.invoiceNumber ?? "",
    net_amount: formatExportNumber(normalizeReceiptForVatExport(record, settings).netAmount),
    vat_amount: formatExportNumber(normalizeReceiptForVatExport(record, settings).vatAmount),
    total_amount: formatExportNumber(normalizeReceiptForVatExport(record, settings).totalAmount),
    original_currency: record.currency ?? "GBP",
    base_currency: record.baseCurrency ?? "GBP",
    base_total_amount: formatExportNumber(record.baseTotalAmount ?? normalizeReceiptForVatExport(record, settings).totalAmount),
    exchange_rate: formatExportNumber(record.exchangeRate ?? null),
    exchange_rate_date: record.exchangeRateDate ?? "",
    exchange_rate_provider: record.exchangeRateProvider ?? "",
    exchange_rate_override: record.exchangeRateOverride ? "yes" : "no",
    subtotal_amount: formatExportNumber(normalizeReceiptForVatExport(record, settings).subtotalAmount),
    total_tax_amount: formatExportNumber(normalizeReceiptForVatExport(record, settings).totalTaxAmount),
    foreign_tax_amount: formatExportNumber(record.foreignTaxAmount ?? null),
    foreign_tax_label: record.foreignTaxLabel ?? "",
    uk_vat_treatment: formatUkVatTreatment(record.ukVatTreatment),
    tax_rate: normalizeReceiptForVatExport(record, settings).taxRateApplied,
    confidence_score: record.confidenceScore == null ? "" : String(record.confidenceScore),
    needs_review: record.needsReview ? "yes" : "no",
    description: record.description ?? "",
    notes: record.rawTextSummary ?? "",
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }));
}

function formatUkVatTreatment(value: ReceiptRecord["ukVatTreatment"]) {
  switch (value) {
    case "no_uk_vat_to_reclaim":
      return "No UK VAT to reclaim";
    case "uk_vat_included":
      return "UK VAT included";
    case "reverse_charge_required":
      return "Reverse charge required";
    case "import_vat":
      return "Import VAT evidence held";
    case "accountant_review":
      return "Accountant review required";
    default:
      return "Not applicable";
  }
}

function buildReceiptSummaryExportRows(receipt: ReceiptRecord, settings?: OrganisationSettings | null) {
  const normalized = normalizeReceiptForVatExport(receipt, settings);
  return [{
    receipt_id: String(receipt.id),
    workspace: receipt.workspaceContext,
    status: receipt.status,
    source: sourceLabel(receipt.receiptSource),
    document_type: documentTypeLabel(receipt.documentType),
    supplier: receipt.vendorName ?? "",
    category: receipt.category ?? "",
    customer: receipt.customer ?? "",
    invoice_date: receiptDocumentDate(receipt),
    due_date: receipt.dueDate ?? "",
    invoice_number: receipt.invoiceNumber ?? "",
    net_amount: formatExportNumber(normalized.netAmount),
    vat_amount: formatExportNumber(normalized.vatAmount),
    total_amount: formatExportNumber(normalized.totalAmount),
    original_currency: receipt.currency ?? "GBP",
    base_currency: receipt.baseCurrency ?? "GBP",
    base_total_amount: formatExportNumber(receipt.baseTotalAmount ?? normalized.totalAmount),
    exchange_rate: formatExportNumber(receipt.exchangeRate ?? null),
    exchange_rate_date: receipt.exchangeRateDate ?? "",
    exchange_rate_provider: receipt.exchangeRateProvider ?? "",
    exchange_rate_override: receipt.exchangeRateOverride ? "yes" : "no",
    subtotal_amount: formatExportNumber(normalized.subtotalAmount),
    total_tax_amount: formatExportNumber(normalized.totalTaxAmount),
    foreign_tax_amount: formatExportNumber(receipt.foreignTaxAmount ?? null),
    foreign_tax_label: receipt.foreignTaxLabel ?? "",
    uk_vat_treatment: formatUkVatTreatment(receipt.ukVatTreatment),
    tax_rate: normalized.taxRateApplied,
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

function buildClaimExportRows(claim: ClaimRecord, receipts: ReceiptRecord[], settings?: OrganisationSettings | null) {
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
    invoice_date: receiptDocumentDate(receipt),
    total_amount: formatExportNumber(normalizeReceiptForVatExport(receipt, settings).totalAmount),
    net_amount: formatExportNumber(normalizeReceiptForVatExport(receipt, settings).netAmount),
    vat_amount: formatExportNumber(normalizeReceiptForVatExport(receipt, settings).vatAmount),
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

function buildMasterExpenseExportRows(rows: MasterExpenseExportRow[]) {
  return rows.map((row) => ({
    employee_name: row.employeeName,
    employee_email: row.employeeEmail,
    approved_claims: String(row.approvedClaimCount),
    approved_receipt_lines: String(row.approvedDocumentCount),
    total_approved: row.totalAmount.toFixed(2),
    currency: row.currency,
  }));
}

function buildEmployeeReimbursementPaymentRows(rows: EmployeeReimbursementPaymentRow[]) {
  return rows.map((employee) => ({
      employee_name: employee.employeeName,
      employee_email: employee.employeeEmail,
      approved_personal_expenses: String(employee.approvedExpenseCount),
      total_reimbursement_due: employee.totalReimbursement.toFixed(2),
      currency: employee.currency,
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

type ProfileSettingsDraft = {
  defaultLandingRoute: string;
  dateFormat: "dd/mm/yyyy" | "yyyy-mm-dd" | "month-day-year";
  compactTables: boolean;
  vaultUploadEmails: boolean;
  reviewAlerts: boolean;
  claimAlerts: boolean;
};

const profileSettingsStorageKey = "exdox-profile-settings";

function profileLandingOptions(session: SessionState) {
  const candidates = [
    { route: "/overview", label: "Overview" },
    { route: "/costs", label: "Costs Inbox" },
    { route: "/sales", label: "Sales Inbox" },
    { route: "/vault", label: "Vault" },
    { route: "/claims", label: "Expense Claims" },
    { route: "/billing", label: "Billing" },
  ];
  return candidates.filter((option) => isRouteAllowed(session, option.route));
}

function loadProfileSettingsDraft(session: SessionState): ProfileSettingsDraft {
  const fallback: ProfileSettingsDraft = {
    defaultLandingRoute: getDefaultRoute(session),
    dateFormat: "dd/mm/yyyy",
    compactTables: false,
    vaultUploadEmails: true,
    reviewAlerts: true,
    claimAlerts: true,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(profileSettingsStorageKey);
    if (!stored) {
      return fallback;
    }
    const parsed = JSON.parse(stored) as Partial<ProfileSettingsDraft>;
    const allowedRoutes = new Set(profileLandingOptions(session).map((option) => option.route));
    return {
      defaultLandingRoute:
        typeof parsed.defaultLandingRoute === "string" && allowedRoutes.has(parsed.defaultLandingRoute)
          ? parsed.defaultLandingRoute
          : fallback.defaultLandingRoute,
      dateFormat:
        parsed.dateFormat === "yyyy-mm-dd" || parsed.dateFormat === "month-day-year" || parsed.dateFormat === "dd/mm/yyyy"
          ? parsed.dateFormat
          : fallback.dateFormat,
      compactTables: Boolean(parsed.compactTables),
      vaultUploadEmails: parsed.vaultUploadEmails !== false,
      reviewAlerts: parsed.reviewAlerts !== false,
      claimAlerts: parsed.claimAlerts !== false,
    };
  } catch {
    return fallback;
  }
}

function saveProfileSettingsDraft(draft: ProfileSettingsDraft) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(profileSettingsStorageKey, JSON.stringify(draft));
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
      candidate_invoice_date: candidate ? receiptDocumentDate(candidate) : "",
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

async function saveBlobAsFile(fileName: string, blob: Blob) {
  if (typeof window === "undefined") {
    return false;
  }

  const saveWindow = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };
  const extensionMatch = fileName.match(/\.[^.]+$/);
  const extension = extensionMatch?.[0] ?? "";

  if (typeof saveWindow.showSaveFilePicker === "function") {
    try {
      const handle = await saveWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: blob.type.includes("csv") ? "CSV file" : "Downloaded file",
          accept: {
            [blob.type || "application/octet-stream"]: extension ? [extension] : [],
          },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(url);
  }, 1500);
  return true;
}

async function downloadCsv(fileName: string, rows: Array<Record<string, string>>) {
  if (!rows.length || typeof window === "undefined") {
    return false;
  }

  const headers = Object.keys(rows[0]!);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  return saveBlobAsFile(fileName, blob);
}

async function downloadFileFromUrl(url: string, fileName: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const startUrlDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
    }, 1500);
    return true;
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Could not download the file.");
    }
    const blob = await response.blob();
    return saveBlobAsFile(fileName, blob);
  } catch {
    return startUrlDownload();
  }
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
      workspaceContext === "sales"
        ? "bank_transfer"
        : workspaceContext === "vault"
          ? "not_applicable"
          : session.user.role === "Standard_Employee"
            ? "cash_personal"
            : "business_card",
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

function vaultStatusLabel(record: ReceiptRecord) {
  return record.workspaceContext === "vault" && record.status === "Ready" && !record.needsReview ? "Processed" : undefined;
}

function claimEmployeeLabel(claim: ClaimRecord) {
  return claim.claimantName || claim.claimantEmail || (claim.createdByUserId ? "Workspace user" : "Employee pending");
}

function formatClaimReference(claim: ClaimRecord) {
  return `CLM-${String(claim.id).padStart(4, "0")}`;
}

function formatClaimHeading(claim: ClaimRecord) {
  return `${customerFacingClaimName(claim.name)} · ${claim.createdAt.slice(0, 10)}`;
}

function formatClaimOptionLabel(claim: ClaimRecord) {
  return `${formatClaimReference(claim)} · ${formatClaimHeading(claim)} · ${claimEmployeeLabel(claim)} (${claimStatusSummary(claim)})`;
}

function customerFacingClaimName(name: string | null | undefined) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return "Expense Claim";
  }
  const normalizedName = trimmedName.replace(/\s+/g, " ").toLowerCase();
  return normalizedName.startsWith("zzz ") ||
    normalizedName.includes("qa live test") ||
    normalizedName.includes("test claim")
    ? "Expense Claim"
    : trimmedName;
}

function pendingClaimsNeedingAction(claims: ClaimRecord[]) {
  return claims.filter((claim) => claim.status === "pending" && (claim.documentCount > 0 || claim.claimType === "mileage"));
}

function claimStatusSummary(claim: ClaimRecord) {
  if (claim.status === "pending" && claim.claimType === "mileage") {
    return "Pending mileage claim";
  }
  return claim.status === "pending" && claim.documentCount === 0
    ? "Draft - no receipts attached"
    : claimStatusLabel(claim.status);
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

function hasSessionFeature(session: SessionState, feature: string) {
  if (session.entitlements?.features) {
    return session.entitlements.features.includes(feature);
  }
  // Approval is available on every current paid/trial plan. Older sessions may not
  // include entitlements, so do not hide a valid workflow while they refresh.
  return isBillingStatusActive(session.billing?.status ?? "inactive");
}

function isRouteAllowed(session: SessionState, pathname: string) {
  if (pathname === "/contact" || pathname.startsWith("/contact/")) {
    return true;
  }

  if (session.user.isOwner && pathname.startsWith("/billing")) {
    return true;
  }

  const allowedRoutes = session.allowedWebRoutes;
  if (!allowedRoutes?.length) {
    return isBusinessAdmin(session)
      ? pathname !== "/dropbox"
      : pathname === "/dropbox" || pathname.startsWith("/claims") || pathname.startsWith("/employee/");
  }

  return allowedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getDefaultRoute(session: SessionState) {
  if (session.user.isOwner && session.billing && !isBillingStatusActive(session.billing.status)) {
    return "/billing";
  }
  const allowedRoutes = session.allowedWebRoutes;
  if (allowedRoutes?.length) {
    const firstAllowed = allowedRoutes.find((route) => route !== "/billing");
    return firstAllowed ?? "/billing";
  }

  return isBusinessAdmin(session) ? "/overview" : "/dropbox";
}

function getAttentionRoute(session: SessionState, store: AppStore) {
  if (session.user.isOwner && session.billing && !isBillingStatusActive(session.billing.status)) {
    return "/billing";
  }
  if (!isBusinessAdmin(session)) {
    if (store.claims.some((claim) => claim.status === "pending")) {
      return "/claims";
    }
    return "/dropbox";
  }
  if (store.costs.some((receipt) => countsAsManualReview(receipt))) {
    return "/costs";
  }
  if (store.sales.some((receipt) => countsAsManualReview(receipt))) {
    return "/sales";
  }
  if (store.vault.some((receipt) => receipt.needsReview || receipt.status === "Processing")) {
    return "/vault";
  }
  if (store.claims.some((claim) => claim.status === "pending")) {
    return "/claims";
  }
  return getDefaultRoute(session);
}

function routeTitle(pathname: string) {
  if (pathname.startsWith("/overview/attention")) {
    return "Attention";
  }
  if (pathname.startsWith("/overview/data-health")) {
    return "Workspace Health";
  }
  if (pathname.startsWith("/overview/integrations")) {
    return "Workflows";
  }
  if (pathname.startsWith("/overview/workflows")) {
    return "Workflows";
  }
  if (pathname.startsWith("/overview/productivity")) {
    return "Workspace Health";
  }
  if (pathname.startsWith("/overview/automation")) {
    return "Automation";
  }
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
  if (pathname.startsWith("/settings")) {
    return "Profile/Settings";
  }
  if (pathname.startsWith("/pricing")) {
    return "Pricing";
  }

  const matched = [...navItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => pathname.startsWith(item.to));
  return matched?.label ?? "Overview";
}

function DropboxDetailRedirect() {
  const params = useParams();
  return <Navigate to={params.id ? `/costs/${params.id}` : "/costs"} replace />;
}

function buildRegisterLink(
  planId: BillingPlanId,
  billingCycle: BillingCycle,
  options?: {
    monthlyDocumentLimit?: number;
    includedUsers?: number;
    audience?: "business" | "sole_trader";
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
  if (options?.audience === "sole_trader") {
    params.set("audience", "sole_trader");
  }
  return `/register?${params.toString()}`;
}

function buildPublicPlanLink(
  session: SessionState | null | undefined,
  planId: BillingPlanId,
  options?: {
    monthlyDocumentLimit?: number;
    includedUsers?: number;
  },
) {
  if (session) {
    return signedInPublicPrimaryRoute(session);
  }
  return buildRegisterLink(planId, "monthly", options);
}

function normalizePublicPlan(value: string | null): BillingPlanId {
  return value === "capture" || value === "control" || value === "operations" || value === "enterprise"
    ? value
    : "control";
}

function isSelfServePlanId(planId: BillingPlanId): planId is "capture" | "control" | "operations" {
  return planId === "capture" || planId === "control" || planId === "operations";
}

function normalizeRegisterPlan(planId: BillingPlanId): BillingPlanId {
  return isSelfServePlanId(planId) ? planId : "control";
}

function normalizePublicBillingCycle(value: string | null): BillingCycle {
  return "monthly";
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

function canPreviewReceiptAsImage(receipt: Pick<ReceiptRecord, "sourceMimeType" | "sourceFilename">) {
  if (receipt.sourceMimeType.toLowerCase().startsWith("image/")) {
    return true;
  }

  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(receipt.sourceFilename);
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

