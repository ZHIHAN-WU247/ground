import { Injectable } from "@nestjs/common";
import type { AuditLog } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseAuditLogStore, type RecordAuditLogInput, type SupabaseAuditLogClient } from "./supabase-audit-log-store";

@Injectable()
export class AuditLogService {
  constructor(private readonly supabaseService: SupabaseService) {}

  listLogs(limit?: number): Promise<AuditLog[]> {
    return this.getStore().listLogs(limit);
  }

  recordLog(input: RecordAuditLogInput): Promise<AuditLog> {
    return this.getStore().recordLog(input);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for audit logs.");
    }

    return new SupabaseAuditLogStore(this.supabaseService.client as unknown as SupabaseAuditLogClient);
  }
}
