export type InboxStatus = "Processing" | "Ready" | "Review" | "Published";
export type PaymentMethod =
  | "business_card"
  | "cash_personal"
  | "bank_transfer"
  | "not_applicable";
export type TaxRate =
  | "20% Standard"
  | "5% Reduced"
  | "0% Zero"
  | "Exempt"
  | "No VAT";

export type ReceiptRecord = {
  id: number;
  organisationId: number;
  workspaceContext: "cost" | "sales" | "vault";
  paymentMethod: PaymentMethod;
  claimId: number | null;
  status: InboxStatus;
  category: string | null;
  description: string | null;
  customer: string | null;
  receiptSource: "mobile" | "email" | "web_upload" | "bank_import";
  sourceFilename: string;
  sourceMimeType: string;
  s3Bucket: string;
  s3Key: string;
  locale?: string;
  documentType?: "receipt" | "invoice" | "unknown";
  vendorName: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  invoiceNumber: string | null;
  currency: string | null;
  totalAmount: number | null;
  netAmount: number | null;
  vatAmount: number | null;
  taxRateApplied: string | null;
  subtotalAmount?: number | null;
  totalTaxAmount?: number | null;
  confidenceScore?: number | null;
  confidenceSource?: "model_self_assessment" | "unavailable";
  needsReview: boolean;
  extractionProvider?: string;
  extractionModel?: string;
  lineItems?: Array<{
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
    taxAmount: number | null;
  }>;
  taxBreakdown?: Array<{
    label: string;
    rate: number | null;
    amount: number | null;
  }>;
  notes?: string[];
  rawTextSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimRecord = {
  id: number;
  name: string;
  description: string | null;
  currency: string;
  status: "pending" | "approved" | "paid" | "rejected";
  totalAmount: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: number;
  organisationId?: number;
};

export type SupplierRule = {
  id: number;
  supplierMatchText: string;
  category: string;
  taxRate: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
};

export type ReconciliationCandidate = {
  id: number;
  vendorName: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  status: InboxStatus;
  category: string | null;
  receiptSource: ReceiptRecord["receiptSource"];
  matchScore: number;
};

export type ReconciliationLine = {
  id: number;
  transactionId: string;
  bookingDate: string;
  remittanceInformation: string;
  transactionAmount: number;
  statementDate?: string;
  description?: string;
  amountSpent?: number;
  status: "Open" | "Audited";
  matchedReceiptId: number | null;
  candidates: ReconciliationCandidate[];
};

export type BankRequisition = {
  id: number;
  provider: string;
  externalRequisitionId: string;
  institutionId: string | null;
  status: "pending" | "linked" | "failed";
  redirectUrl: string;
  callbackState: string;
};

export type OrganisationSettings = {
  organisationId: number;
  organisationName: string;
  isVatRegistered: boolean;
  defaultTaxRate: string;
};

export type InviteResult = {
  userId: number;
  email: string;
  fullName: string | null;
  role: "Business_Admin" | "Standard_Employee";
  status: "pending_invite" | "active";
  organisationId: number;
  inviteLink: string;
  delivery?: {
    delivered: boolean;
    method: string;
  };
};

export type SessionUser = {
  id: number;
  organisationId: number;
  email: string;
  fullName: string | null;
  role: "Business_Admin" | "Standard_Employee";
  status: "pending_invite" | "active";
};

export type SessionState = {
  token: string;
  user: SessionUser;
  organisations: Array<{ id: number; name: string }>;
  activeOrganisationId: number;
  allowedWebRoutes?: string[];
  billing?: BillingSummary;
  entitlements?: {
    features: string[];
    lockedRoutes: string[];
  };
};

export type BillingPlanId = "capture" | "control" | "operations" | "enterprise" | "legacy";
export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "inactive" | "legacy";
export type BillingCycle = "monthly" | "annual" | "custom";

export type BillingSummary = {
  planId: BillingPlanId;
  planLabel?: string;
  status: BillingStatus;
  billingCycle: BillingCycle;
  trialEndsAt: string | null;
  monthlyDocumentLimit: number | null;
  monthlyDocumentUsage: number;
  includedUsers: number | null;
  currentUserCount: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeConfigured: boolean;
};

export type BillingPlanDefinition = {
  id: BillingPlanId;
  label: string;
  monthlyDocumentLimit: number | null;
  includedUsers: number | null;
  routes: string[];
  features: string[];
  trialDays: number | null;
  highlight?: string;
};
