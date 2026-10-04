import type {
  BillingCycle,
  BillingPlanDefinition,
  BillingPlanId,
  BillingSummary,
  BankRequisition,
  ClaimEvidence,
  ClaimRecord,
  EmployeeReimbursementPaymentRow,
  Department,
  MasterExpenseExportRow,
  InviteResult,
  InviteResendResult,
  TeamMember,
  OrganisationSettings,
  ReceiptRecord,
  RecycleBinItem,
  ReconciliationLine,
  SessionUser,
  SessionState,
  SupplierRule,
  CompanyCard,
  CompanyCardEmployeeException,
  SalesCustomer,
  SalesDocument,
  SalesWorkspace,
  XeroIntegrationStatus,
  XeroIntegrationSettings,
  XeroReferenceData,
  XeroPublication,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_EXDOX_API_BASE_URL?.replace(/\/$/, "") ||
  "https://hz2zkm6jkf.execute-api.eu-west-2.amazonaws.com/prod";
const SESSION_STORAGE_KEY = "exdox-auth-session-v1";

export type AccountingAccount = { id: string; code: string; name: string; type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'; system?: boolean; bank?: boolean };
export type AccountingLine = { accountId: string; debitPence: number; creditPence: number };
export type AccountingEntry = { id: string; date: string; reference: string; description: string; lines: AccountingLine[]; createdAt: string; createdBy: string };
export type AccountingBalance = AccountingAccount & { debitPence: number; creditPence: number; balancePence: number };
export type AccountingVatCode = 'S20' | 'S5' | 'S0' | 'SE' | 'P20' | 'P5' | 'P0' | 'PE';
export type AccountingDocument = { id: string; draftId?: string; contactId?: string; kind: 'invoice' | 'bill'; number: string; contactName: string; issuerName: string; issuerAddress: string; contactAddress: string; vatNumber: string; paymentInstructions: string; date: string; taxDate?: string; dueDate: string; items: Array<{ description: string; quantity: number; unitPricePence: number; vatRate: 0 | 5 | 20; vatCode?: AccountingVatCode }>; netPence: number; vatPence: number; totalPence: number; createdAt: string; createdBy: string };
export type AccountingContact = { id: string; version: number; role: 'customer' | 'supplier' | 'both'; name: string; email: string; address: string; updatedAt: string; updatedBy: string };
export type AccountingDraft = { id: string; version: number; contactId: string; document: Omit<AccountingDocument, 'id' | 'createdAt' | 'createdBy'>; updatedAt: string; updatedBy: string };
export type AccountingRecurrence = { id: string; sourceDraftId: string; kind: 'invoice' | 'bill'; label: string; frequency: 'weekly' | 'monthly'; dayOfMonth: number; nextDate: string; dueDays: number; numberPrefix: string; paused: boolean; lastError?: string; createdAt: string; createdBy: string };
export type AccountingAgingBucket = 'current' | 'days1to30' | 'days31to60' | 'days61to90' | 'days91plus' | 'credit';
export type AccountingAgingRow = { documentId: string; number: string; contactName: string; issueDate: string; dueDate: string; originalPence: number; outstandingPence: number; daysOverdue: number; bucket: AccountingAgingBucket };
export type AccountingAgingSide = { rows: AccountingAgingRow[]; buckets: Record<AccountingAgingBucket, number>; documentBalancePence: number; ledgerBalancePence: number; differencePence: number };
export type AccountingAgingReport = { asOf: string; receivables: AccountingAgingSide; payables: AccountingAgingSide };
export type AccountingEmailRecord = { id: string; documentId: string; recipient: string; kind: 'invoice' | 'reminder'; milestoneDay?: number; status: 'pending' | 'accepted' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'rejected' | 'uncertain'; requestedAt: string; acceptedAt?: string; deliveredAt?: string; messageId?: string };
export type AccountingReminderSettings = { enabled: boolean; days: number[]; replyToEmail: string; excludedDocumentIds: string[]; updatedAt: string; updatedBy: string };
export type AccountingInvoiceLink = { documentId: string; url: string };
export type AccountingInvoicePaymentException = { documentId: string; receivedPence: number; duePence: number; reason: string };
export type AccountingAudit = { id: string; action: string; subjectId: string; detail: string; at: string; by: string };
export type AccountingSettlement = { id: string; kind: 'invoice' | 'bill'; bankAccountId?: string; date: string; reference: string; allocations: Array<{ documentId: string; amountPence: number }>; totalPence: number; createdAt: string; createdBy: string };
export type AccountingRefund = { id: string; creditId: string; bankAccountId?: string; date: string; reference: string; amountPence: number; createdAt: string; createdBy: string };
export type AccountingPayment = { id: string; documentId: string; bankAccountId?: string; date: string; amountPence: number; reference: string; createdAt: string; createdBy: string };
export type AccountingStatementLine = { index: number; date: string; description: string; reference: string; amountPence: number };
export type AccountingBankStatement = { id: string; accountId?: string; name: string; openingPence: number; closingPence: number; fromDate: string; toDate: string; lines: AccountingStatementLine[]; importedAt: string; importedBy: string };
export type AccountingBankMatch = { statementId: string; lineIndex: number; bankEntryId: string; amountPence: number; matchedAt: string; matchedBy: string };
export type AccountingFeedTransaction = { id: string; connectionId: string; remoteAccountId: string; localAccountId: string; providerTransactionId: string; date: string; description: string; amountPence: number; importedAt: string };
export type AccountingFeedMatch = { transactionId: string; bankEntryId: string; matchedAt: string; matchedBy: string };
export type AccountingFeedStatus = { configured: boolean; environment: 'sandbox' | 'production'; connectionState: 'not_connected' | 'authorization_pending' | 'connected' | 'reconnect_required' | 'temporarily_unavailable'; accounts: Array<{ id: string; currency: string; label: string }>; mappings: Array<{ remoteId: string; localId: string; label: string; lastSyncedAt?: string }>; pending: boolean; pendingRequest?: { remoteId: string; localId: string; from: string; to: string } };
export type AccountingBankRule = { id: string; version: number; accountId: string; contains: string; direction: 'in' | 'out' | 'both'; counterAccountId: string; enabled: boolean; createdAt: string; createdBy: string };
export type AccountingMatchSuggestion = { statementId: string; lineIndex: number; bankEntryId: string; score: number; reason: string };
export type AccountingRuleSuggestion = { statementId: string; lineIndex: number; ruleId: string; counterAccountId: string };
export type AccountingPeriodLock = { id: string; lockedThrough: string; reason: string; createdAt: string; createdBy: string };
export type AccountingReversal = { targetEntryId: string; date: string; reason: string; createdAt: string; createdBy: string };
export type AccountingCreditNote = { id: string; documentId: string; number: string; date: string; reason: string; items: Array<{ itemIndex: number; quantity: number }>; netPence: number; vatPence: number; totalPence: number; createdAt: string; createdBy: string };
export type AccountingSourcePosting = { id: string; sourceType: 'receipt'; sourceId: number; workspaceContext: 'cost' | 'sales'; sourceUpdatedAt: string; date: string; taxDate?: string; vatCode?: AccountingVatCode; description: string; reference: string; netPence: number; vatPence: number; totalPence: number; createdAt: string; createdBy: string };
export type AccountingSourceCandidate = { id: number; workspaceContext: 'cost' | 'sales'; status: string; date: string; description: string; totalAmount: number | null; netAmount: number | null; vatAmount: number | null; reference: string | null; eligible: boolean; reason: string | null; postedAt: string | null; sourceChangedAfterPosting: boolean };
export type AccountingVatBoxes = { box1: number; box2: number; box3: number; box4: number; box5: number; box6: number; box7: number; box8: number; box9: number };
export type AccountingVatRow = { id: string; entryId: string; taxDate: string; reference: string; description: string; code: string; boxes: Omit<AccountingVatBoxes, 'box3' | 'box5'> };
export type AccountingVatIssue = { entryId: string; date: string; reference: string; description: string; reason: string };
export type AccountingVatReport = { fromDate: string; toDate: string; boxes: AccountingVatBoxes; rows: AccountingVatRow[]; issues: AccountingVatIssue[]; ready: boolean; digest: string };
export type AccountingVatClose = { id: string; fromDate: string; toDate: string; boxes: AccountingVatBoxes; digest: string; rowCount: number; closedAt: string; closedBy: string };
export type AccountingVatFilingPreview = { fromDate: string; toDate: string; sourceDigest: string; closedAt: string | null; internallyReady: boolean; blockers: string[]; fields: { vatDueSales: number; vatDueAcquisitions: number; totalVatDue: number; vatReclaimedCurrPeriod: number; netVatDue: number; totalValueSalesExVAT: number; totalValuePurchasesExVAT: number; totalValueGoodsSuppliedExVAT: number; totalAcquisitionsExVAT: number }; submissionAvailable: false; connectionMessage: string };
export type AccountingHmrcStatus = { environment: 'sandbox'; configured: boolean; connected: boolean; connectionState: 'not_connected' | 'connected' | 'reconnect_required' | 'temporarily_unavailable'; connectedAt: string | null; redirectUri: string; obligationsAvailable: false; submissionAvailable: false };
export type AccountingData = { accounts: AccountingAccount[]; entries: AccountingEntry[]; documents: AccountingDocument[]; drafts: AccountingDraft[]; contacts: AccountingContact[]; recurrences: AccountingRecurrence[]; emailRecords: AccountingEmailRecord[]; reminderSettings: AccountingReminderSettings; invoiceLinks: AccountingInvoiceLink[]; invoicePaymentExceptions: AccountingInvoicePaymentException[]; audit: AccountingAudit[]; payments: AccountingPayment[]; settlements: AccountingSettlement[]; refunds: AccountingRefund[]; creditNotes: AccountingCreditNote[]; reversals: AccountingReversal[]; sourcePostings: AccountingSourcePosting[]; periodLocks: AccountingPeriodLock[]; lockedThrough: string | null; bankStatements: AccountingBankStatement[]; bankMatches: AccountingBankMatch[]; feedTransactions: AccountingFeedTransaction[]; feedMatches: AccountingFeedMatch[]; bankRules: AccountingBankRule[]; bankSuggestions: AccountingMatchSuggestion[]; ruleSuggestions: AccountingRuleSuggestion[]; report: { balances: AccountingBalance[]; profitPence: number; assetsPence: number; liabilitiesPence: number; equityPence: number; journalCount: number } };

export type PublicAccountingInvoice = { document: Pick<AccountingDocument, 'number' | 'contactName' | 'issuerName' | 'issuerAddress' | 'contactAddress' | 'vatNumber' | 'paymentInstructions' | 'date' | 'taxDate' | 'dueDate' | 'items' | 'netPence' | 'vatPence' | 'totalPence'>; outstandingPence: number; canPay: boolean };
export const accountingInvoicePdfUrl = (token: string) => `${API_BASE_URL}/accounting/invoice/${encodeURIComponent(token)}/pdf`;
async function publicAccountingFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, cache: 'no-store', referrerPolicy: 'no-referrer' });
  const result = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(result.message || 'Invoice request failed.');
  return result;
}
export async function getPublicAccountingInvoice(token: string): Promise<PublicAccountingInvoice> {
  const result = await publicAccountingFetch<PublicAccountingInvoice>(`/accounting/invoice/${encodeURIComponent(token)}`);
  return result;
}
export async function startPublicAccountingInvoiceCheckout(token: string): Promise<string> {
  const result = await publicAccountingFetch<{ url: string }>(`/accounting/invoice/${encodeURIComponent(token)}/checkout`, { method: 'POST' });
  return result.url;
}
export async function saveAccountingInvoiceLink(token: string, documentId: string, action: 'create' | 'revoke'): Promise<string | null> {
  const result = await apiFetch<{ url: string | null }>('/accounting/invoice-links', token, { method: 'POST', body: JSON.stringify({ documentId, action }) });
  return result.url;
}
export async function getAccountingInvoicePaymentConnection(token: string): Promise<{ configured: boolean; connected: boolean; accountReady: boolean; eventsReady: boolean; ready: boolean }> {
  return apiFetch('/accounting/invoice-payment-connection', token);
}
export async function startAccountingInvoicePaymentConnection(token: string): Promise<string> {
  const result = await apiFetch<{ url: string }>('/accounting/invoice-payment-connection', token, { method: 'POST' });
  return result.url;
}
export async function resolveAccountingInvoicePaymentReview(token: string, documentId: string, resolution: string): Promise<void> {
  await apiFetch('/accounting/invoice-payment-reviews', token, { method: 'POST', body: JSON.stringify({ documentId, resolution, confirm: true }) });
}

