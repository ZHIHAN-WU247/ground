const AUTH_ACCOUNTS_KEY = "ground.authAccounts";

export interface LocalAuthAccount {
  account: string;
  email: string;
  password: string;
}

const isBrowser = () => typeof window !== "undefined";

const normalizeValue = (value: string) => value.trim();

const normalizeLookup = (value: string) => value.trim().toLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const parseAccount = (value: unknown): LocalAuthAccount | null => {
  if (!isRecord(value)) {
    return null;
  }

  const account = typeof value.account === "string" ? normalizeValue(value.account) : "";
  const email = typeof value.email === "string" ? normalizeLookup(value.email) : "";
  const password = typeof value.password === "string" ? value.password : "";

  if (!account || !email || !password) {
    return null;
  }

  return { account, email, password };
};

const readLocalAuthAccounts = () => {
  if (!isBrowser()) {
    return [] as LocalAuthAccount[];
  }

  const raw = window.localStorage.getItem(AUTH_ACCOUNTS_KEY);

  if (!raw) {
    return [] as LocalAuthAccount[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [] as LocalAuthAccount[];
    }

    return parsed.reduce<LocalAuthAccount[]>((accounts, item) => {
      const account = parseAccount(item);

      if (account) {
        accounts.push(account);
      }

      return accounts;
    }, []);
  } catch {
    return [] as LocalAuthAccount[];
  }
};

const writeLocalAuthAccounts = (accounts: LocalAuthAccount[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const findLocalAuthAccountByLogin = (login: string) => {
  const normalized = normalizeLookup(login);

  if (!normalized) {
    return null;
  }

  return readLocalAuthAccounts().find((account) => {
    return normalizeLookup(account.account) === normalized || account.email === normalized;
  }) ?? null;
};

export const hasLocalAuthAccountByEmail = (email: string) => {
  const normalized = normalizeLookup(email);

  if (!normalized) {
    return false;
  }

  return readLocalAuthAccounts().some((account) => account.email === normalized);
};

export const hasLocalAuthAccountByAccount = (accountName: string) => {
  const normalized = normalizeLookup(accountName);

  if (!normalized) {
    return false;
  }

  return readLocalAuthAccounts().some((account) => normalizeLookup(account.account) === normalized);
};

export const registerLocalAuthAccount = (payload: LocalAuthAccount) => {
  const account = normalizeValue(payload.account);
  const email = normalizeLookup(payload.email);
  const password = payload.password;

  if (!account || !email || !password) {
    return { ok: false as const, reason: "invalid_payload" as const };
  }

  if (hasLocalAuthAccountByAccount(account)) {
    return { ok: false as const, reason: "duplicate_account" as const };
  }

  if (hasLocalAuthAccountByEmail(email)) {
    return { ok: false as const, reason: "duplicate_email" as const };
  }

  const accounts = readLocalAuthAccounts();
  const nextAccount = { account, email, password };
  accounts.push(nextAccount);
  writeLocalAuthAccounts(accounts);

  return { ok: true as const, account: nextAccount };
};
