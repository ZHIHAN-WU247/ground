import { AdminLogisticsOrdersClient } from "./AdminLogisticsOrdersClient";

export default function AdminLogisticsOrdersPage() {
  return (
    <main className="admin-logistics-orders-page">
      <section className="shell admin-logistics-orders-content">
        <AdminLogisticsOrdersClient />
      </section>
    </main>
  );
}