export function getAccounting(token: string): Promise<AccountingData> {
  return apiFetch('/accounting', token);
}
export async function getAccountingAging(token: string, asOf: string): Promise<AccountingAgingReport> {
  const result = await apiFetch<{ report: AccountingAgingReport }>(`/accounting/aging?asOf=${encodeURIComponent(asOf)}`, token);
  return result.report;
}
export async function addAccountingAccount(token: string, payload: Pick<AccountingAccount, 'code' | 'name' | 'type'> & { bank?: boolean }): Promise<AccountingAccount> {
  const result = await apiFetch<{ account: AccountingAccount }>('/accounting/accounts', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.account;
}
export async function postAccountingJournal(token: string, payload: Pick<AccountingEntry, 'date' | 'reference' | 'description' | 'lines'>): Promise<AccountingEntry> {
  const result = await apiFetch<{ entry: AccountingEntry }>('/accounting/journals', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.entry;
}
export async function postAccountingDocument(token: string, payload: Pick<AccountingDocument, 'kind' | 'number' | 'contactName' | 'issuerName' | 'issuerAddress' | 'contactAddress' | 'vatNumber' | 'paymentInstructions' | 'date' | 'dueDate' | 'items'> & { taxDate: string }): Promise<AccountingDocument> {
  const result = await apiFetch<{ document: AccountingDocument }>('/accounting/documents', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.document;
}
export async function saveAccountingContact(token: string, payload: { id?: string; version?: number; role: AccountingContact['role']; name: string; email: string; address: string }): Promise<AccountingContact> {
  const result = await apiFetch<{ contact: AccountingContact }>('/accounting/contacts', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.contact;
}
export async function saveAccountingDraft(token: string, payload: Record<string, unknown>): Promise<AccountingDraft> {
  const result = await apiFetch<{ draft: AccountingDraft }>('/accounting/drafts', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.draft;
}
export async function saveAccountingRecurrence(token: string, payload: Record<string, unknown>): Promise<AccountingRecurrence> {
  const result = await apiFetch<{ schedule: AccountingRecurrence }>('/accounting/recurrences', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.schedule;
}
export async function approveAccountingDraft(token: string, draftId: string, version: number): Promise<AccountingDocument> {
  const result = await apiFetch<{ document: AccountingDocument }>('/accounting/drafts/approve', token, { method: 'POST', body: JSON.stringify({ draftId, version }) });
  return result.document;
}
export async function sendAccountingInvoice(token: string, documentId: string, recipient: string, requestId: string): Promise<void> {
  await apiFetch('/accounting/documents/send', token, { method: 'POST', body: JSON.stringify({ documentId, recipient, requestId, confirm: true }) });
}
export async function saveAccountingReminderSettings(token: string, payload: { enabled: boolean; days: number[]; replyToEmail: string } | { action: 'exclude' | 'include'; documentId: string }): Promise<AccountingReminderSettings> {
  const result = await apiFetch<{ settings: AccountingReminderSettings }>('/accounting/reminder-settings', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.settings;
}
export async function postAccountingSettlement(token: string, payload: { requestId?: string; kind: 'invoice' | 'bill'; bankAccountId?: string; date: string; reference: string; allocations: Array<{ documentId: string; amountPence: number }> }): Promise<AccountingSettlement> {
  const result = await apiFetch<{ settlement: AccountingSettlement }>('/accounting/settlements', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.settlement;
}
export async function postAccountingRefund(token: string, payload: { requestId?: string; creditId: string; bankAccountId?: string; date: string; reference: string; amountPence: number }): Promise<AccountingRefund> {
  const result = await apiFetch<{ refund: AccountingRefund }>('/accounting/refunds', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.refund;
}
export async function postAccountingPayment(token: string, payload: { requestId?: string; documentId: string; bankAccountId?: string; date: string; amountPence: number; reference: string }): Promise<AccountingPayment> {
  const result = await apiFetch<{ payment: AccountingPayment }>('/accounting/payments', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.payment;
}
export async function importAccountingBankStatement(token: string, payload: { accountId: string; name: string; openingPence: number; closingPence: number; lines: Array<Omit<AccountingStatementLine, 'index'>> }): Promise<{ statement: AccountingBankStatement; alreadyImported: boolean }> {
  return apiFetch('/accounting/bank-statements', token, { method: 'POST', body: JSON.stringify(payload) });
}
export function getAccountingFeedStatus(token: string): Promise<AccountingFeedStatus> { return apiFetch('/accounting/bank-feed', token); }
export async function startAccountingFeedConnect(token: string): Promise<string> {
  const result = await apiFetch<{ authorizationUrl: string }>('/accounting/bank-feed/connect', token, { method: 'POST' });
  return result.authorizationUrl;
}
export function syncAccountingFeed(token: string, payload: { remoteAccountId: string; localAccountId: string; from: string; to: string }): Promise<{ status: 'pending' | 'complete'; imported: number }> {
  return apiFetch('/accounting/bank-feed/sync', token, { method: 'POST', body: JSON.stringify(payload) });
}
export async function matchAccountingFeed(token: string, payload: { transactionId: string; bankEntryId: string }): Promise<void> {
  await apiFetch('/accounting/bank-feed/matches', token, { method: 'POST', body: JSON.stringify(payload) });
}
export async function unmatchAccountingFeed(token: string, transactionId: string): Promise<void> {
  await apiFetch('/accounting/bank-feed/matches', token, { method: 'DELETE', body: JSON.stringify({ transactionId }) });
}
export async function saveAccountingBankRule(token: string, payload: Partial<AccountingBankRule> & Pick<AccountingBankRule, 'accountId' | 'contains' | 'direction' | 'counterAccountId' | 'enabled'>): Promise<AccountingBankRule> {
  const result = await apiFetch<{ rule: AccountingBankRule }>('/accounting/bank-rules', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.rule;
}
export async function postAccountingBankRule(token: string, payload: { statementId: string; lineIndex: number; ruleId: string }): Promise<void> {
  await apiFetch('/accounting/bank-rules/post', token, { method: 'POST', body: JSON.stringify(payload) });
}
export async function postAccountingBankTransfer(token: string, payload: { requestId?: string; fromAccountId: string; toAccountId: string; date: string; amountPence: number; reference: string }): Promise<void> {
  await apiFetch('/accounting/bank-transfers', token, { method: 'POST', body: JSON.stringify(payload) });
}
export async function matchAccountingBankLine(token: string, payload: { statementId: string; lineIndex: number; bankEntryId: string }): Promise<AccountingBankMatch> {
  const result = await apiFetch<{ match: AccountingBankMatch }>('/accounting/bank-matches', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.match;
}
export async function unmatchAccountingBankLine(token: string, payload: { statementId: string; lineIndex: number }): Promise<void> {
  await apiFetch('/accounting/bank-matches', token, { method: 'DELETE', body: JSON.stringify(payload) });
}
export async function closeAccountingPeriod(token: string, payload: { lockedThrough: string; reason: string }): Promise<AccountingPeriodLock> {
  const result = await apiFetch<{ lock: AccountingPeriodLock }>('/accounting/period-locks', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.lock;
}
export async function reverseAccountingEntry(token: string, payload: { entryId: string; date: string; reason: string }): Promise<AccountingReversal> {
  const result = await apiFetch<{ reversal: AccountingReversal }>('/accounting/reversals', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.reversal;
}
export async function postAccountingCreditNote(token: string, payload: { documentId: string; number: string; date: string; reason: string; items: Array<{ itemIndex: number; quantity: number }> }): Promise<AccountingCreditNote> {
  const result = await apiFetch<{ credit: AccountingCreditNote }>('/accounting/credit-notes', token, { method: 'POST', body: JSON.stringify(payload) });
  return result.credit;
}
export async function listAccountingSourceCandidates(token: string): Promise<AccountingSourceCandidate[]> {
  const result = await apiFetch<{ candidates: AccountingSourceCandidate[] }>('/accounting/source-candidates', token);
  return result.candidates;
}
export async function postAccountingSource(token: string, receiptId: number, vatCode: AccountingVatCode, taxDate: string): Promise<{ posting: AccountingSourcePosting; alreadyPosted: boolean }> {
  return apiFetch('/accounting/source-postings', token, { method: 'POST', body: JSON.stringify({ receiptId, vatCode, taxDate, confirmNoDuplicate: true }) });
}
export async function getAccountingVatReport(token: string, fromDate: string, toDate: string): Promise<{ report: AccountingVatReport; closes: AccountingVatClose[]; filingPreview: AccountingVatFilingPreview }> {
  return apiFetch(`/accounting/vat?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`, token);
}
export async function getAccountingHmrcStatus(token: string): Promise<AccountingHmrcStatus> {
  return apiFetch('/accounting/hmrc/status', token);
}
export async function startAccountingHmrcConnect(token: string): Promise<string> {
  const result = await apiFetch<{ authorizationUrl: string }>('/accounting/hmrc/connect', token, { method: 'POST' });
  return result.authorizationUrl;
}
export async function classifyAccountingVat(token: string, payload: { entryId: string; taxDate: string; reason: string; boxes: Omit<AccountingVatBoxes, 'box3' | 'box5'> }): Promise<void> {
  await apiFetch('/accounting/vat-classifications', token, { method: 'POST', body: JSON.stringify(payload) });
}
export async function closeAccountingVatPeriod(token: string, fromDate: string, toDate: string): Promise<AccountingVatClose> {
  const result = await apiFetch<{ close: AccountingVatClose }>('/accounting/vat-closes', token, { method: 'POST', body: JSON.stringify({ fromDate, toDate, standardAccrualConfirmed: true }) });
  return result.close;
}

type AuthResponse =
  | {
      success: true;
      requiresTwoFactor: true;
      emailEnabled: boolean;
      authenticatorEnabled: boolean;
      message: string;
    }
  | {
      success: true;
      token: string;
      user: SessionState["user"];
      requiresEmailConfirmation?: false;
      emailConfirmationRequired?: boolean;
      emailConfirmationDueAt?: string | null;
    }
  | {
      success: true;
      requiresEmailConfirmation: true;
      message: string;
      user: SessionState["user"];
      checkoutUrl?: string | null;
    }
  | {
      success: true;
      requiresBillingCheckout: true;
      message: string;
      user: SessionState["user"];
      checkoutUrl?: string | null;
    }
  | {
      success: false;
      message?: string;
    };

export type RegisterResult =
  | {
      kind: "confirmed";
      session: SessionState;
      sessionHydrated: boolean;
    }
  | {
      kind: "pending_confirmation";
      message: string;
      email: string;
      checkoutUrl: string | null;
    };

export type LoginResult =
  | {
      kind: "two_factor";
      emailEnabled: boolean;
      authenticatorEnabled: boolean;
      message: string;
    }
  | {
      kind: "confirmed";
      session: SessionState;
      sessionHydrated: boolean;
    }
  | {
      kind: "pending_confirmation";
      message: string;
      email: string;
      checkoutUrl: string | null;
    }
  | {
      kind: "billing_required";
      message: string;
      email: string;
      checkoutUrl: string | null;
    };

export function loadStoredSession(): SessionState | null {
  const localStorageValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
  const legacySessionStorageValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  const raw = localStorageValue ?? legacySessionStorageValue;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionState;
    if (!localStorageValue && legacySessionStorageValue) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, legacySessionStorageValue);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session: SessionState) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function loginWithEmail(input: { email: string; password: string; twoFactorCode?: string; twoFactorMethod?: "email" | "authenticator" | "recovery" }): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as AuthResponse;
  if (!response.ok || !payload.success) {
    throw new Error(("message" in payload && payload.message) || "Authentication failed.");
  }

  if ("requiresTwoFactor" in payload && payload.requiresTwoFactor) {
    return { kind: "two_factor", emailEnabled: payload.emailEnabled, authenticatorEnabled: payload.authenticatorEnabled, message: payload.message };
  }

  if ("requiresEmailConfirmation" in payload && payload.requiresEmailConfirmation) {
    return {
      kind: "pending_confirmation",
      message: payload.message,
      email: payload.user.email,
      checkoutUrl: payload.checkoutUrl ?? null,
    };
  }

  if ("requiresBillingCheckout" in payload && payload.requiresBillingCheckout) {
    return {
      kind: "billing_required",
      message: payload.message,
      email: payload.user.email,
      checkoutUrl: payload.checkoutUrl ?? null,
    };
  }

  if (!("token" in payload)) {
    throw new Error("Authentication failed.");
  }

  let hydrated: SessionState;
  let sessionHydrated = false;
  try {
    const session = await fetchSession(payload.token);
    hydrated = { ...session, token: payload.token };
    sessionHydrated = true;
  } catch (error) {
    if (isBillingAccessError(error)) throw error;
    hydrated = buildFallbackSession(payload.token, payload.user);
  }

  return {
    kind: "confirmed",
    session: hydrated,
    sessionHydrated,
  };
}

export type TwoFactorStatus = { emailEnabled: boolean; authenticatorEnabled: boolean };
export async function getTwoFactorStatus(token: string): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>("/two-factor", token);
}
export async function changeTwoFactor(token: string, input: {
  action: "begin_authenticator" | "enable_authenticator" | "send_email_code" | "enable_email" | "disable";
  code?: string;
  method?: "email" | "authenticator";
  codeMethod?: "email" | "authenticator" | "recovery";
  password?: string;
}): Promise<TwoFactorStatus & { secret?: string; uri?: string; message?: string; recoveryCodes?: string[] }> {
  return apiFetch<TwoFactorStatus & { secret?: string; uri?: string; message?: string; recoveryCodes?: string[] }>("/two-factor", token, { method: "POST", body: JSON.stringify(input) });
}

export async function registerWithEmail(input: {
  country?: import('./region').Country;
  accountType?: "owner" | "sole_trader" | "employee";
  email: string;
  confirmEmail: string;
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
}): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as AuthResponse;
  if (!response.ok || !payload.success) {
    throw new Error(("message" in payload && payload.message) || "Registration failed.");
  }

  if ("requiresEmailConfirmation" in payload && payload.requiresEmailConfirmation) {
    return {
      kind: "pending_confirmation",
      message: payload.message,
      email: payload.user.email,
      checkoutUrl: payload.checkoutUrl ?? null,
    };
  }

  if (!("token" in payload)) {
    throw new Error("Registration completed without an authentication token.");
  }

  let hydrated: SessionState;
  let sessionHydrated = false;
  try {
    const session = await fetchSession(payload.token);
    hydrated = { ...session, token: payload.token };
    sessionHydrated = true;
  } catch {
    hydrated = buildFallbackSession(payload.token, payload.user);
  }

  saveStoredSession(hydrated);
  return {
    kind: "confirmed",
    session: hydrated,
    sessionHydrated,
  };
}

export async function confirmEmailWithToken(input: { email: string; token: string }): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/confirm-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as AuthResponse;
  if (!response.ok || !payload.success || !("token" in payload)) {
    throw new Error(("message" in payload && payload.message) || "Email confirmation failed.");
  }

}

export async function resendConfirmationEmail(input: { email: string }): Promise<{ message: string; delivered?: boolean }> {
  return apiFetch("/confirm-email/resend", "", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestPasswordReset(input: { email: string }): Promise<{ message: string; delivered?: boolean }> {
  return apiFetch("/password-reset/request", "", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resetPasswordWithToken(input: { email: string; token: string; password: string }): Promise<{ message: string }> {
  return apiFetch("/password-reset/complete", "", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function submitContactForm(input: {
  fullName: string;
  email: string;
  organisationName?: string;
  subject: string;
  message: string;
}): Promise<{ message: string; delivered?: boolean }> {
  return apiFetch("/contact", "", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchSession(token: string): Promise<SessionState> {
  const response = await apiFetch<{
    token?: string | null;
    user: SessionState["user"];
    organisations: SessionState["organisations"];
    activeOrganisationId: number;
    allowedWebRoutes?: string[];
    billing?: BillingSummary;
    entitlements?: SessionState["entitlements"];
  }>("/session", token);

  return {
    token: response.token ?? token,
    user: response.user,
    organisations: response.organisations,
    activeOrganisationId: response.activeOrganisationId,
    allowedWebRoutes: response.allowedWebRoutes,
    billing: response.billing,
    entitlements: response.entitlements,
  };
}

export async function fetchBilling(token: string): Promise<{
  billing: BillingSummary;
  entitlements: NonNullable<SessionState["entitlements"]>;
  plans: BillingPlanDefinition[];
}> {
  return apiFetch("/billing", token);
}

export async function createBillingCheckoutSession(
  token: string,
  payload: { planId: BillingPlanId; billingCycle: BillingCycle; monthlyDocumentLimit?: number; includedUsers?: number },
): Promise<{ checkoutUrl: string | null; sessionId?: string }> {
  return apiFetch("/billing/checkout-session", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createBillingPortalSession(token: string): Promise<{ portalUrl: string | null }> {
  return apiFetch("/billing/portal-session", token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createAccountingIntegrationUnlockCheckout(token: string): Promise<{ checkoutUrl: string | null; sessionId: string; alreadyUnlocked: boolean }> {
  return apiFetch("/billing/accounting-integration-unlock/checkout-session", token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function confirmAccountingIntegrationUnlock(token: string, sessionId: string): Promise<{ unlocked: boolean; alreadyUnlocked: boolean; unlockedAt: string | null; creditAmountPence: number }> {
  return apiFetch("/billing/accounting-integration-unlock/confirm", token, {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function upgradeBillingPlan(
  token: string,
  payload: { planId: BillingPlanId; monthlyDocumentLimit: number; includedUsers: number },
): Promise<{ billing: BillingSummary; entitlements: NonNullable<SessionState["entitlements"]> }> {
  return apiFetch("/billing/upgrade-plan", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(
  token: string,
  input: { password: string; confirmation: string },
): Promise<{ message: string }> {
  return apiFetch('/account', token, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}

export async function listReceipts(
  token: string,
  workspaceContext: "cost" | "sales" | "vault",
): Promise<ReceiptRecord[]> {
  const response = await apiFetch<{ receipts: ReceiptRecord[] }>(
    `/receipts?workspace_context=${workspaceContext}&include_mileage_costs=${workspaceContext === "cost"}&limit=200`,
    token,
  );
  return response.receipts.map(normalizeVaultReceiptRecord);
}

export async function getReceipt(token: string, id: number): Promise<ReceiptRecord> {
  const response = await apiFetch<{ receipt: ReceiptRecord }>(`/receipts/${id}`, token);
  return normalizeVaultReceiptRecord(response.receipt);
}

export async function getReceiptAssetUrl(token: string, id: number): Promise<{ previewUrl: string | null; downloadUrl: string | null }> {
  const response = await apiFetch<{ asset: { previewUrl: string; downloadUrl: string } }>(`/receipts/${id}/asset-url`, token);
  return {
    previewUrl: response.asset.previewUrl,
    downloadUrl: response.asset.downloadUrl,
  };
}

export async function saveReceipt(
  token: string,
  id: number,
  payload: Partial<ReceiptRecord>,
): Promise<ReceiptRecord> {
  const response = await apiFetch<{ receipt: ReceiptRecord }>(`/receipts/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeVaultReceiptRecord(response.receipt);
}

export async function deleteReceipt(token: string, id: number): Promise<void> {
  await apiFetch(`/receipts/${id}`, token, {
    method: "DELETE",
  });
}

export async function listRecycleBin(token: string): Promise<RecycleBinItem[]> {
  const response = await apiFetch<{ items: RecycleBinItem[] }>("/recycle-bin", token);
  return response.items;
}

export async function restoreRecycleBinItem(token: string, type: RecycleBinItem["itemType"], id: number): Promise<void> {
  await apiFetch(`/recycle-bin/${type}/${id}/restore`, token, { method: "POST" });
}

function normalizeVaultReceiptRecord(receipt: ReceiptRecord): ReceiptRecord {
  if (receipt.workspaceContext !== "vault") {
    return receipt;
  }
  if (receipt.status === "Processing") {
    return receipt.needsReview
      ? receipt
      : {
          ...receipt,
          status: "Ready",
        };
  }
  return receipt.needsReview
    ? {
        ...receipt,
        needsReview: false,
      }
    : receipt;
}

export async function listClaims(token: string): Promise<ClaimRecord[]> {
  const response = await apiFetch<{ claims: ClaimRecord[] }>("/claims?limit=200", token);
  return response.claims;
}

export type MileageRouteOption = {
  miles: number;
  durationMinutes: number;
  via: string[];
  mapImage?: string;
};

export type MileageRouteResult = {
  startPostcode: string;
  endPostcode: string;
  routes: MileageRouteOption[];
};

export async function calculateMileageRoute(token: string, startPostcode: string, endPostcode: string): Promise<MileageRouteResult> {
  return apiFetch<MileageRouteResult>("/mileage/route", token, {
    method: "POST",
    body: JSON.stringify({ startPostcode, endPostcode, includeMap: true }),
  });
}

export async function createClaim(
  token: string,
  payload: { name?: string; description?: string; currency?: string; claimType?: 'standard' | 'mileage'; startPostcode?: string; endPostcode?: string; totalMiles?: number; mileageRate?: number },
): Promise<ClaimRecord> {
  const response = await apiFetch<{ claim: ClaimRecord }>("/claims", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.claim;
}

export async function getClaim(token: string, id: number): Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[]; evidence: ClaimEvidence[] }> {
  return apiFetch(`/claims/${id}`, token);
}

export async function uploadClaimEvidence(token: string, id: number, file: File): Promise<ClaimEvidence> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG, or WebP image that is 5 MB or smaller.');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the proof image.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
  const response = await apiFetch<{ evidence: ClaimEvidence }>(`/claims/${id}/evidence`, token, {
    method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
  });
  return response.evidence;
}

export async function getClaimEvidenceAssetUrl(token: string, claimId: number, evidenceId: string): Promise<string> {
  const response = await apiFetch<{ asset: { previewUrl: string } }>(`/claims/${claimId}/evidence/${evidenceId}/asset-url`, token);
  return response.asset.previewUrl;
}

export async function updateClaim(
  token: string,
  id: number,
  payload: {
    name?: string;
    description?: string | null;
    currency?: string;
    startPostcode?: string;
    endPostcode?: string;
    totalMiles?: number;
    mileageRate?: number;
  },
): Promise<ClaimRecord> {
  const response = await apiFetch<{ claim: ClaimRecord }>(`/claims/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.claim;
}

export async function updateClaimStatus(
  token: string,
  id: number,
  status: ClaimRecord["status"],
): Promise<ClaimRecord> {
  const response = await apiFetch<{ claim: ClaimRecord }>(`/claims/${id}`, token, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return response.claim;
}

export async function deleteClaim(token: string, id: number): Promise<void> {
  await apiFetch(`/claims/${id}`, token, { method: "DELETE" });
}

export async function attachReceiptToClaim(
  token: string,
  payload: { receiptId: number; claimId: number },
): Promise<ReceiptRecord> {
  const response = await apiFetch<{ receipt: ReceiptRecord }>("/claims/attach", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.receipt;
}

export async function exportMasterExpenses(
  token: string,
  employeeIds: number[],
): Promise<{
  organisationName: string;
  exportedAt: string;
  rows: MasterExpenseExportRow[];
  notifications: { sent: number; failed: number };
}> {
  return apiFetch('/claims/master-export', token, {
    method: 'POST',
    body: JSON.stringify({ employeeIds }),
  });
}

export async function exportEmployeeReimbursements(
  token: string,
  options?: { receiptIds?: number[] },
): Promise<{
  rows: EmployeeReimbursementPaymentRow[];
  notifications: { sent: number; failed: number };
}> {
  return apiFetch('/costs/reimbursement-export', token, {
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined,
  });
}

export async function markEmployeeReimbursementsPaid(token: string): Promise<{ paidCount: number }> {
  return apiFetch('/costs/reimbursement-mark-paid', token, {
    method: 'POST',
  });
}

export async function listRules(token: string, workspaceContext: "cost" | "sales" = "cost"): Promise<SupplierRule[]> {
  const response = await apiFetch<{ rules: SupplierRule[] }>(`/rules?workspace_context=${workspaceContext}`, token);
  return response.rules;
}

export async function saveRule(
  token: string,
  payload: Partial<SupplierRule> & Pick<SupplierRule, "supplierMatchText" | "category" | "taxRate" | "paymentMethod" | "isActive">,
): Promise<SupplierRule> {
  const response = await apiFetch<{ rule: SupplierRule }>("/rules", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.rule;
}

export async function removeRule(token: string, id: number): Promise<void> {
  await apiFetch(`/rules/${id}`, token, {
    method: "DELETE",
  });
}

export async function listCompanyCards(token: string): Promise<{ cards: CompanyCard[]; exceptions: CompanyCardEmployeeException[] }> {
  return apiFetch('/company-cards', token);
}

export async function saveCompanyCard(token: string, payload: Partial<CompanyCard> & Pick<CompanyCard, 'label' | 'lastFour' | 'isActive'>): Promise<CompanyCard> {
  const response = await apiFetch<{ card: CompanyCard }>('/company-cards', token, { method: 'POST', body: JSON.stringify(payload) });
  return response.card;
}

export async function removeCompanyCard(token: string, id: number): Promise<void> {
  await apiFetch(`/company-cards/${id}`, token, { method: 'DELETE' });
}

export async function saveCompanyCardException(token: string, payload: Partial<CompanyCardEmployeeException> & Pick<CompanyCardEmployeeException, 'companyCardId' | 'employeeUserId' | 'isActive'>): Promise<CompanyCardEmployeeException> {
  const response = await apiFetch<{ exception: CompanyCardEmployeeException }>('/company-card-exceptions', token, { method: 'POST', body: JSON.stringify(payload) });
  return response.exception;
}

export async function removeCompanyCardException(token: string, id: number): Promise<void> {
  await apiFetch(`/company-card-exceptions/${id}`, token, { method: 'DELETE' });
}

export async function listReconciliation(token: string): Promise<ReconciliationLine[]> {
  const response = await apiFetch<{ lines: ReconciliationLine[] }>("/reconciliation", token);
  return response.lines.map((line) => ({
    ...line,
    statementDate: line.statementDate ?? line.bookingDate,
    description: line.description ?? line.remittanceInformation,
    amountSpent: line.amountSpent ?? line.transactionAmount,
  }));
}

export async function matchReconciliation(
  token: string,
  bankTransactionId: number,
  receiptId: number,
): Promise<void> {
  await apiFetch("/reconciliation/match", token, {
    method: "POST",
    body: JSON.stringify({ bankTransactionId, receiptId }),
  });
}

export async function createRequisition(
  token: string,
  input: { provider?: string; institutionId?: string },
): Promise<BankRequisition> {
  const response = await apiFetch<{ requisition: BankRequisition }>("/requisitions", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.requisition;
}

export async function completeBankCallback(
  token: string,
  input: { state: string; requisitionId?: string | null; consentId?: string | null },
): Promise<{ linked: boolean; state: string; externalRequisitionId: string | null }> {
  const params = new URLSearchParams();
  params.set("state", input.state);
  if (input.requisitionId) {
    params.set("requisition_id", input.requisitionId);
  }
  if (input.consentId) {
    params.set("consent_id", input.consentId);
  }

  const response = await apiFetch<{
    linked: boolean;
    state: string;
    externalRequisitionId: string | null;
  }>(`/bank-callback?${params.toString()}`, token);

  return {
    linked: response.linked,
    state: response.state,
    externalRequisitionId: response.externalRequisitionId,
  };
}

export async function getSettings(token: string): Promise<OrganisationSettings> {
  const response = await apiFetch<{ settings: OrganisationSettings }>("/settings", token);
  return response.settings;
}

export async function getXeroIntegrationStatus(token: string): Promise<XeroIntegrationStatus> {
  return apiFetch<XeroIntegrationStatus>("/xero/status", token, { cache: "no-store" });
}

export async function startXeroConnection(token: string): Promise<{ authorizationUrl: string }> {
  return apiFetch<{ authorizationUrl: string }>("/xero/connect", token, { method: "POST" });
}

export async function disconnectXero(token: string): Promise<void> {
  await apiFetch<{ success: true }>("/xero/connection", token, { method: "DELETE" });
}

export async function selectXeroTenant(token: string, tenantId: string): Promise<{ tenantId: string; tenantName: string }> {
  return apiFetch<{ tenantId: string; tenantName: string }>("/xero/tenant", token, { method: "POST", body: JSON.stringify({ tenantId }) });
}

export async function syncXeroCustomers(token: string): Promise<{ created: number; alreadyPresent: number; total: number }> {
  return apiFetch<{ created: number; alreadyPresent: number; total: number }>("/xero/customers/sync", token, { method: "POST" });
}

export async function importXeroCustomers(token: string): Promise<{ imported: number; alreadyPresent: number }> {
  return apiFetch<{ imported: number; alreadyPresent: number }>("/xero/customers/import", token, { method: "POST" });
}

export async function getXeroReferenceData(token: string): Promise<XeroReferenceData> {
  return apiFetch<XeroReferenceData>("/xero/reference-data", token, { cache: "no-store" });
}

export async function saveXeroIntegrationSettings(token: string, settings: XeroIntegrationSettings): Promise<XeroIntegrationSettings> {
  const response = await apiFetch<{ settings: XeroIntegrationSettings }>("/xero/settings", token, { method: "PUT", body: JSON.stringify(settings) });
  return response.settings;
}

export async function publishToXero(token: string, sourceType: XeroPublication["sourceType"], sourceId: string | number): Promise<{ alreadyPublished: boolean; publication: XeroPublication; warning: string | null }> {
  return apiFetch<{ alreadyPublished: boolean; publication: XeroPublication; warning: string | null }>("/xero/publish", token, { method: "POST", body: JSON.stringify({ sourceType, sourceId }) });
}

export async function saveSettings(
  token: string,
  payload: Pick<OrganisationSettings, "country" | "baseCurrency" | "isVatRegistered" | "defaultTaxRate">,
): Promise<OrganisationSettings> {
  const response = await apiFetch<{ settings: OrganisationSettings }>("/settings", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.settings;
}

export async function sendInvite(
  token: string,
  payload: { email: string; fullName?: string; role?: "Business_Admin" | "Standard_Employee"; departmentId?: number | null },
): Promise<InviteResult> {
  const response = await apiFetch<{ invite: InviteResult }>("/invite", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.invite;
}

export async function resendInvite(token: string, userId: number): Promise<InviteResendResult> {
  const response = await apiFetch<{ invite: InviteResendResult }>("/invite/resend", token, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  return response.invite;
}

export async function getTeam(token: string): Promise<{ departments: Department[]; members: TeamMember[] }> {
  return apiFetch('/team', token, { cache: 'no-store' });
}

export async function createDepartment(token: string, name: string): Promise<Department> {
  const response = await apiFetch<{ department: Department }>('/team', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response.department;
}

export async function assignTeamMemberDepartment(token: string, userId: number, departmentId: number | null): Promise<void> {
  await apiFetch('/team', token, {
    method: 'PUT',
    body: JSON.stringify({ userId, departmentId }),
  });
}

export async function removeTeamMember(token: string, userId: number): Promise<void> {
  await apiFetch(`/team/${userId}`, token, { method: 'DELETE' });
}

export async function uploadDocuments(
  token: string,
  workspaceContext: "cost" | "sales" | "vault",
  files: File[],
  ownerUserId?: number,
): Promise<{
  uploaded: string[];
  failed: Array<{ fileName: string; message: string }>;
}> {
  const results = await Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("workspace_context", workspaceContext);
      if (workspaceContext === "sales") {
        formData.set("split_mode", window.localStorage.getItem("exdox-sales-pdf-mode") || "auto_detect");
      }
      if (workspaceContext === "sales" && ownerUserId) {
        formData.set("owner_user_id", String(ownerUserId));
      }
      formData.set(
        "document_type",
        workspaceContext === "sales" ? "invoice" : workspaceContext === "vault" ? "unknown" : "receipt",
      );
      formData.set(
        "payment_method",
        workspaceContext === "sales" ? "bank_transfer" : workspaceContext === "vault" ? "not_applicable" : "cash_personal",
      );
      const response = await fetch(`${API_BASE_URL}/api/v1/expenses/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = response.headers.get("content-type")?.includes("application/json")
        ? ((await response.json()) as { message?: string })
        : null;

      if (!response.ok) {
        return {
          ok: false as const,
          fileName: file.name,
          message: payload?.message || `Upload failed for ${file.name}`,
        };
      }

      return {
        ok: true as const,
        fileName: file.name,
      };
    }),
  );

  return {
    uploaded: results.filter((result) => result.ok).map((result) => result.fileName),
    failed: results.filter((result) => !result.ok).map((result) => ({
      fileName: result.fileName,
      message: result.message,
    })),
  };
}

export async function getSalesWorkspace(token: string): Promise<SalesWorkspace> {
  return apiFetch("/sales-workspace", token, { cache: "no-store" });
}

export async function saveSalesCustomer(token: string, payload: Partial<SalesCustomer> & Pick<SalesCustomer, "name">): Promise<SalesCustomer> {
  const response = await apiFetch<{ customer: SalesCustomer }>("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "customer", ...payload }) });
  return response.customer;
}

export async function importSalesCustomers(token: string, rows: Array<Record<string, unknown>>): Promise<SalesCustomer[]> {
  const response = await apiFetch<{ customers: SalesCustomer[] }>("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "import_customers", rows }) });
  return response.customers;
}

export async function deleteSalesCustomer(token: string, id: string): Promise<void> {
  await apiFetch(`/sales-workspace?action=customer&id=${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

export async function saveSalesDocument(token: string, payload: Record<string, unknown>): Promise<SalesDocument> {
  const response = await apiFetch<{ document: SalesDocument }>("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "document", ...payload }) });
  return response.document;
}

export async function addSalesPayment(token: string, documentId: string, payload: { amount: number; paidAt: string; method: string; reference?: string }): Promise<SalesDocument> {
  const response = await apiFetch<{ document: SalesDocument }>("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "payment", documentId, ...payload }) });
  return response.document;
}

export async function convertSalesQuote(token: string, documentId: string): Promise<{ quote: SalesDocument; invoice: SalesDocument }> {
  return apiFetch("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "convert_quote", documentId }) });
}

export async function issueSalesDocument(token: string, documentId: string): Promise<{ document: SalesDocument; messageId: string | null }> {
  return apiFetch("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "issue_document", documentId }) });
}

export async function rotateSalesSubmissionAddress(token: string): Promise<SalesWorkspace["submissionAddress"]> {
  const response = await apiFetch<{ submissionAddress: SalesWorkspace["submissionAddress"] }>("/sales-workspace", token, { method: "POST", body: JSON.stringify({ action: "rotate_address" }) });
  return response.submissionAddress;
}

export async function getSalesDocumentPdf(token: string, documentId: string): Promise<{ previewUrl: string; downloadUrl: string }> {
  return apiFetch(`/sales-workspace?action=document_pdf&id=${encodeURIComponent(documentId)}`, token);
}

async function apiFetch<T = Record<string, never>>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T & {
    success?: boolean;
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }
    const error = new Error(payload.message || "API request failed.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function isBillingAccessError(error: unknown) {
  return error instanceof Error && (error as Error & { status?: number }).status === 402;
}

export function buildFallbackSession(token: string, user: SessionUser): SessionState {
  return {
    token,
    user,
    organisations: [
      {
        id: user.organisationId,
        name: "Primary organisation",
      },
    ],
    activeOrganisationId: user.organisationId,
    allowedWebRoutes:
      user.role === "Business_Admin"
        ? ["/overview", "/costs", "/sales", "/vault", "/claims", "/rules", "/recycle-bin", "/settings", "/billing"]
        : ["/dropbox", "/claims", "/employee/sales", "/employee/vault", "/employee/reports"],
    billing:
      user.role === "Business_Admin"
        ? {
            planId: "legacy",
            planLabel: "Legacy",
            status: "legacy",
            billingCycle: "custom",
            trialEndsAt: null,
            monthlyDocumentLimit: null,
            monthlyDocumentUsage: 0,
            includedUsers: null,
            currentUserCount: 1,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            stripeConfigured: false,
            cancellationScheduledFor: null,
          }
        : undefined,
    entitlements:
      user.role === "Business_Admin"
        ? {
            features: ["mobile_capture", "web_upload", "cost_review", "sales_review", "vault", "supplier_rules", "approval_workflows"],
            lockedRoutes: [],
          }
        : undefined,
  };
}
