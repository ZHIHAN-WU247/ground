import { AdminApiConfigClient } from "./AdminApiConfigClient";

export default function AdminApiConfigPage() {
  return (
    <main className="admin-api-config-page">
      <section className="shell">
        <AdminApiConfigClient />
      </section>
    </main>
  );
}
