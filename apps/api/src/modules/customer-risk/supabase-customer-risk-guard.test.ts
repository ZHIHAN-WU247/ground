import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { SupabaseCustomerRiskGuard, type SupabaseCustomerRiskClient } from "./supabase-customer-risk-guard";

class FakeQuery {
  private email = "";

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select() { return this; }
  limit() { return this; }
  eq(column: string, value: string) {
    if (column === "email") {
      this.email = value;
    }
    return this;
  }
  async maybeSingle() {
    return {
      data: this.rows.find((row) => String(row.email).toLowerCase() === this.email) ?? null,
      error: null
    };
  }
}

class FakeClient {
  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  from(table: string) {
    assert.equal(table, "user_profiles");
    return new FakeQuery(this.rows);
  }
}

const run = async () => {
  const guard = new SupabaseCustomerRiskGuard(new FakeClient([
    {
      email: "blocked@example.com",
      metadata: {
        is_blacklisted: true,
        restriction_reason: "Chargeback investigation"
      }
    },
    {
      email: "ok@example.com",
      metadata: {
        is_blacklisted: false
      }
    }
  ]) as unknown as SupabaseCustomerRiskClient);

  await assert.rejects(
    () => guard.assertCanCreateOrder("Blocked@Example.com"),
    (error) => error instanceof BadRequestException && /Chargeback investigation/.test(error.message)
  );
  await guard.assertCanCreateOrder("ok@example.com");
  await guard.assertCanCreateOrder(undefined);
};

void run();
