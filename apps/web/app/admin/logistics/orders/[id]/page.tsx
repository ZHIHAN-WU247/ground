import { PageHero } from "../../../../../components/PageHero";
import { AdminLogisticsOrderDetailClient } from "./AdminLogisticsOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminLogisticsOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <PageHero eyebrowKey="admin.logistics.orders.eyebrow" title={<>{id}</>} descriptionKey="admin.logistics.detail.description" />
      <section className="shell section">
        <AdminLogisticsOrderDetailClient id={id} />
      </section>
    </>
  );
}
