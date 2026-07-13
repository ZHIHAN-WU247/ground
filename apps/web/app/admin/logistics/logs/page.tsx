import { AdminAuditLogsClient } from "./AdminAuditLogsClient";

export default function AdminLogsPage() {
  return (
    <main className="admin-audit-logs-page">
      <section className="shell section">
        <AdminAuditLogsClient />
      </section>
    </main>
  );
}
