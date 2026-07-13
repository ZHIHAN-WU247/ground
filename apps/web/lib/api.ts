import { getSupabaseAccessToken, getSupabaseAdminAccessToken, getSupabaseAuthSession } from "./supabase-auth";
import { getActiveLocalUserProfile } from "./local-user-profile";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface RequestOptions {
  body?: object;
  headers?: HeadersInit;
  method?: "DELETE" | "GET" | "POST" | "PATCH";
  skipAuth?: boolean;
}

async function requestJson<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const headers = mergeHeaders(options.skipAuth ? undefined : getAuthRequestHeaders(), options.headers);
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    ...(headers ? { headers } : {}),
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };
  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, responseText));
  }

  return (responseText ? JSON.parse(responseText) : {}) as TResponse;
}

function getErrorMessage(status: number, responseText: string) {
  if (!responseText.trim()) {
    return `Request failed with status ${status}`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join("; ");
    }

    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Fall back to raw text when the backend returned plain text or HTML.
  }

  return responseText.trim();
}

export async function getJson<TResponse>(path: string): Promise<TResponse> {
  return requestJson<TResponse>(path);
}

export async function postJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });
}

export async function patchJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });
}

export async function deleteJson<TResponse>(path: string): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "DELETE"
  });
}

export async function getAdminJson<TResponse>(path: string): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    headers: getAdminRequestHeaders(),
    skipAuth: true
  });
}

export async function postAdminJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAdminRequestHeaders()
    },
    body,
    skipAuth: true
  });
}

export async function patchAdminJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAdminRequestHeaders()
    },
    body,
    skipAuth: true
  });
}

export async function deleteAdminJson<TResponse>(path: string): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "DELETE",
    headers: getAdminRequestHeaders(),
    skipAuth: true
  });
}

function getAuthRequestHeaders() {
  const token = getSupabaseAccessToken();
  const localEmail = getActiveLocalUserProfile()?.email?.trim().toLowerCase();

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      ...(localEmail ? { "x-ground-dev-customer-email": localEmail } : {})
    };
  }

  return localEmail ? { "x-ground-dev-customer-email": localEmail } : undefined;
}

function mergeHeaders(base?: HeadersInit, override?: HeadersInit): HeadersInit | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  return {
    ...headersToRecord(base),
    ...headersToRecord(override)
  };
}

function headersToRecord(headers: HeadersInit) {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function getAdminRequestHeaders() {
  const token = getSupabaseAdminAccessToken();
  const adminEmail = getSupabaseAuthSession()?.email?.trim().toLowerCase();

  if (!token) {
    throw new Error("Admin access is required for this request.");
  }

  return {
    Authorization: `Bearer ${token}`,
    ...(adminEmail
      ? {
          "x-ground-dev-admin": "true",
          "x-ground-dev-admin-email": adminEmail
        }
      : {})
  };
}
