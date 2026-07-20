import { createClient } from "@supabase/supabase-js";

interface SupabaseAuthUser {
  id: string;
  email?: string | null;
}

interface SupabaseAuthError {
  message?: string;
}

interface SupabaseAuthUserResult {
  data: {
    user: SupabaseAuthUser | null;
  };
  error: SupabaseAuthError | null;
}

interface SupabaseAuthUsersResult {
  data: {
    users: SupabaseAuthUser[];
  };
  error: SupabaseAuthError | null;
}

interface SupabaseAdminCreateUserInput {
  email: string;
  password: string;
  email_confirm: boolean;
  user_metadata: {
    display_name: string;
  };
}

interface SupabaseAdminUpdateUserInput {
  password: string;
  email_confirm: boolean;
  user_metadata: {
    display_name: string;
  };
}

export interface SupabaseAdminAuthClient {
  auth: {
    admin: {
      createUser(input: SupabaseAdminCreateUserInput): Promise<SupabaseAuthUserResult>;
      listUsers(input?: { page?: number; perPage?: number }): Promise<SupabaseAuthUsersResult>;
      updateUserById(id: string, input: SupabaseAdminUpdateUserInput): Promise<SupabaseAuthUserResult>;
    };
  };
}

interface RegisterConfirmedUserInput {
  account: string;
  email: string;
  password: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getServerSupabaseAdminClient = (): SupabaseAdminAuthClient => {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin registration is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) as unknown as SupabaseAdminAuthClient;
};

const isDuplicateUserError = (error: SupabaseAuthError | null) => error?.message?.toLowerCase().includes("already") ?? false;

export const registerConfirmedSupabaseAuthUser = async (
  input: RegisterConfirmedUserInput,
  client = getServerSupabaseAdminClient()
) => {
  const email = normalizeEmail(input.email);
  const account = input.account.trim();
  const password = input.password;
  const createInput: SupabaseAdminCreateUserInput = {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: account
    }
  };

  const createResult = await client.auth.admin.createUser(createInput);

  if (!createResult.error && createResult.data.user) {
    return createResult.data.user;
  }

  if (!isDuplicateUserError(createResult.error)) {
    throw new Error(createResult.error?.message || "Supabase registration failed.");
  }

  const usersResult = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (usersResult.error) {
    throw new Error(usersResult.error.message || "Supabase user lookup failed.");
  }

  const existingUser = usersResult.data.users.find((user) => normalizeEmail(user.email ?? "") === email);

  if (!existingUser) {
    throw new Error("Supabase user already exists but could not be loaded.");
  }

  const updateResult = await client.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    user_metadata: {
      display_name: account
    }
  });

  if (updateResult.error || !updateResult.data.user) {
    throw new Error(updateResult.error?.message || "Supabase user confirmation failed.");
  }

  return updateResult.data.user;
};
