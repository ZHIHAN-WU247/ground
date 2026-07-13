import type { AuditLog } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  insert(payload: Record<string, unknown>): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
}

export interface SupabaseAuditLogClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface RecordAuditLogInput {
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export class SupabaseAuditLogStore {
  constructor(private readonly client: SupabaseAuditLogClient) {}

  async listLogs(limit = 100): Promise<AuditLog[]> {
    const result = await this.client
      .from<AuditLogRow[]>("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    this.assertSuccess(result, "Failed to load audit logs from Supabase.");
    return (result.data ?? []).map((row) => this.toLog(row));
  }

  async recordLog(input: RecordAuditLogInput): Promise<AuditLog> {
    const insertResult = await this.client
      .from<AuditLogRow>("audit_logs")
      .insert({
        actor_user_id: this.uuidOrNull(input.actorUserId),
        actor_email: this.normalizeEmail(input.actorEmail) || null,
        action: input.action.trim(),
        entity_type: input.entityType.trim(),
        entity_id: this.uuidOrNull(input.entityId),
        before_data: input.beforeData ?? null,
        after_data: input.afterData ?? null,
        ip_address: input.ipAddress?.trim() || null,
        user_agent: input.userAgent?.trim() || null
      })
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to save audit log to Supabase.");
    return this.toLog(insertResult.data!);
  }

  private toLog(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      ...(row.actor_user_id ? { actorUserId: row.actor_user_id } : {}),
      ...(row.actor_email ? { actorEmail: row.actor_email } : {}),
      action: row.action,
      entityType: row.entity_type,
      ...(row.entity_id ? { entityId: row.entity_id } : {}),
      beforeData: this.dataObjectOrNull(row.before_data),
      afterData: this.dataObjectOrNull(row.after_data),
      ...(row.ip_address ? { ipAddress: row.ip_address } : {}),
      ...(row.user_agent ? { userAgent: row.user_agent } : {}),
      createdAt: row.created_at
    };
  }

  private dataObjectOrNull(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  private normalizeEmail(email?: string) {
    return email?.trim().toLowerCase() ?? "";
  }

  private uuidOrNull(value?: string) {
    const normalized = value?.trim() ?? "";
    return this.isUuid(normalized) ? normalized : null;
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
