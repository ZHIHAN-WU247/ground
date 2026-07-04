import { getActiveLocalAdminEmail } from "./local-user-profile";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface RequestOptions {
  body?: object;
  headers?: HeadersInit;
  method?: "DELETE" | "GET" | "POST" | "PATCH";
}

async function requestJson<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    ...(options.headers ? { headers: options.headers } : {}),
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

export async function getAdminJson<TResponse>(path: string): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    headers: getAdminRequestHeaders()
  });
}

export async function postAdminJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAdminRequestHeaders()
    },
    body
  });
}

export async function patchAdminJson<TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAdminRequestHeaders()
    },
    body
  });
}

export async function deleteAdminJson<TResponse>(path: string): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "DELETE",
    headers: getAdminRequestHeaders()
  });
}

function getAdminRequestHeaders() {
  const email = getActiveLocalAdminEmail();

  if (!email) {
    throw new Error("Admin access is required for this request.");
  }

  return {
    "x-ground-dev-admin": "true",
    "x-ground-dev-admin-email": email
  };
}
