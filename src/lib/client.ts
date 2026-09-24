// Client-side API helpers with typed responses.

export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError {
  success: false;
  error: { code: string; message: string; fieldErrors?: Record<string, string> };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(r: ApiResponse<T>): r is ApiError {
  return !r.success;
}

async function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as ApiResponse<T>) : undefined;
    if (!json) {
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Empty response from server." },
      };
    }
    return json;
  } catch (e) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "We couldn't reach the server. Please check your connection.",
      },
    };
  }
}

// ---- Auth ----
export const apiSendOtp = (name: string, phone: string) =>
  request<{ otp: string; phone: string }>("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ name, phone }),
  });

export const apiVerifyOtp = (phone: string, code: string) =>
  request<{ creatorId: string; name: string; phone: string }>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

export const apiSession = () =>
  request<{ authenticated: boolean; creatorId?: string; name?: string; phone?: string }>(
    "/api/auth/session"
  );

export const apiLogout = () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

// ---- Drafts ----
export interface DraftImageDTO {
  id: string;
  url: string;
  caption: string | null;
  width: number;
  height: number;
  state: string;
  sortOrder: number;
}
export interface DraftDTO {
  id: string;
  status: string;
  creatorName: string | null;
  phone: string | null;
  intro: string | null;
  emotion: string | null;
  partnerName: string | null;
  relationship: string | null;
  story: string | null;
  specialMessage: string | null;
  finalMessage: string | null;
  signature: string | null;
  shareConsent: boolean;
  musicEnabled: boolean;
  images: DraftImageDTO[];
  updatedAt: string;
}

export const apiCreateDraft = () =>
  request<DraftDTO>("/api/drafts", { method: "POST" });
export const apiListDrafts = () => request<DraftDTO[]>("/api/drafts");
export const apiGetDraft = (id: string) => request<DraftDTO>(`/api/drafts/${id}`);
export const apiPatchDraft = (id: string, patch: Partial<DraftDTO>) =>
  request<DraftDTO>(`/api/drafts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
export const apiDeleteDraft = (id: string) =>
  request<{ deleted: boolean }>(`/api/drafts/${id}`, { method: "DELETE" });

// ---- Images ----
export async function apiUploadImage(
  draftId: string,
  file: File
): Promise<ApiResponse<DraftDTO>> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/drafts/${draftId}/images`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as ApiResponse<DraftDTO>) : undefined;
    if (!json) return { success: false, error: { code: "INTERNAL_ERROR", message: "No response." } };
    return json;
  } catch {
    return { success: false, error: { code: "NETWORK_ERROR", message: "Upload failed." } };
  }
}

export const apiPatchImage = (
  imageId: string,
  data: { caption?: string; sortOrder?: number }
) =>
  request<DraftDTO | { id: string; caption: string; sortOrder: number }>(
    `/api/images/${imageId}`,
    { method: "PATCH", body: JSON.stringify(data) }
  );

export const apiDeleteImage = (imageId: string) =>
  request<{ deleted: boolean } | DraftDTO>(`/api/images/${imageId}`, {
    method: "DELETE",
  });

// ---- Payments & credits ----
export interface CreateOrderResult {
  paymentId: string;
  provider: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  credits: number;
  keyId?: string;
  fakePaymentId?: string;
  fakeSignature?: string;
}
export const apiCreateOrder = () =>
  request<CreateOrderResult>("/api/payments/create-order", { method: "POST" });
export const apiVerifyPayment = (data: {
  providerOrderId: string;
  providerPaymentId: string;
  signature?: string;
}) =>
  request<{
    replay: boolean;
    paymentId: string;
    total: number;
    used: number;
    remaining: number;
    creditsGranted: number;
  }>("/api/payments/verify", { method: "POST", body: JSON.stringify(data) });

export const apiGetCredits = () =>
  request<{ total: number; used: number; remaining: number }>("/api/credits");

// ---- Generation ----
export const apiGenerate = (draftId: string) =>
  request<{ replay: boolean; website: WebsiteDTO }>(
    `/api/drafts/${draftId}/generate`,
    { method: "POST" }
  );

// ---- Websites ----
export interface WebsiteDTO {
  id: string;
  slug: string;
  emotion: string;
  partnerName: string;
  creatorName: string;
  status: string;
  publishedAt: string;
  url: string;
}
export const apiListWebsites = () => request<WebsiteDTO[]>("/api/websites");
export const apiDeleteWebsite = (id: string) =>
  request<{ deleted: boolean }>(`/api/websites/${id}`, { method: "DELETE" });

// ---- Public love ----
export interface PublicLoveImage {
  id: string;
  url: string;
  caption: string | null;
  width: number;
  height: number;
  sortOrder: number;
}
export interface PublicLovePayload {
  slug: string;
  creatorName: string;
  intro: string | null;
  emotion: string;
  partnerName: string;
  relationship: string | null;
  story: string;
  specialMessage: string | null;
  finalMessage: string | null;
  signature: string | null;
  musicEnabled: boolean;
  publishedAt: string;
  images: PublicLoveImage[];
}
export const apiGetLove = (slug: string) =>
  request<PublicLovePayload>(`/api/public/love/${slug}`);

// ---- Seed (demo) ----
export const apiSeed = () =>
  request<{ slug: string; url: string; seeded: boolean; alreadyExisted?: boolean }>(
    "/api/seed",
    { method: "POST" }
  );
