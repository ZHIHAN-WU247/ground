import { PageHero } from "../../../../../components/PageHero";
import { AdminShopLogisticsForm } from "../../../shop/orders/[id]/logistics/AdminShopLogisticsForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminLogisticsShopOrderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero
        eyebrowKey="admin.logistics.orders.eyebrow"
        title="商城订单交接"
        descriptionKey="admin.logistics.orders.description"
      />
      <section className="shell section">
        <AdminShopLogisticsForm orderId={id} />
      </section>
    </>
  );
}
