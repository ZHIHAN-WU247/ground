const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

type VerificationRecord = {
  code: string;
  expiresAt: number;
};

declare global {
  var __groundEmailVerificationStore: Map<string, VerificationRecord> | undefined;
}

const getStore = () => {
  if (!globalThis.__groundEmailVerificationStore) {
    globalThis.__groundEmailVerificationStore = new Map<string, VerificationRecord>();
  }

  return globalThis.__groundEmailVerificationStore;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const createEmailVerificationCode = (email: string) => {
  const code = generateCode();
  const expiresAt = Date.now() + EMAIL_CODE_TTL_MS;
  getStore().set(normalizeEmail(email), { code, expiresAt });

  return {
    code,
    expiresInSeconds: Math.floor(EMAIL_CODE_TTL_MS / 1000)
  };
};

export const verifyEmailVerificationCode = (email: string, code: string) => {
  const record = getStore().get(normalizeEmail(email));

  if (!record) {
    return { ok: false as const, reason: "missing_code" as const };
  }

  if (record.expiresAt < Date.now()) {
    getStore().delete(normalizeEmail(email));
    return { ok: false as const, reason: "expired_code" as const };
  }

  if (record.code !== code.trim()) {
    return { ok: false as const, reason: "invalid_code" as const };
  }

  getStore().delete(normalizeEmail(email));
  return { ok: true as const };
};
