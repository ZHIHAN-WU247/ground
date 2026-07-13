import type { AuditLog } from "@ground/shared";
import { getAdminJson } from "./api";

export async function listAdminAuditLogs(limit = 100): Promise<AuditLog[]> {
  return getAdminJson<AuditLog[]>(`/admin/audit/logs?limit=${limit}`);
}
