export type InboxStatus = "Processing" | "Ready" | "Review" | "Published" | "Payment processing" | "Paid" | "Rejected";
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
  mileageClaimId?: number | null;
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
  status: "pending" | "approved" | "published" | "payment_processing" | "paid" | "rejected";
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

export type RecycleBinItem = {
  id: string;
  itemType: "receipt" | "claim";
  itemId: number;
  title: string;
  workspaceContext: "cost" | "sales" | "vault" | null;
  deletedByUserId: number;
  deletedAt: string;
  purgeAfter: string;
};

export type ClaimEvidence = {
  id: string;
  organisationId: number;
  claimId: number;
  sourceFilename: string;
  sourceMimeType: string;
  createdAt: string;
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
  workspaceContext: "cost" | "sales";
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
  mileageRate: number;
};

export type XeroIntegrationStatus = {
  configured: boolean;
  connected: boolean;
  tenantId: string | null;
  tenantName: string | null;
  connectedAt: string | null;
  availableTenants: Array<{ tenantId: string; tenantName: string }>;
};

export type XeroIntegrationSettings = {
  purchaseAccountCode: string | null;
  salesAccountCode: string | null;
  purchaseTaxType: string | null;
  salesTaxType: string | null;
  purchaseStatus: "DRAFT" | "SUBMITTED" | "AUTHORISED";
  salesStatus: "DRAFT" | "SUBMITTED" | "AUTHORISED";
  publishAttachments: boolean;
};

export type XeroReferenceData = {
  accounts: Array<{ accountId: string; code: string; name: string; type: string }>;
  bankAccounts: Array<{ accountId: string; code: string; name: string; type: string }>;
  taxRates: Array<{ name: string; taxType: string; canApplyToExpenses: boolean; canApplyToRevenue: boolean }>;
  trackingCategories: Array<{ trackingCategoryId: string; name: string; options: Array<{ trackingOptionId: string; name: string }> }>;
  contacts: Array<{ contactId: string; name: string; emailAddress: string | null; isSupplier: boolean; isCustomer: boolean }>;
  items: Array<{ itemId: string; code: string; name: string; isSold: boolean; isPurchased: boolean }>;
  currencies: Array<{ code: string; description: string }>;
  users: Array<{ userId: string; name: string; emailAddress: string | null; isSubscriber: boolean }>;
  settings: XeroIntegrationSettings;
  refreshedAt: string;
};

export type XeroPublication = {
  sourceType: "receipt" | "sales_document" | "claim";
  sourceId: string;
  xeroType: string;
  xeroId: string;
  xeroNumber: string | null;
  publishedAt: string;
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
    messageId?: string | null;
  };
};

export type InviteResendResult = {
  userId: number;
  email: string;
  delivery: {
    delivered: boolean;
    method: string;
    messageId?: string | null;
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

export type SalesCustomer = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  companyNumber: string | null;
  vatNumber: string | null;
  paymentTermsDays: number;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SalesLineItem = { description: string; quantity: number; unitPrice: number; taxRate: number; netAmount: number; taxAmount: number; totalAmount: number };
export type SalesPayment = { id: string; amount: number; paidAt: string; method: string; reference: string | null; createdAt: string };
export type SalesDocument = {
  id: string;
  kind: "invoice" | "quote" | "credit_note";
  number: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  status: "draft" | "issued" | "accepted" | "declined" | "part_paid" | "paid" | "void";
  notes: string | null;
  linkedDocumentId: string | null;
  lineItems: SalesLineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  payments: SalesPayment[];
  xeroId?: string | null;
  xeroNumber?: string | null;
  xeroPublishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SalesSubmission = {
  id: string;
  channel: "web" | "mobile" | "email" | "native";
  sourceFilename: string;
  splitMode: "single_document" | "one_document_per_page" | "auto_detect";
  status: "processing" | "completed" | "duplicate" | "failed";
  receiptIds: number[];
  message: string | null;
  createdAt: string;
};
export type SalesSubmissionAddress = { address: string; token: string; createdAt: string; updatedAt: string };
export type SalesWorkspace = { customers: SalesCustomer[]; documents: SalesDocument[]; submissions: SalesSubmission[]; submissionAddress: SalesSubmissionAddress };
