import {
  demoClaims,
  demoReceipts,
  demoReconciliation,
  demoRules,
  demoSession,
  demoSettings,
} from "./demo";
import type {
  ClaimRecord,
  OrganisationSettings,
  ReceiptRecord,
  ReconciliationLine,
  SessionState,
  SupplierRule,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_EXDOX_API_BASE_URL?.replace(/\/$/, "") ?? "";
const SESSION_STORAGE_KEY = "exdox-auth-session-v1";

export function loadStoredSession(): SessionState | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return demoSession;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return demoSession;
  }
}

export async function fetchSession(token: string): Promise<SessionState> {
  if (!API_BASE_URL || token === "demo-token") {
    return demoSession;
  }

  const response = await apiFetch<{ user: SessionState["user"]; organisations: SessionState["organisations"]; activeOrganisationId: number }>(
    "/session",
    token,
  );

  return {
    token,
    user: response.user,
    organisations: response.organisations,
    activeOrganisationId: response.activeOrganisationId,
  };
}

export async function listReceipts(
  token: string,
  workspaceContext: "cost" | "sales",
): Promise<ReceiptRecord[]> {
  if (!API_BASE_URL || token === "demo-token") {
    return demoReceipts.filter((receipt) => receipt.workspaceContext === workspaceContext);
  }

  const response = await apiFetch<{ receipts: ReceiptRecord[] }>(
    `/receipts?workspace_context=${workspaceContext}&limit=200`,
    token,
  );
  return response.receipts;
}

export async function getReceipt(token: string, id: number): Promise<ReceiptRecord> {
  if (!API_BASE_URL || token === "demo-token") {
    const receipt = demoReceipts.find((item) => item.id === id);
    if (!receipt) {
      throw new Error("Receipt not found.");
    }
    return receipt;
  }

  const response = await apiFetch<{ receipt: ReceiptRecord }>(`/receipts/${id}`, token);
  return response.receipt;
}

export async function getReceiptAssetUrl(token: string, id: number): Promise<string | null> {
  if (!API_BASE_URL || token === "demo-token") {
    return null;
  }

  const response = await apiFetch<{ asset: { downloadUrl: string } }>(`/receipts/${id}/asset-url`, token);
  return response.asset.downloadUrl;
}

export async function saveReceipt(
  token: string,
  id: number,
  payload: Partial<ReceiptRecord>,
): Promise<ReceiptRecord> {
  if (!API_BASE_URL || token === "demo-token") {
    const current = demoReceipts.find((item) => item.id === id);
    if (!current) {
      throw new Error("Receipt not found.");
    }
    return { ...current, ...payload };
  }

  const response = await apiFetch<{ receipt: ReceiptRecord }>(`/receipts/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.receipt;
}

export async function deleteReceipt(token: string, id: number): Promise<void> {
  if (!API_BASE_URL || token === "demo-token") {
    return;
  }

  await apiFetch(`/receipts/${id}`, token, {
    method: "DELETE",
  });
}

export async function listClaims(token: string): Promise<ClaimRecord[]> {
  if (!API_BASE_URL || token === "demo-token") {
    return demoClaims;
  }

  const response = await apiFetch<{ claims: ClaimRecord[] }>("/claims?limit=200", token);
  return response.claims;
}

export async function getClaim(token: string, id: number): Promise<{ claim: ClaimRecord; receipts: ReceiptRecord[] }> {
  if (!API_BASE_URL || token === "demo-token") {
    const claim = demoClaims.find((item) => item.id === id);
    if (!claim) {
      throw new Error("Claim not found.");
    }
    return {
      claim,
      receipts: demoReceipts.filter((receipt) => receipt.claimId === id),
    };
  }

  return apiFetch(`/claims/${id}`, token);
}

export async function updateClaimStatus(
  token: string,
  id: number,
  status: ClaimRecord["status"],
): Promise<ClaimRecord> {
  if (!API_BASE_URL || token === "demo-token") {
    const claim = demoClaims.find((item) => item.id === id);
    if (!claim) {
      throw new Error("Claim not found.");
    }
    return { ...claim, status };
  }

  const response = await apiFetch<{ claim: ClaimRecord }>(`/claims/${id}`, token, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return response.claim;
}

export async function listRules(token: string): Promise<SupplierRule[]> {
  if (!API_BASE_URL || token === "demo-token") {
    return demoRules;
  }

  const response = await apiFetch<{ rules: SupplierRule[] }>("/rules", token);
  return response.rules;
}

export async function saveRule(
  token: string,
  payload: Partial<SupplierRule> & Pick<SupplierRule, "supplierMatchText" | "category" | "taxRate" | "paymentMethod" | "isActive">,
): Promise<SupplierRule> {
  if (!API_BASE_URL || token === "demo-token") {
    return {
      id: payload.id ?? Math.floor(Math.random() * 100000),
      supplierMatchText: payload.supplierMatchText,
      category: payload.category,
      taxRate: payload.taxRate,
      paymentMethod: payload.paymentMethod,
      isActive: payload.isActive,
    };
  }

  const response = await apiFetch<{ rule: SupplierRule }>("/rules", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.rule;
}

export async function removeRule(token: string, id: number): Promise<void> {
  if (!API_BASE_URL || token === "demo-token") {
    return;
  }

  await apiFetch(`/rules/${id}`, token, {
    method: "DELETE",
  });
}

export async function listReconciliation(token: string): Promise<ReconciliationLine[]> {
  if (!API_BASE_URL || token === "demo-token") {
    return demoReconciliation;
  }

  const response = await apiFetch<{ lines: ReconciliationLine[] }>("/reconciliation", token);
  return response.lines;
}

export async function matchReconciliation(
  token: string,
  statementLineId: number,
  receiptId: number,
): Promise<void> {
  if (!API_BASE_URL || token === "demo-token") {
    return;
  }

  await apiFetch("/reconciliation/match", token, {
    method: "POST",
    body: JSON.stringify({ statementLineId, receiptId }),
  });
}

export async function getSettings(token: string): Promise<OrganisationSettings> {
  if (!API_BASE_URL || token === "demo-token") {
    return demoSettings;
  }

  const response = await apiFetch<{ settings: OrganisationSettings }>("/settings", token);
  return response.settings;
}

export async function saveSettings(
  token: string,
  payload: Pick<OrganisationSettings, "isVatRegistered" | "defaultTaxRate">,
): Promise<OrganisationSettings> {
  if (!API_BASE_URL || token === "demo-token") {
    return {
      ...demoSettings,
      ...payload,
    };
  }

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
  if (!API_BASE_URL || token === "demo-token") {
    return;
  }

  await Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("workspace_context", workspaceContext);
      formData.set("document_type", workspaceContext === "sales" ? "invoice" : "receipt");
      formData.set("payment_method", workspaceContext === "sales" ? "bank_transfer" : "business_card");

      const response = await fetch(`${API_BASE_URL}/expenses/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed for ${file.name}`);
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
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T & {
    success?: boolean;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || "API request failed.");
  }

  return payload;
}
