import { PageHero } from "../../../../../components/PageHero";
import { AdminShopOrderDetailClient } from "./AdminShopOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminShopOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero eyebrowKey="admin.shop.orders.eyebrow" title="订单详情" descriptionKey="admin.shop.orders.description" />
      <section className="shell section">
        <AdminShopOrderDetailClient id={id} />
      </section>
    </>
  );
}
