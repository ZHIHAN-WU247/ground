import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { AuditLogService } from "./audit-log.service";

@Controller("admin/audit")
@UseGuards(SupabaseTokenGuard, AdminRoleGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get("logs")
  listLogs(@Query("limit") limit?: string) {
    const parsedLimit = Number(limit);
    return this.auditLogService.listLogs(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100);
  }
}
