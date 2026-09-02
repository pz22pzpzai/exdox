export type InboxStatus = "Processing" | "Ready" | "Review" | "Published" | "Payment processing" | "Paid";
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
  uploadedByUserId?: number;
  uploadedByName?: string | null;
  uploadedByEmail?: string | null;
  uploadedByDepartmentId?: number | null;
  uploadedByDepartmentName?: string | null;
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
  baseCurrency?: string;
  exchangeRate?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateProvider?: string | null;
  baseTotalAmount?: number | null;
  exchangeRateOverride?: boolean;
  exchangeRateNote?: string | null;
  totalAmount: number | null;
  netAmount: number | null;
  vatAmount: number | null;
  taxRateApplied: string | null;
  subtotalAmount?: number | null;
  totalTaxAmount?: number | null;
  foreignTaxAmount?: number | null;
  foreignTaxLabel?: string | null;
  ukVatTreatment?:
    | "not_applicable"
    | "no_uk_vat_to_reclaim"
    | "uk_vat_included"
    | "reverse_charge_required"
    | "import_vat"
    | "accountant_review";
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
  claimType?: "standard" | "mileage";
  mileageStartPostcode?: string | null;
  mileageEndPostcode?: string | null;
  mileageTotalMiles?: number | null;
  mileageRate?: number | null;
  mileageTotalAmount?: number | null;
  claimantName?: string | null;
  claimantEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: number;
  organisationId?: number;
};

export type MasterExpenseExportRow = {
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  approvedClaimCount: number;
  approvedDocumentCount: number;
  totalAmount: number;
  currency: string;
};

export type EmployeeReimbursementPaymentRow = {
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  approvedExpenseCount: number;
  totalReimbursement: number;
  currency: string;
};

export type SupplierRule = {
  id: number;
  supplierMatchText: string;
  category: string;
  taxRate: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
};

export type CompanyCard = {
  id: number;
  label: string;
  cardNetwork: string | null;
  cardIssuer: string | null;
  lastFour: string;
  isActive: boolean;
};

export type CompanyCardEmployeeException = {
  id: number;
  companyCardId: number;
  employeeUserId: number;
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
  baseCurrency: string;
  isVatRegistered: boolean;
  defaultTaxRate: string;
};

export type InviteResult = {
  userId: number;
  email: string;
  fullName: string | null;
  role: "Business_Admin" | "Standard_Employee";
  status: "pending_invite" | "pending_confirmation" | "active";
  organisationId: number;
  inviteLink: string;
  delivery?: {
    delivered: boolean;
    method: string;
  };
};

export type Department = {
  id: number;
  organisationId: number;
  name: string;
  managerUserId: number | null;
  managerName?: string | null;
};

export type TeamMember = {
  id: number;
  organisationId: number;
  email: string;
  fullName: string | null;
  role: "Business_Admin" | "Standard_Employee";
  status: "pending_invite" | "pending_confirmation" | "active";
  departmentId: number | null;
  departmentName: string | null;
  invitedByUserId: number | null;
};

export type SessionUser = {
  id: number;
  organisationId: number;
  email: string;
  fullName: string | null;
  role: "Business_Admin" | "Standard_Employee";
  status: "pending_invite" | "pending_confirmation" | "active";
  isOwner?: boolean;
  emailConfirmationDueAt?: string | null;
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
  cancellationScheduledFor: string | null;
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
