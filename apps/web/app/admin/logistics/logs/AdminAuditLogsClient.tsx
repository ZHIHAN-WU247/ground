"use client";

import { useEffect, useState } from "react";
import type { AuditLog } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import { listAdminAuditLogs } from "../../../../lib/audit-logs-api";

export function AdminAuditLogsClient() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      setLogs(await listAdminAuditLogs());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div className="grid">
      <div className="form-section-heading">
        <p className="eyebrow">{t("admin.logistics.logs.eyebrow")}</p>
        <h1>{t("admin.logistics.logs.title")}</h1>
        <p className="muted">{t("admin.logistics.logs.description")}</p>
      </div>
      <div className="panel">
        <div className="detail-head">
          <div>
            <h3>Recent operations</h3>
            <p>Latest 100 audit records from Supabase.</p>
          </div>
          <button className="button" type="button" onClick={loadLogs} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {message ? <p className="status danger">{message}</p> : null}
        {logs.length === 0 && !isLoading ? (
          <div className="empty-state">No audit logs yet.</div>
        ) : (
          <div className="grid">
            {logs.map((log) => (
              <article className="card" key={log.id}>
                <div className="detail-head">
                  <div>
                    <h3>{log.action}</h3>
                    <p>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</p>
                  </div>
                  <span className="status">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="muted">{log.actorEmail ?? log.actorUserId ?? "Unknown actor"}</p>
                {log.afterData ? <pre className="code-block">{JSON.stringify(log.afterData, null, 2)}</pre> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
