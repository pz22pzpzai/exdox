import type {
  BankRequisition,
  ClaimRecord,
  OrganisationSettings,
  ReceiptRecord,
  ReconciliationLine,
  SessionState,
  SupplierRule,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_EXDOX_API_BASE_URL?.replace(/\/$/, "") ||
  "https://hz2zkm6jkf.execute-api.eu-west-2.amazonaws.com/prod";
const SESSION_STORAGE_KEY = "exdox-auth-session-v1";

type AuthResponse =
  | {
      success: true;
      token: string;
      user: SessionState["user"];
    }
  | {
      success: false;
      message?: string;
    };

export function loadStoredSession(): SessionState | null {
  const sessionStorageValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  const legacyLocalStorageValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
  const raw = sessionStorageValue ?? legacyLocalStorageValue;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionState;
    if (!sessionStorageValue && legacyLocalStorageValue) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, legacyLocalStorageValue);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session: SessionState) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function loginWithEmail(input: { email: string; password: string }): Promise<SessionState> {
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

  const session = await fetchSession(payload.token);
  const hydrated = { ...session, token: payload.token };
  saveStoredSession(hydrated);
  return hydrated;
}

export async function fetchSession(token: string): Promise<SessionState> {
  const response = await apiFetch<{
    user: SessionState["user"];
    organisations: SessionState["organisations"];
    activeOrganisationId: number;
    allowedWebRoutes?: string[];
  }>("/session", token);

  return {
    token,
    user: response.user,
    organisations: response.organisations,
    activeOrganisationId: response.activeOrganisationId,
    allowedWebRoutes: response.allowedWebRoutes,
  };
}

export async function listReceipts(
  token: string,
  workspaceContext: "cost" | "sales",
): Promise<ReceiptRecord[]> {
  const response = await apiFetch<{ receipts: ReceiptRecord[] }>(
    `/receipts?workspace_context=${workspaceContext}&limit=200`,
    token,
  );
  return response.receipts;
}

export async function getReceipt(token: string, id: number): Promise<ReceiptRecord> {
  const response = await apiFetch<{ receipt: ReceiptRecord }>(`/receipts/${id}`, token);
  return response.receipt;
}

export async function getReceiptAssetUrl(token: string, id: number): Promise<string | null> {
  const response = await apiFetch<{ asset: { downloadUrl: string } }>(`/receipts/${id}/asset-url`, token);
  return response.asset.downloadUrl;
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
  return response.receipt;
}

export async function deleteReceipt(token: string, id: number): Promise<void> {
  await apiFetch(`/receipts/${id}`, token, {
    method: "DELETE",
  });
}

export async function listClaims(token: string): Promise<ClaimRecord[]> {
  const response = await apiFetch<{ claims: ClaimRecord[] }>("/claims?limit=200", token);
  return response.claims;
}

export async function getClaim(token: string, id: number): Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }> {
  return apiFetch(`/claims/${id}`, token);
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

export async function listRules(token: string): Promise<SupplierRule[]> {
  const response = await apiFetch<{ rules: SupplierRule[] }>("/rules", token);
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

export async function saveSettings(
  token: string,
  payload: Pick<OrganisationSettings, "isVatRegistered" | "defaultTaxRate">,
): Promise<OrganisationSettings> {
  const response = await apiFetch<{ settings: OrganisationSettings }>("/settings", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.settings;
}

export async function uploadDocuments(
  token: string,
  workspaceContext: "cost" | "sales",
  files: File[],
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("workspace_context", workspaceContext);
      formData.set("document_type", workspaceContext === "sales" ? "invoice" : "receipt");
      formData.set("payment_method", workspaceContext === "sales" ? "bank_transfer" : "business_card");

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
        throw new Error(payload?.message || `Upload failed for ${file.name}`);
      }
    }),
  );
}

async function apiFetch<T = Record<string, never>>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
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
    throw new Error(payload.message || "API request failed.");
  }

  return payload;
}
