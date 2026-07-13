import { createClient, type Session } from "@supabase/supabase-js";

const AUTH_SESSION_KEY = "ground.supabaseAuthSession";
export const SUPABASE_AUTH_EVENT = "ground:supabase-auth-changed";

interface StoredAuthSession {
  accessToken: string;
  email: string;
}

const isBrowser = () => typeof window !== "undefined";

const notifyAuthChange = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(SUPABASE_AUTH_EVENT));
};

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() ?? "";

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("Supabase Auth is not configured.");
  }

  return { url, anonKey };
};

export const getBrowserSupabaseClient = () => {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
};

export const saveSupabaseAuthSession = (session: Pick<Session, "access_token"> & { user?: { email?: string | null } }) => {
  if (!isBrowser()) {
    return null;
  }

  const accessToken = session.access_token?.trim() ?? "";
  const email = normalizeEmail(session.user?.email);

  if (!accessToken || !email) {
    return null;
  }

  const stored: StoredAuthSession = { accessToken, email };
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(stored));
  notifyAuthChange();
  return stored;
};

export const getSupabaseAuthSession = (): StoredAuthSession | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    const accessToken = parsed.accessToken?.trim() ?? "";
    const email = normalizeEmail(parsed.email);
    return accessToken && email ? { accessToken, email } : null;
  } catch {
    return null;
  }
};

export const getSupabaseAccessToken = () => getSupabaseAuthSession()?.accessToken ?? "";

const decodeJwtPayload = (token: string) => {
  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(globalThis.atob(padded)) as {
      app_metadata?: { role?: string };
      user_metadata?: { role?: string };
      role?: string;
    };
  } catch {
    return null;
  }
};

export const isSupabaseAdminSession = () => {
  const token = getSupabaseAccessToken();
  const payload = token ? decodeJwtPayload(token) : null;
  return payload?.app_metadata?.role === "admin" || payload?.user_metadata?.role === "admin" || payload?.role === "admin";
};

export const getSupabaseAdminAccessToken = () => isSupabaseAdminSession() ? getSupabaseAccessToken() : "";

export const clearSupabaseAuthSession = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
  notifyAuthChange();
};

export const signInWithSupabasePassword = async (emailOrAccount: string, password: string) => {
  const email = normalizeEmail(emailOrAccount);
  const result = await getBrowserSupabaseClient().auth.signInWithPassword({ email, password });

  if (result.error || !result.data.session) {
    throw new Error(result.error?.message || "Supabase login failed.");
  }

  return saveSupabaseAuthSession(result.data.session);
};

export const setSupabaseRecoverySessionFromHash = async (hash: string) => {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token")?.trim() ?? "";
  const refreshToken = params.get("refresh_token")?.trim() ?? "";

  if (!accessToken || !refreshToken) {
    throw new Error("Password recovery link is invalid or expired.");
  }

  const result = await getBrowserSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (result.error || !result.data.session) {
    throw new Error(result.error?.message || "Password recovery session failed.");
  }

  return saveSupabaseAuthSession(result.data.session);
};

export const updateSupabasePassword = async (password: string) => {
  const result = await getBrowserSupabaseClient().auth.updateUser({ password });

  if (result.error) {
    throw new Error(result.error.message || "Password update failed.");
  }

  return result.data.user;
};

export const signUpWithSupabasePassword = async (emailAddress: string, password: string, account: string) => {
  const email = normalizeEmail(emailAddress);
  const result = await getBrowserSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: account.trim()
      }
    }
  });

  if (result.error) {
    throw new Error(result.error.message || "Supabase registration failed.");
  }

  if (result.data.session) {
    saveSupabaseAuthSession(result.data.session);
  }

  return result.data;
};
