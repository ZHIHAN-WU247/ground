import assert from "node:assert/strict";

import { registerConfirmedSupabaseAuthUser, type SupabaseAdminAuthClient } from "./supabase-admin-registration";

const calls: unknown[] = [];

const recordCall = (call: unknown) => {
  calls[calls.length] = call;
};

const client: SupabaseAdminAuthClient = {
  auth: {
    admin: {
      createUser: async (input) => {
        recordCall({ method: "createUser", input });
        return { data: { user: { id: "created-user" } }, error: null };
      },
      listUsers: async () => {
        recordCall({ method: "listUsers" });
        return { data: { users: [] }, error: null };
      },
      updateUserById: async (id, input) => {
        recordCall({ method: "updateUserById", id, input });
        return { data: { user: { id } }, error: null };
      }
    }
  }
};

async function main() {
  await registerConfirmedSupabaseAuthUser(
    {
      account: " 12345678 ",
      email: " 3651271914@QQ.com ",
      password: "secret-password"
    },
    client
  );

  assert.deepEqual(calls, [
    {
      method: "createUser",
      input: {
        email: "3651271914@qq.com",
        password: "secret-password",
        email_confirm: true,
        user_metadata: {
          display_name: "12345678"
        }
      }
    }
  ]);

  calls.length = 0;

  const existingClient: SupabaseAdminAuthClient = {
    auth: {
      admin: {
        createUser: async (input) => {
          recordCall({ method: "createUser", input });
          return { data: { user: null }, error: { message: "User already registered" } };
        },
        listUsers: async () => {
          recordCall({ method: "listUsers" });
          return {
            data: {
              users: [
                {
                  id: "existing-user",
                  email: "3651271914@qq.com"
                }
              ]
            },
            error: null
          };
        },
        updateUserById: async (id, input) => {
          recordCall({ method: "updateUserById", id, input });
          return { data: { user: { id } }, error: null };
        }
      }
    }
  };

  await registerConfirmedSupabaseAuthUser(
    {
      account: "12345678",
      email: "3651271914@qq.com",
      password: "new-secret-password"
    },
    existingClient
  );

  assert.deepEqual(calls, [
    {
      method: "createUser",
      input: {
        email: "3651271914@qq.com",
        password: "new-secret-password",
        email_confirm: true,
        user_metadata: {
          display_name: "12345678"
        }
      }
    },
    { method: "listUsers" },
    {
      method: "updateUserById",
      id: "existing-user",
      input: {
        password: "new-secret-password",
        email_confirm: true,
        user_metadata: {
          display_name: "12345678"
        }
      }
    }
  ]);
}

void main();
