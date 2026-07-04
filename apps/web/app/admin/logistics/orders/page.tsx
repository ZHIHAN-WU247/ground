import { PageHero } from "../../../../components/PageHero";
import { AdminLogisticsOrdersClient } from "./AdminLogisticsOrdersClient";

export default function AdminLogisticsOrdersPage() {
  return (
    <>
      <PageHero eyebrowKey="admin.logistics.orders.eyebrow" titleKey="admin.logistics.orders.title" descriptionKey="admin.logistics.orders.description" />
      <section className="shell section">
        <AdminLogisticsOrdersClient />
      </section>
    </>
  );
}
