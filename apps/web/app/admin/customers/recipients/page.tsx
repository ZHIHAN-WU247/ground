import { AdminCustomersClient } from "./AdminCustomersClient";

export default function AdminRecipientsPage() {
  return (
    <main className="admin-customers-page">
      <section className="shell section">
        <AdminCustomersClient />
      </section>
    </main>
  );
}
